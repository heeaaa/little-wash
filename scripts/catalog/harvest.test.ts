/**
 * The fetching half of each adapter: paging, key handling, failure.
 *
 * `fetch` is injected through HarvestContext precisely so this can be tested
 * without the network. The live APIs are checked separately, by
 * `npm run test:integration`.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { configuredProviders, getProvider, liveContext } from "./provider.ts";
import type { HarvestContext } from "./types.ts";

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(`catalog/fixtures/${name}.json`, "utf-8"));
}

/** A fetch that answers from a lookup table and records what it was asked. */
function stubFetch(routes: Array<[RegExp, unknown]>, calls: string[] = []) {
  const fn = (async (url: string | URL) => {
    const href = String(url);
    calls.push(href);
    for (const [pattern, body] of routes) {
      if (pattern.test(href)) {
        return new Response(JSON.stringify(body), { status: 200 });
      }
    }
    return new Response("not found", { status: 404, statusText: "Not Found" });
  }) as unknown as typeof globalThis.fetch;
  return { fn, calls };
}

function context(
  fetchFn: typeof globalThis.fetch,
  env: Record<string, string | undefined> = {},
): HarvestContext {
  return { fetch: fetchFn, env, now: () => new Date("2026-09-20T09:00:00Z") };
}

describe("Pexels harvest", () => {
  it("refuses to run without a key rather than failing at the API", () => {
    const { fn } = stubFetch([]);
    return expect(
      getProvider("pexels").harvest({ query: "pear" }, context(fn)),
    ).rejects.toThrow(/PEXELS_API_KEY/);
  });

  it("sends the key as the Authorization header", async () => {
    const calls: string[] = [];
    const fn = (async (_url: string | URL, init?: RequestInit) => {
      calls.push(String((init?.headers as Record<string, string>)?.Authorization));
      return new Response(JSON.stringify(fixture("pexels-search")), { status: 200 });
    }) as unknown as typeof globalThis.fetch;

    await getProvider("pexels").harvest(
      { query: "pear" },
      context(fn, { PEXELS_API_KEY: "secret-key" }),
    );
    expect(calls[0]).toBe("secret-key");
  });

  it("searches when given a query", async () => {
    const { fn, calls } = stubFetch([[/\/search/, fixture("pexels-search")]]);
    const out = await getProvider("pexels").harvest(
      { query: "single pear", orientation: "square" },
      context(fn, { PEXELS_API_KEY: "k" }),
    );
    expect(out).toHaveLength(3);
    expect(calls[0]).toContain("query=single%20pear");
    expect(calls[0]).toContain("orientation=square");
  });

  it("reads a collection when given one, not a search", async () => {
    const { fn, calls } = stubFetch([[/\/collections\//, fixture("pexels-collection")]]);
    await getProvider("pexels").harvest(
      { collectionId: "sroaotf" },
      context(fn, { PEXELS_API_KEY: "k" }),
    );
    expect(calls[0]).toContain("/collections/sroaotf");
    expect(calls[0]).not.toContain("/search");
  });

  it("walks the pages it was asked for", async () => {
    const { fn, calls } = stubFetch([[/\/search/, fixture("pexels-search")]]);
    const out = await getProvider("pexels").harvest(
      { query: "pear", pages: 3 },
      context(fn, { PEXELS_API_KEY: "k" }),
    );
    expect(calls).toHaveLength(3);
    expect(out).toHaveLength(9);
  });

  it("stops early when a page comes back empty", async () => {
    // Asking a free API for pages that do not exist is rude and slow.
    const { fn, calls } = stubFetch([[/\/search/, { photos: [] }]]);
    const out = await getProvider("pexels").harvest(
      { query: "pear", pages: 5 },
      context(fn, { PEXELS_API_KEY: "k" }),
    );
    expect(calls).toHaveLength(1);
    expect(out).toEqual([]);
  });

  it("reports an API error rather than returning nothing", async () => {
    const { fn } = stubFetch([]);
    await expect(
      getProvider("pexels").harvest({ query: "pear" }, context(fn, { PEXELS_API_KEY: "k" })),
    ).rejects.toThrow(/Pexels 404/);
  });

  it("stamps candidates with the injected date, not the wall clock", async () => {
    const { fn } = stubFetch([[/\/search/, fixture("pexels-search")]]);
    const out = await getProvider("pexels").harvest(
      { query: "pear" },
      context(fn, { PEXELS_API_KEY: "k" }),
    );
    expect(out[0]?.retrievedAt).toBe("2026-09-20");
  });
});

describe("Unsplash harvest", () => {
  it("refuses to run without a key", async () => {
    const { fn } = stubFetch([]);
    await expect(
      getProvider("unsplash").harvest({ query: "pear" }, context(fn)),
    ).rejects.toThrow(/UNSPLASH_ACCESS_KEY/);
  });

  it("sends the key as a Client-ID, which is Unsplash's scheme", async () => {
    const seen: string[] = [];
    const fn = (async (_url: string | URL, init?: RequestInit) => {
      seen.push(String((init?.headers as Record<string, string>)?.Authorization));
      return new Response(JSON.stringify(fixture("unsplash-search")), { status: 200 });
    }) as unknown as typeof globalThis.fetch;

    await getProvider("unsplash").harvest(
      { query: "pear" },
      context(fn, { UNSPLASH_ACCESS_KEY: "abc" }),
    );
    expect(seen[0]).toBe("Client-ID abc");
  });

  it("reports an API error", async () => {
    const { fn } = stubFetch([]);
    await expect(
      getProvider("unsplash").harvest(
        { query: "pear" },
        context(fn, { UNSPLASH_ACCESS_KEY: "k" }),
      ),
    ).rejects.toThrow(/Unsplash 404/);
  });

  it("stops early when a page comes back empty", async () => {
    const { fn, calls } = stubFetch([[/search\/photos/, { results: [] }]]);
    await getProvider("unsplash").harvest(
      { query: "pear", pages: 4 },
      context(fn, { UNSPLASH_ACCESS_KEY: "k" }),
    );
    expect(calls).toHaveLength(1);
  });
});

describe("Met harvest", () => {
  it("needs no key at all", async () => {
    const { fn } = stubFetch([
      [/\/search\?/, fixture("met-search")],
      [/\/objects\//, fixture("met-object-public-domain")],
    ]);
    const out = await getProvider("met").harvest({ query: "pear" }, context(fn));
    expect(out.length).toBeGreaterThan(0);
  });

  it("fetches each object, because search returns ids only", async () => {
    const { fn, calls } = stubFetch([
      [/\/search\?/, { total: 2, objectIDs: [1, 2] }],
      [/\/objects\//, fixture("met-object-public-domain")],
    ]);
    await getProvider("met").harvest({ query: "pear" }, context(fn));
    expect(calls.filter((c) => c.includes("/objects/"))).toHaveLength(2);
  });

  it("asks only for public-domain objects that have an image", async () => {
    const { fn, calls } = stubFetch([
      [/\/search\?/, { total: 0, objectIDs: [] }],
    ]);
    await getProvider("met").harvest({ query: "pear" }, context(fn));
    expect(calls[0]).toContain("hasImages=true");
    expect(calls[0]).toContain("isPublicDomain=true");
  });

  it("caps how many objects it fetches", async () => {
    // Each candidate is a separate request. This is curation, not a bulk
    // download; the Met publishes a CSV for anyone who wants everything.
    const { fn, calls } = stubFetch([
      [/\/search\?/, { total: 500, objectIDs: Array.from({ length: 500 }, (_, i) => i + 1) }],
      [/\/objects\//, fixture("met-object-public-domain")],
    ]);
    await getProvider("met").harvest({ query: "pear", perPage: 5 }, context(fn));
    expect(calls.filter((c) => c.includes("/objects/"))).toHaveLength(5);
  });

  it("skips an object that fails to fetch instead of abandoning the harvest", async () => {
    const { fn } = stubFetch([[/\/search\?/, { total: 2, objectIDs: [1, 2] }]]);
    await expect(getProvider("met").harvest({ query: "pear" }, context(fn))).resolves.toEqual(
      [],
    );
  });

  it("reports a failed search, which is not recoverable", async () => {
    const { fn } = stubFetch([]);
    await expect(
      getProvider("met").harvest({ query: "pear" }, context(fn)),
    ).rejects.toThrow(/Met 404/);
  });

  it("drops restricted objects the search still returned", async () => {
    const { fn } = stubFetch([
      [/\/search\?/, { total: 1, objectIDs: [484447] }],
      [/\/objects\//, fixture("met-object-restricted")],
    ]);
    expect(await getProvider("met").harvest({ query: "pear" }, context(fn))).toEqual([]);
  });
});

describe("the provider registry", () => {
  it("names every provider it has", () => {
    expect(getProvider("pexels").id).toBe("pexels");
    expect(getProvider("unsplash").id).toBe("unsplash");
    expect(getProvider("met").id).toBe("met");
  });

  it("says what is available when asked for one it does not have", () => {
    expect(() => getProvider("getty")).toThrow(/Unknown source "getty"/);
    expect(() => getProvider("getty")).toThrow(/pexels/);
  });

  it("reports which providers are configured, so a skip can say why", () => {
    expect(configuredProviders({}).map((p) => p.id)).toEqual(["met"]);
    expect(
      configuredProviders({ PEXELS_API_KEY: "k" }).map((p) => p.id).sort(),
    ).toEqual(["met", "pexels"]);
  });

  it("builds a live context from the real environment", () => {
    const ctx = liveContext();
    expect(ctx.fetch).toBe(globalThis.fetch);
    expect(ctx.now()).toBeInstanceOf(Date);
  });
});
