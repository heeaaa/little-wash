import { describe, it, expect, afterEach } from "vitest";
import { existsSync, mkdtempSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import {
  DERIVED_WIDTHS,
  applyDerived,
  deriveAndStore,
  deriveImage,
  derivedBase,
  isDerived,
  readManifest,
  type DerivedManifest,
} from "./derive.ts";
import type { ApprovedEntry, Candidate } from "./types.ts";

async function jpeg(width: number, height: number, background = "#8a5a3c"): Promise<Uint8Array> {
  return new Uint8Array(
    await sharp({ create: { width, height, channels: 3, background } }).jpeg().toBuffer(),
  );
}

function candidate(over: Partial<Candidate> = {}): Candidate {
  return {
    sourceId: "met",
    externalId: "436121",
    providerTitle: "A pear",
    providerAlt: null,
    objectUrl: "https://www.metmuseum.org/art/collection/search/436121",
    creator: null,
    creatorUrl: null,
    dateDisplay: null,
    medium: null,
    classification: null,
    intrinsicWidth: null,
    intrinsicHeight: null,
    dominantColour: null,
    imageUrl: "https://images.metmuseum.org/CRDImages/ep/original/DP1.jpg",
    licenceId: "cc0-1.0",
    retrievedAt: "2026-09-28",
    ...over,
  };
}

function entry(id: string, c: Candidate): ApprovedEntry {
  return {
    id,
    candidate: c,
    title: "A Pear",
    subject: "fruit",
    difficulty: "steady",
    minutes: 20,
    alt: "A single brown pear on a plain grey ground, painted in soft oils.",
    palette: [],
    kind: c.sourceId === "met" ? "artwork" : "photograph",
    approvedAt: "2026-09-28",
  };
}

describe("deriving a museum image", () => {
  it("makes each shipped width from a large original, as WebP", async () => {
    const { image, files } = await deriveImage(await jpeg(3000, 2000), "references/met/436121");

    expect(image.widths.map((w) => w.width)).toEqual([...DERIVED_WIDTHS]);
    expect(image.widths.map((w) => w.src)).toEqual(
      DERIVED_WIDTHS.map((w) => `references/met/436121-${w}.webp`),
    );
    expect(files.map((f) => f.path)).toEqual(image.widths.map((w) => w.src));
    for (const [i, file] of files.entries()) {
      const meta = await sharp(Buffer.from(file.bytes)).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.width).toBe(DERIVED_WIDTHS[i]);
    }
  });

  it("records the original's size and a colour for the placeholder", async () => {
    const { image } = await deriveImage(await jpeg(3000, 2000, "#8a5a3c"), "references/met/436121");
    expect(image.intrinsicWidth).toBe(3000);
    expect(image.intrinsicHeight).toBe(2000);
    expect(image.dominantColour).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("never enlarges: a small original ships at its own width only", async () => {
    const { image } = await deriveImage(await jpeg(600, 488), "references/met/1");
    expect(image.widths.map((w) => w.width)).toEqual([400, 600]);
  });

  it("still ships one width when the original is smaller than the smallest step", async () => {
    const { image } = await deriveImage(await jpeg(300, 200), "references/met/1");
    expect(image.widths.map((w) => w.width)).toEqual([300]);
  });

  it("names files from the source and the provider's id", () => {
    expect(derivedBase(candidate())).toBe("references/met/436121");
  });

  it("refuses bytes that are not an image", async () => {
    await expect(deriveImage(new Uint8Array([1, 2, 3]), "references/met/1")).rejects.toThrow();
  });
});

describe("handing derived images to the build", () => {
  const manifest: DerivedManifest = {
    "a-pear-6121": {
      sourceUrl: "https://images.metmuseum.org/CRDImages/ep/original/DP1.jpg",
      widths: [
        { width: 400, src: "references/met/436121-400.webp" },
        { width: 800, src: "references/met/436121-800.webp" },
      ],
      intrinsicWidth: 3000,
      intrinsicHeight: 2000,
      dominantColour: "#8a5a3c",
    },
  };

  it("gives a museum entry its widths, its size and its colour", () => {
    const { entries, localWidths, missing } = applyDerived([entry("a-pear-6121", candidate())], manifest);
    expect(missing).toEqual([]);
    expect(localWidths.get("a-pear-6121")).toEqual(manifest["a-pear-6121"]!.widths);
    expect(entries[0]!.candidate).toMatchObject({
      intrinsicWidth: 3000,
      intrinsicHeight: 2000,
      dominantColour: "#8a5a3c",
    });
  });

  it("names a museum entry that has not been derived, rather than failing later", () => {
    const { missing, localWidths } = applyDerived([entry("a-plum-0001", candidate({ externalId: "1" }))], manifest);
    expect(missing).toEqual(["a-plum-0001"]);
    expect(localWidths.size).toBe(0);
  });

  it("leaves hotlinked sources exactly as they were", () => {
    const pexels = entry("pear-1", candidate({ sourceId: "pexels", licenceId: "pexels", intrinsicWidth: 4000, intrinsicHeight: 3000 }));
    const { entries, missing, localWidths } = applyDerived([pexels], manifest);
    expect(entries[0]).toBe(pexels);
    expect(missing).toEqual([]);
    expect(localWidths.size).toBe(0);
  });

  it("does not overwrite a size or colour the provider already gave", () => {
    const known = entry("a-pear-6121", candidate({ intrinsicWidth: 1234, intrinsicHeight: 999, dominantColour: "#111111" }));
    const { entries } = applyDerived([known], manifest);
    expect(entries[0]!.candidate).toMatchObject({ intrinsicWidth: 1234, intrinsicHeight: 999, dominantColour: "#111111" });
  });
});

describe("deriving and storing an approved piece", () => {
  let root = "";
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const serving = (bytes: Uint8Array, status = 200) =>
    (async () => new Response(new Uint8Array(bytes).buffer, { status })) as typeof globalThis.fetch;

  it("writes the widths into public/ and records them in the manifest", async () => {
    root = mkdtempSync(join(tmpdir(), "lw-derive-"));
    const e = entry("a-pear-6121", candidate());
    const outcome = await deriveAndStore(e, { root, fetch: serving(await jpeg(2000, 1500)) });

    expect(outcome).toMatchObject({ derived: true, widths: [400, 800, 1600] });
    for (const w of DERIVED_WIDTHS) {
      expect(existsSync(join(root, "public", `references/met/436121-${w}.webp`))).toBe(true);
    }
    const manifest = readManifest(root);
    expect(manifest["a-pear-6121"]).toMatchObject({
      sourceUrl: e.candidate.imageUrl,
      intrinsicWidth: 2000,
      intrinsicHeight: 1500,
    });
    expect(isDerived("a-pear-6121", manifest, root)).toBe(true);
  });

  it("keeps earlier entries when it adds another", async () => {
    root = mkdtempSync(join(tmpdir(), "lw-derive-"));
    await deriveAndStore(entry("a", candidate({ externalId: "1" })), { root, fetch: serving(await jpeg(900, 600)) });
    await deriveAndStore(entry("b", candidate({ externalId: "2" })), { root, fetch: serving(await jpeg(900, 600)) });
    expect(Object.keys(readManifest(root))).toEqual(["a", "b"]);
  });

  it("notices a derived file that has gone missing", async () => {
    root = mkdtempSync(join(tmpdir(), "lw-derive-"));
    await deriveAndStore(entry("a", candidate({ externalId: "1" })), { root, fetch: serving(await jpeg(900, 600)) });
    unlinkSync(join(root, "public", "references/met/1-400.webp"));
    expect(isDerived("a", readManifest(root), root)).toBe(false);
  });

  it("reports a refused download and writes nothing", async () => {
    root = mkdtempSync(join(tmpdir(), "lw-derive-"));
    const outcome = await deriveAndStore(entry("a", candidate()), { root, fetch: serving(new Uint8Array(), 404) });
    expect(outcome).toEqual({ derived: false, reason: "met answered 404" });
    expect(readManifest(root)).toEqual({});
  });

  it("reports bytes that are not an image, rather than throwing", async () => {
    root = mkdtempSync(join(tmpdir(), "lw-derive-"));
    const outcome = await deriveAndStore(entry("a", candidate()), { root, fetch: serving(new Uint8Array([1, 2, 3])) });
    expect(outcome.derived).toBe(false);
    expect(readManifest(root)).toEqual({});
  });

  it("does nothing for a hotlinked source", async () => {
    root = mkdtempSync(join(tmpdir(), "lw-derive-"));
    const outcome = await deriveAndStore(entry("a", candidate({ sourceId: "unsplash", licenceId: "unsplash" })), { root });
    expect(outcome).toEqual({ derived: false, reason: "unsplash is hotlinked, not derived" });
  });
});
