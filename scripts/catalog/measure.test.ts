import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { measureCandidate } from "./measure.ts";
import type { Candidate } from "./types.ts";

function candidate(over: Partial<Candidate> = {}): Candidate {
  return {
    sourceId: "unsplash",
    externalId: "abc123",
    providerTitle: "A pear",
    providerAlt: null,
    objectUrl: "https://unsplash.com/photos/abc123",
    creator: null,
    creatorUrl: null,
    dateDisplay: null,
    medium: "Photograph",
    classification: null,
    intrinsicWidth: 6000,
    intrinsicHeight: 4000,
    dominantColour: null,
    imageUrl: "https://images.unsplash.com/photo-abc123?ixid=keep-me",
    licenceId: "unsplash",
    retrievedAt: "2026-09-28",
    ...over,
  };
}

/** A small real image, so the decode path runs for real. */
async function png(): Promise<ArrayBuffer> {
  const bytes = await sharp({
    create: { width: 48, height: 48, channels: 3, background: "#d4a24c" },
  })
    .png()
    .toBuffer();
  // A standalone ArrayBuffer, which every Response implementation accepts.
  return new Uint8Array(bytes).buffer;
}

function recordingFetch(respond: (url: string) => Promise<Response>) {
  const urls: string[] = [];
  const fetch = (async (url: string) => {
    urls.push(url);
    return respond(url);
  }) as typeof globalThis.fetch;
  return { urls, fetch };
}

describe("measuring a candidate", () => {
  let cacheDir = "";
  const fresh = () => (cacheDir = mkdtempSync(join(tmpdir(), "lw-measure-")));
  afterEach(() => rmSync(cacheDir, { recursive: true, force: true }));

  it("downloads a small copy for a hotlinked source, not the original", async () => {
    fresh();
    const bytes = await png();
    const { urls, fetch } = recordingFetch(async () => new Response(bytes, { status: 200 }));

    const m = await measureCandidate(candidate(), { fetch, cacheDir });

    expect(m).not.toBeNull();
    expect(urls).toHaveLength(1);
    const asked = new URL(urls[0]!);
    expect(asked.searchParams.get("w")).toBe("640");
    // Unsplash's photographer attribution must survive the resize.
    expect(asked.searchParams.get("ixid")).toBe("keep-me");
  });

  it("falls back to the original when the small copy fails", async () => {
    fresh();
    const bytes = await png();
    const { urls, fetch } = recordingFetch(async (url) =>
      new URL(url).searchParams.has("w")
        ? new Response("upstream connect error", { status: 503 })
        : new Response(bytes, { status: 200 }),
    );

    const m = await measureCandidate(candidate(), { fetch, cacheDir });

    expect(m).not.toBeNull();
    expect(urls).toEqual([expect.stringContaining("w=640"), candidate().imageUrl]);
  });

  it("returns nothing rather than throwing when both fail", async () => {
    fresh();
    const { fetch } = recordingFetch(async () => new Response("", { status: 500 }));
    await expect(measureCandidate(candidate(), { fetch, cacheDir })).resolves.toBeNull();
  });

  it("downloads a museum's own file as it is, since it has no resize service", async () => {
    fresh();
    const bytes = await png();
    const { urls, fetch } = recordingFetch(async () => new Response(bytes, { status: 200 }));
    const met = candidate({
      sourceId: "met",
      licenceId: "cc0-1.0",
      imageUrl: "https://images.metmuseum.org/CRDImages/ep/original/DT1.jpg",
    });

    await measureCandidate(met, { fetch, cacheDir });

    expect(urls).toEqual([met.imageUrl]);
  });

  it("measures a museum candidate from its preview, not its multi-megabyte original", async () => {
    fresh();
    const bytes = await png();
    const { urls, fetch } = recordingFetch(async () => new Response(bytes, { status: 200 }));
    const met = candidate({
      sourceId: "met",
      licenceId: "cc0-1.0",
      imageUrl: "https://images.metmuseum.org/CRDImages/ad/original/DT2784.jpg",
      previewUrl: "https://images.metmuseum.org/CRDImages/ad/web-large/DT2784.jpg",
    });

    await measureCandidate(met, { fetch, cacheDir });

    expect(urls).toEqual([met.previewUrl]);
  });

  it("uses its cache the second time, fetching nothing", async () => {
    fresh();
    const bytes = await png();
    const first = recordingFetch(async () => new Response(bytes, { status: 200 }));
    const measured = await measureCandidate(candidate(), { fetch: first.fetch, cacheDir });

    const second = recordingFetch(async () => new Response("", { status: 500 }));
    await expect(
      measureCandidate(candidate(), { fetch: second.fetch, cacheDir }),
    ).resolves.toEqual(measured);
    expect(second.urls).toEqual([]);
  });
});
