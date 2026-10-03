/**
 * Adapter tests, run against payloads captured from the live APIs on
 * 20/09/2026 and committed to catalog/fixtures/.
 *
 * Real payloads rather than hand-written mocks, so a provider changing its
 * response shape fails a test instead of a build. These never touch the
 * network, so CI needs no keys.
 *
 * The live APIs are checked separately, by `npm run test:providers`.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { normalisePexels } from "./pexels.ts";
import { normaliseUnsplash, trackUnsplashDownload, unsplash } from "./unsplash.ts";
import { met, normaliseMetObject, normaliseMetSearch } from "./met.ts";

const CAPTURED = "2026-09-20";

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(`catalog/fixtures/${name}.json`, "utf-8"));
}

describe("Pexels", () => {
  const candidates = normalisePexels(fixture("pexels-search"), CAPTURED);

  it("normalises every photo in a search page", () => {
    expect(candidates).toHaveLength(3);
  });

  it("keeps the photographer and a link to their profile", () => {
    for (const candidate of candidates) {
      expect(candidate.creator).toBeTruthy();
      expect(candidate.creatorUrl).toMatch(/^https:\/\/www\.pexels\.com\//);
    }
  });

  it("links back to the photo's own page, not the image file", () => {
    expect(candidates[0]?.objectUrl).toMatch(/^https:\/\/www\.pexels\.com\/photo\//);
  });

  it("takes the unparameterised original as the image base", () => {
    // Widths are added at render time by buildImageSources, so a base URL
    // carrying a width here would be resized twice.
    expect(candidates[0]?.imageUrl).toMatch(/^https:\/\/images\.pexels\.com\//);
    expect(candidates[0]?.imageUrl).not.toContain("?");
  });

  it("records the real pixel dimensions", () => {
    expect(candidates[0]?.intrinsicWidth).toBeGreaterThan(0);
    expect(candidates[0]?.intrinsicHeight).toBeGreaterThan(0);
  });

  it("carries the licence and the capture date", () => {
    expect(candidates[0]?.licenceId).toBe("pexels");
    expect(candidates[0]?.retrievedAt).toBe(CAPTURED);
  });

  it("keeps the provider's caption as a seed, never as our alt text", () => {
    // Pexels' `alt` is a caption written for search, not a description for
    // someone deciding whether to paint the subject. The build gate is what
    // makes a curator replace it.
    expect(candidates[0]?.providerAlt).toBeTruthy();
    expect(candidates[0]).not.toHaveProperty("alt");
  });

  it("reads a collection, which returns `media` rather than `photos`", () => {
    const themed = normalisePexels(fixture("pexels-collection"), CAPTURED);
    expect(themed.length).toBeGreaterThan(0);
    expect(themed[0]?.sourceId).toBe("pexels");
  });

  it("drops videos from a collection that mixes media", () => {
    // Pexels capitalises the discriminator, so this is the exact casing that
    // a lowercase comparison would miss.
    const first = (fixture("pexels-collection") as { media: object[] }).media[0]!;
    expect(normalisePexels({ media: [{ ...first, type: "Video" }] }, CAPTURED)).toHaveLength(0);
    expect(normalisePexels({ media: [{ ...first, type: "Photo" }] }, CAPTURED)).toHaveLength(1);
  });

  it("rejects a payload that is not a Pexels page", () => {
    expect(() => normalisePexels({ nonsense: true }, CAPTURED)).toThrow();
  });
});

describe("Unsplash", () => {
  const candidates = normaliseUnsplash(fixture("unsplash-search"), CAPTURED);

  it("normalises every result", () => {
    expect(candidates).toHaveLength(3);
  });

  it("preserves the ixid on the image URL", () => {
    // Unsplash uses ixid to attribute traffic to the photographer. Losing it
    // would break the tracking their guidelines are built around.
    expect(candidates[0]?.imageUrl).toContain("ixid=");
  });

  it("adds the UTM parameters their guidelines require to outbound links", () => {
    expect(candidates[0]?.objectUrl).toContain("utm_source=little_wash");
    expect(candidates[0]?.objectUrl).toContain("utm_medium=referral");
    expect(candidates[0]?.creatorUrl).toContain("utm_source=little_wash");
  });

  it("shows only the year, since the date is an upload not a capture", () => {
    expect(candidates[0]?.dateDisplay).toMatch(/^\d{4}$/);
  });

  it("carries the licence", () => {
    expect(candidates[0]?.licenceId).toBe("unsplash");
  });

  it("accepts a bare array as well as a search envelope", () => {
    const bare = (fixture("unsplash-search") as { results: unknown[] }).results;
    expect(normaliseUnsplash(bare, CAPTURED)).toHaveLength(3);
  });

  it("keeps the download link Unsplash asks to be called when a photo is used", () => {
    expect(candidates[0]?.downloadLocation).toBe(
      "https://api.unsplash.com/photos/4Rr9qIKapbE/download?ixid=M3wxMDc1MzU0fDB8MXxzZWFyY2h8MXx8c2luZ2xlJTIwcGVhcnxlbnwwfDJ8fHwxNzg5ODY5ODk1fDA",
    );
  });
});

describe("searching Unsplash", () => {
  async function askedFor(orientation?: string): Promise<URL> {
    const urls: string[] = [];
    const fetch = (async (url: string) => {
      urls.push(url);
      return new Response(JSON.stringify({ results: [] }), { status: 200 });
    }) as typeof globalThis.fetch;
    await unsplash.harvest(
      { query: "single pear", orientation },
      { fetch, env: { UNSPLASH_ACCESS_KEY: "k" }, now: () => new Date(CAPTURED) },
    );
    return new URL(urls[0]!);
  }

  it("asks for 'squarish', its own word, when the plan says square", async () => {
    // Found on the first live harvest: "square" is Pexels' value, and
    // Unsplash answered 400 Bad Request to it.
    expect((await askedFor("square")).searchParams.get("orientation")).toBe("squarish");
  });

  it("passes landscape and portrait through unchanged", async () => {
    expect((await askedFor("landscape")).searchParams.get("orientation")).toBe("landscape");
    expect((await askedFor("portrait")).searchParams.get("orientation")).toBe("portrait");
  });

  it("leaves orientation out when none is asked for", async () => {
    expect((await askedFor()).searchParams.has("orientation")).toBe(false);
  });
});

describe("telling Unsplash a photo was used", () => {
  const [candidate] = normaliseUnsplash(fixture("unsplash-search"), CAPTURED);
  const env = { UNSPLASH_ACCESS_KEY: "test-key" };

  function recording(status = 200) {
    const calls: Array<{ url: string; auth: string | null }> = [];
    const fetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, auth: new Headers(init?.headers).get("Authorization") });
      return new Response("{}", { status });
    }) as typeof globalThis.fetch;
    return { calls, ctx: { fetch, env, now: () => new Date(CAPTURED) } };
  }

  it("calls the photo's own download link, authenticated, once", async () => {
    const { calls, ctx } = recording();
    await expect(trackUnsplashDownload(candidate!, ctx)).resolves.toEqual({ tracked: true });
    expect(calls).toEqual([
      { url: candidate!.downloadLocation!, auth: "Client-ID test-key" },
    ]);
  });

  it("says so when Unsplash refuses, rather than pretending it counted", async () => {
    const { ctx } = recording(401);
    await expect(trackUnsplashDownload(candidate!, ctx)).resolves.toEqual({
      tracked: false,
      reason: "Unsplash answered 401",
    });
  });

  it("says so when the network fails", async () => {
    const ctx = {
      fetch: (async () => {
        throw new Error("offline");
      }) as typeof globalThis.fetch,
      env,
      now: () => new Date(CAPTURED),
    };
    await expect(trackUnsplashDownload(candidate!, ctx)).resolves.toEqual({
      tracked: false,
      reason: "Error: offline",
    });
  });

  it("does nothing for a candidate with no download link, and says why", async () => {
    const { calls, ctx } = recording();
    const { downloadLocation: _dropped, ...bare } = candidate!;
    await expect(trackUnsplashDownload(bare, ctx)).resolves.toEqual({
      tracked: false,
      reason: "no download link was recorded at harvest",
    });
    expect(calls).toEqual([]);
  });

  it("does nothing without a key, and says why", async () => {
    const { calls, ctx } = recording();
    await expect(trackUnsplashDownload(candidate!, { ...ctx, env: {} })).resolves.toEqual({
      tracked: false,
      reason: "UNSPLASH_ACCESS_KEY is not set",
    });
    expect(calls).toEqual([]);
  });

  it("only ever reports Unsplash photos", async () => {
    const { calls, ctx } = recording();
    await expect(
      trackUnsplashDownload({ ...candidate!, sourceId: "pexels" }, ctx),
    ).resolves.toEqual({ tracked: false, reason: "not an Unsplash photo" });
    expect(calls).toEqual([]);
  });
});

describe("harvesting from the Met politely", () => {
  // Found on the first live harvest, 28/09/2026: about 130 object requests
  // back to back, and the Met's firewall (Imperva) answered 403 to every
  // request from then on. Refusals were being skipped silently, so the
  // harvest carried on asking.
  const search = { total: 3, objectIDs: [1, 2, 3] };
  const object = fixture("met-object-public-domain") as object;

  function recording(objectStatus: (id: string) => number) {
    const urls: string[] = [];
    const pauses: number[] = [];
    const fetch = (async (url: string) => {
      urls.push(url);
      if (url.includes("/search?")) return new Response(JSON.stringify(search), { status: 200 });
      const id = url.split("/").pop()!;
      const status = objectStatus(id);
      return new Response(
        status === 200 ? JSON.stringify({ ...object, objectID: Number(id) }) : "",
        { status },
      );
    }) as typeof globalThis.fetch;
    const ctx = {
      fetch,
      env: {},
      now: () => new Date(CAPTURED),
      sleep: async (ms: number) => {
        pauses.push(ms);
      },
    };
    return { urls, pauses, ctx };
  }

  it("pauses between object requests", async () => {
    const { pauses, ctx } = recording(() => 200);
    const out = await met.harvest({ query: "teapot" }, ctx);
    expect(out).toHaveLength(3);
    expect(pauses).toHaveLength(3);
    expect(pauses.every((ms) => ms >= 250)).toBe(true);
  });

  it("stops at the first refusal instead of asking again", async () => {
    const { urls, ctx } = recording((id) => (id === "2" ? 403 : 200));
    await expect(met.harvest({ query: "teapot" }, ctx)).rejects.toThrow(/refusing requests \(403\)/);
    expect(urls.filter((u) => u.includes("/objects/"))).toHaveLength(2);
  });

  it("narrows a search to one department when asked", async () => {
    // A plain "cat" search returns portraits with cats in; Egyptian Art
    // (department 10) returns the bronze cats.
    const { urls, ctx } = recording(() => 200);
    await met.harvest({ query: "cat", department: 10 }, ctx);
    expect(new URL(urls[0]!).searchParams.get("departmentId")).toBe("10");
  });

  it("puts the search words last, where the Met requires them", async () => {
    // Found 28/09/2026. With q first, the Met ignores the words: "hippopotamus"
    // returned a stela, a marble bust and an altarpiece. With q last, Egyptian
    // Art returned 77 hippopotamuses. The whole first Met harvest was affected.
    const { urls, ctx } = recording(() => 200);
    await met.harvest({ query: "cat", department: 10 }, ctx);
    const params = [...new URL(urls[0]!).searchParams.keys()];
    expect(params.at(-1)).toBe("q");
    expect(new URL(urls[0]!).searchParams.get("q")).toBe("cat");
  });

  it("searches every department when none is given", async () => {
    const { urls, ctx } = recording(() => 200);
    await met.harvest({ query: "cat" }, ctx);
    expect(new URL(urls[0]!).searchParams.has("departmentId")).toBe(false);
  });

  it("still skips an object that is simply missing", async () => {
    const { ctx } = recording((id) => (id === "2" ? 404 : 200));
    expect(await met.harvest({ query: "teapot" }, ctx)).toHaveLength(2);
  });
});

describe("the Met", () => {
  const candidate = normaliseMetObject(
    fixture("met-object-public-domain"),
    CAPTURED,
  );

  it("normalises a public-domain object", () => {
    expect(candidate).not.toBeNull();
    expect(candidate?.sourceId).toBe("met");
    expect(candidate?.licenceId).toBe("cc0-1.0");
  });

  it("refuses an object that is not in the public domain", () => {
    // The whole point of the source. A restricted object must never reach the
    // curator, let alone the catalogue.
    expect(normaliseMetObject(fixture("met-object-restricted"), CAPTURED)).toBeNull();
  });

  it("keeps the full-size original as the image, and web-large only as a preview", () => {
    // Reversed on 28/09/2026. Measured live, web-large is 600px on its long
    // edge, below the 1200px the enlarged view needs; the original was
    // 4000px. The original is what gets resized and shipped; the preview is
    // what harvest measures, so it never downloads megabytes per candidate.
    expect(candidate?.imageUrl).toBe("https://images.metmuseum.org/CRDImages/ad/original/DT2784.jpg");
    expect(candidate?.previewUrl).toBe("https://images.metmuseum.org/CRDImages/ad/web-large/DT2784.jpg");
  });

  it("falls back to web-large as the image when there is no original, with no preview", () => {
    const smallOnly = normaliseMetObject(
      { ...(fixture("met-object-public-domain") as object), primaryImage: "" },
      CAPTURED,
    );
    expect(smallOnly?.imageUrl).toContain("/web-large/");
    expect(smallOnly).not.toHaveProperty("previewUrl");
  });

  it("keeps the artist, the date and the medium", () => {
    expect(candidate?.creator).toBe("Charles Cromwell Ingham");
    expect(candidate?.dateDisplay).toBe("1846");
    expect(candidate?.medium).toBe("Oil on canvas");
  });

  it("reports no alt text, because the Met supplies none", () => {
    // Recorded rather than papered over: this is why the build gate refuses an
    // entry whose alt a human has not written.
    expect(candidate?.providerAlt).toBeNull();
  });

  it("reports no dimensions, which the downloaded file supplies instead", () => {
    expect(candidate?.intrinsicWidth).toBeNull();
    expect(candidate?.intrinsicHeight).toBeNull();
  });

  it("falls back to classification when an object has no explicit one", () => {
    expect(candidate?.classification).toBe("Painting");
  });

  it("drops a public-domain object that has no image at all", () => {
    const noImage = {
      ...(fixture("met-object-public-domain") as object),
      primaryImage: "",
      primaryImageSmall: "",
    };
    expect(normaliseMetObject(noImage, CAPTURED)).toBeNull();
  });

  it("reads object ids out of a search page", () => {
    const ids = normaliseMetSearch(fixture("met-search"));
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => Number.isInteger(id))).toBe(true);
  });

  it("returns an empty list when a search matches nothing", () => {
    // The Met returns objectIDs: null rather than [] for no results.
    expect(normaliseMetSearch({ total: 0, objectIDs: null })).toEqual([]);
  });
});
