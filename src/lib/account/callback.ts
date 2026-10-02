/**
 * The return from Google, as it arrives in the address bar.
 *
 * Supabase sends the browser back to the page sign-in started from with either
 * `?code=...` (PKCE: the client swaps it for a session) or
 * `?error=...&error_code=...&error_description=...`. It also copies an error
 * into the fragment, which in this app is the route (HashRouter), so the
 * fragment is read for errors only when it is plainly an error and not a path.
 *
 * Reading this is what decides whether the account client is loaded at all on
 * start-up: a guest who has never signed in never downloads it.
 */

export type SignInFailureReason =
  /** The person said no at Google, or closed its screen. */
  | "cancelled"
  /** Too slow, or finished in a different browser or app than it started in. */
  | "not-finished"
  /** Google or Supabase is not answering, or sign-in is switched off there. */
  | "unavailable"
  | "other";

export type SignInReturn = { kind: "code" } | { kind: "error"; reason: SignInFailureReason } | null;

/** Error codes Supabase Auth sends back for an attempt that went stale. */
const NOT_FINISHED = new Set([
  "flow_state_expired",
  "flow_state_not_found",
  "bad_oauth_state",
  "bad_oauth_callback",
  "bad_code_verifier",
]);

const UNAVAILABLE = new Set([
  "provider_disabled",
  "oauth_provider_not_supported",
  "unexpected_failure",
  "request_timeout",
  "over_request_rate_limit",
]);

export function failureReason(error: string | null, code: string | null): SignInFailureReason {
  if (error === "access_denied") return "cancelled";
  if (code && NOT_FINISHED.has(code)) return "not-finished";
  if ((code && UNAVAILABLE.has(code)) || error === "server_error" || error === "temporarily_unavailable") {
    return "unavailable";
  }
  return "other";
}

const CALLBACK_PARAMS = ["code", "error", "error_code", "error_description", "sb_flow_id"];

/** A fragment that is an error report rather than a route like `#/studio`. */
function fragmentError(hash: string): URLSearchParams | null {
  if (!hash.startsWith("#") || hash.startsWith("#/")) return null;
  const params = new URLSearchParams(hash.slice(1));
  return params.has("error") || params.has("error_code") ? params : null;
}

export function readSignInReturn(href: string): SignInReturn {
  const url = new URL(href);
  const query = url.searchParams;
  const errors = query.has("error") || query.has("error_code") ? query : fragmentError(url.hash);
  if (errors) return { kind: "error", reason: failureReason(errors.get("error"), errors.get("error_code")) };
  if (query.get("code")) return { kind: "code" };
  return null;
}

/**
 * The address with the sign-in parameters taken out, or null if there were
 * none. A code left in the address would be offered to the client again on
 * every reload; an error left there would be shown again.
 */
export function withoutSignInReturn(href: string): string | null {
  const url = new URL(href);
  let changed = false;
  for (const param of CALLBACK_PARAMS) {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      changed = true;
    }
  }
  if (fragmentError(url.hash)) {
    url.hash = "";
    changed = true;
  }
  return changed ? url.toString() : null;
}

/*
  Google refuses to sign anyone in from inside another app's built-in browser
  ("403: disallowed_useragent"), and the person is left on a Google error page
  with no way back. These are the common ones; the match is on the app's own
  token in the user agent, so an ordinary Safari or Chrome never matches.
*/
const IN_APP_BROWSERS: Array<[RegExp, string]> = [
  [/\bInstagram\b/, "Instagram"],
  [/FBAN\/Messenger|FB_IAB\/MESSENGER|\bMessengerForiOS\b/i, "Messenger"],
  [/\bFBAN\/|\bFBAV\/|\bFB_IAB\//, "Facebook"],
  [/\bLinkedInApp\b/, "LinkedIn"],
  [/\bMicroMessenger\//, "WeChat"],
  [/\bLine\/\d/, "LINE"],
  [/\bBytedanceWebview\b|\bmusical_ly_|\bTikTok\b/, "TikTok"],
  [/\bSnapchat\b/, "Snapchat"],
];

/** The name of the app whose browser this is, or null for a real browser. */
export function inAppBrowser(userAgent: string): string | null {
  for (const [pattern, name] of IN_APP_BROWSERS) {
    if (pattern.test(userAgent)) return name;
  }
  return null;
}
