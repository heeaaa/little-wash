import { describe, it, expect, vi, afterEach } from "vitest";
import sharp from "sharp";
import { downscale } from "./imageResize.ts";

/** A generated JPEG, so the test decodes real bytes rather than a stub. */
async function jpegOf(width: number, height: number): Promise<Uint8Array> {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 120, b: 60 } },
  })
    .jpeg()
    .toBuffer();
  return new Uint8Array(buffer);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("downscaling a fallback original", () => {
  it("brings an oversized original down to the requested width", async () => {
    const out = await downscale(await jpegOf(4000, 3000), 1400);

    expect(out).not.toBeNull();
    const meta = await sharp(Buffer.from(out!)).metadata();
    expect(meta.width).toBe(1400);
    // The aspect ratio is the reference's, and must survive the resize.
    expect(meta.height).toBe(1050);
  });

  it("leaves an image that is already small enough alone", async () => {
    // Enlarging would invent detail the painter would then be judging.
    const out = await downscale(await jpegOf(600, 400), 1400);

    const meta = await sharp(Buffer.from(out!)).metadata();
    expect(meta.width).toBe(600);
  });

  it("returns null rather than throwing when the bytes will not decode", async () => {
    /*
      The caller already holds a working image at this point, so a decode
      failure has to cost quality and not the plate.
    */
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await downscale(new Uint8Array([1, 2, 3, 4]), 1400)).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });
});
