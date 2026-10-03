import { describe, expect, it } from "vitest";
import { failureReason, inAppBrowser, readSignInReturn, withoutSignInReturn } from "./callback";

const SITE = "https://little-wash.example/";

describe("reading the return from Google", () => {
  it("finds a PKCE code in the query string", () => {
    expect(readSignInReturn(`${SITE}?code=abc123`)).toEqual({ kind: "code" });
  });

  it("is nothing on an ordinary page, whatever the route", () => {
    expect(readSignInReturn(SITE)).toBeNull();
    expect(readSignInReturn(`${SITE}#/browse?time=short&shown=48`)).toBeNull();
    expect(readSignInReturn(`${SITE}?code=`)).toBeNull();
  });

  it("does not mistake a route for an error report", () => {
    // HashRouter's fragment is a path; only a fragment that is a query is read.
    expect(readSignInReturn(`${SITE}#/studio?error=nonsense`)).toBeNull();
  });

  it("turns the errors Supabase sends back into plain reasons", () => {
    expect(readSignInReturn(`${SITE}?error=access_denied&error_description=The+user+denied`)).toEqual({
      kind: "error",
      reason: "cancelled",
    });
    expect(readSignInReturn(`${SITE}?error=invalid_request&error_code=flow_state_expired`)).toEqual({
      kind: "error",
      reason: "not-finished",
    });
    expect(readSignInReturn(`${SITE}?error=server_error&error_code=unexpected_failure`)).toEqual({
      kind: "error",
      reason: "unavailable",
    });
  });

  it("reads an error from the fragment too, where Supabase also puts it", () => {
    expect(readSignInReturn(`${SITE}#error=access_denied&error_code=x`)).toEqual({ kind: "error", reason: "cancelled" });
  });

  it("prefers an error to a code", () => {
    expect(readSignInReturn(`${SITE}?code=abc&error=access_denied`)).toEqual({ kind: "error", reason: "cancelled" });
  });
});

describe("plain reasons", () => {
  it("covers each kind, and anything unknown", () => {
    expect(failureReason("access_denied", null)).toBe("cancelled");
    for (const code of ["flow_state_not_found", "bad_oauth_state", "bad_oauth_callback", "bad_code_verifier"]) {
      expect(failureReason("invalid_request", code)).toBe("not-finished");
    }
    for (const code of ["provider_disabled", "oauth_provider_not_supported", "request_timeout", "over_request_rate_limit"]) {
      expect(failureReason("invalid_request", code)).toBe("unavailable");
    }
    expect(failureReason("temporarily_unavailable", null)).toBe("unavailable");
    expect(failureReason("something_new", "never_seen")).toBe("other");
    expect(failureReason(null, null)).toBe("other");
  });
});

describe("cleaning the address afterwards", () => {
  it("takes out the sign-in parameters and keeps everything else", () => {
    expect(withoutSignInReturn(`${SITE}?code=abc&sb_flow_id=f&utm_source=x#/studio`)).toBe(`${SITE}?utm_source=x#/studio`);
    expect(withoutSignInReturn(`${SITE}?code=abc`)).toBe(SITE);
  });

  it("takes out an error, from the query and from the fragment", () => {
    expect(withoutSignInReturn(`${SITE}?error=access_denied&error_code=c&error_description=d#error=access_denied`)).toBe(SITE);
  });

  it("leaves a route alone, and says when there was nothing to clean", () => {
    expect(withoutSignInReturn(`${SITE}#/browse?time=short`)).toBeNull();
    expect(withoutSignInReturn(SITE)).toBeNull();
  });
});

describe("in-app browsers Google refuses", () => {
  // Real user-agent strings, as each app sends them.
  const blocked: Array<[string, string]> = [
    ["Instagram", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 380.0.0.24.84 (iPhone15,3; iOS 18_5; en_NZ; en; scale=3.00; 1290x2796; 731163614)"],
    ["Facebook", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22F76 [FBAN/FBIOS;FBAV/512.0.0.45.103;FBBV/735216784;FBDV/iPhone15,3;FBMD/iPhone;FBSN/iOS;FBSV/18.5;FBSS/3;FBCR/;FBID/phone;FBLC/en_GB;FBOP/80]"],
    ["Messenger", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22F76 [FBAN/MessengerForiOS;FBAV/512.0.0.40.109;FBBV/735187421;FBDV/iPhone15,3]"],
    ["Facebook", "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/138.0.7204.63 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/520.0.0.53.109;]"],
    ["LinkedIn", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.31.6021"],
    ["TikTok", "Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.135 Mobile Safari/537.36 trill_370504 BytedanceWebview/d8a21c6"],
    ["WeChat", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.57(0x18003928) NetType/WIFI Language/en"],
    ["LINE", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/15.8.0"],
    ["Snapchat", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/13.47.0.36 (like Safari/8621.1.15.10.7, panda)"],
  ];

  it.each(blocked)("recognises %s", (name, userAgent) => {
    expect(inAppBrowser(userAgent)).toBe(name);
  });

  it("leaves real browsers alone", () => {
    for (const userAgent of [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0",
      // Google's own app is allowed by Google.
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/380.0.762045112 Mobile/15E148 Safari/604.1",
    ]) {
      expect(inAppBrowser(userAgent)).toBeNull();
    }
  });
});
