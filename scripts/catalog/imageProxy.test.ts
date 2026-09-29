import { describe, it, expect, vi } from "vitest";
import {
  ImageUnavailableError,
  fetchDisplayImage,
  type ImageProxyDeps,
} from "./imageProxy.ts";

const DISPLAY = "https://images.pexels.com/photos/1/p.jpeg?auto=compress&cs=tinysrgb&w=1400";
const ORIGINAL = "https://images.pexels.com/photos/1/p.jpeg";

/** Backed by a plain ArrayBuffer, which is what BlobPart will take. */
type Bytes = Uint8Array<ArrayBuffer>;

function jpeg(size = 64): Bytes {
  return new Uint8Array(size).fill(0xff);
}

/** A fetch that answers per URL, so a test says only what it means to say. */
function fetchFor(
  answers: Record<string, { status: number; body?: Bytes; contentType?: string } | "throw">,
): typeof globalThis.fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const answer = answers[url];
    if (!answer) throw new Error(`unexpected request to ${url}`);
    if (answer === "throw") throw new Error("ECONNRESET");
    const body = answer.body ?? jpeg();
    // The backing buffer, copied: Response wants a BodyInit, and a Uint8Array
    // view is not one under this lib.dom.
    return new Response(answer.status === 200 ? body.buffer.slice(0) : null, {
      status: answer.status,
      headers: { "content-type": answer.contentType ?? "image/jpeg" },
    });
  }) as unknown as typeof globalThis.fetch;
}

const noResizer: ImageProxyDeps["resize"] = undefined;

describe("fetching a candidate's image for review", () => {
  it("serves the provider's resized image when it works", async () => {
    const image = await fetchDisplayImage(
      { displayUrl: DISPLAY, originalUrl: ORIGINAL, width: 1400 },
      { fetch: fetchFor({ [DISPLAY]: { status: 200 } }), resize: noResizer },
    );

    expect(image.servedFrom).toBe("provider-resize");
    expect(image.resizedLocally).toBe(false);
    expect(image.bytes.length).toBeGreaterThan(0);
  });

  /*
    The defect this module exists for. Pexels' resize service returns 500 for
    a large share of the shortlist while the original returns 200, and the
    plate used to point straight at the resize URL - so the curator got a
    broken image and no palette reading. Remove the fallback and this fails.
  */
  it("falls back to the untouched original when the provider's resize 500s", async () => {
    const image = await fetchDisplayImage(
      { displayUrl: DISPLAY, originalUrl: ORIGINAL, width: 1400 },
      {
        fetch: fetchFor({ [DISPLAY]: { status: 500 }, [ORIGINAL]: { status: 200 } }),
        resize: noResizer,
      },
    );

    expect(image.servedFrom).toBe("original");
    expect(image.bytes.length).toBeGreaterThan(0);
  });

  it("falls back when the resize URL times out rather than answering", async () => {
    const image = await fetchDisplayImage(
      { displayUrl: DISPLAY, originalUrl: ORIGINAL, width: 1400 },
      { fetch: fetchFor({ [DISPLAY]: "throw", [ORIGINAL]: { status: 200 } }), resize: noResizer },
    );

    expect(image.servedFrom).toBe("original");
  });

  it("treats an error page served as a 200 as a failure", async () => {
    const image = await fetchDisplayImage(
      { displayUrl: DISPLAY, originalUrl: ORIGINAL, width: 1400 },
      {
        fetch: fetchFor({
          [DISPLAY]: { status: 200, contentType: "text/html" },
          [ORIGINAL]: { status: 200 },
        }),
        resize: noResizer,
      },
    );

    expect(image.servedFrom).toBe("original");
  });

  it("treats an empty body as a failure", async () => {
    const image = await fetchDisplayImage(
      { displayUrl: DISPLAY, originalUrl: ORIGINAL, width: 1400 },
      {
        fetch: fetchFor({
          [DISPLAY]: { status: 200, body: new Uint8Array(0) as Bytes },
          [ORIGINAL]: { status: 200 },
        }),
        resize: noResizer,
      },
    );

    expect(image.servedFrom).toBe("original");
  });

  it("downscales a fallback original so the browser is not handed 108 megapixels", async () => {
    const small = jpeg(8);
    const image = await fetchDisplayImage(
      { displayUrl: DISPLAY, originalUrl: ORIGINAL, width: 1400 },
      {
        fetch: fetchFor({ [DISPLAY]: { status: 500 }, [ORIGINAL]: { status: 200, body: jpeg(4096) } }),
        resize: async (_bytes, width) => (width === 1400 ? small : null),
      },
    );

    expect(image.resizedLocally).toBe(true);
    expect(image.bytes).toEqual(small);
  });

  it("serves the original unresized rather than losing it when the resizer fails", async () => {
    const original = jpeg(4096);
    const image = await fetchDisplayImage(
      { displayUrl: DISPLAY, originalUrl: ORIGINAL, width: 1400 },
      {
        fetch: fetchFor({ [DISPLAY]: { status: 500 }, [ORIGINAL]: { status: 200, body: original } }),
        resize: async () => {
          throw new Error("sharp: unsupported image format");
        },
      },
    );

    expect(image.resizedLocally).toBe(false);
    expect(image.bytes).toEqual(original);
  });

  it("asks once when a source has no separate resize URL", async () => {
    const fetchImpl = fetchFor({ [ORIGINAL]: { status: 200 } });
    const image = await fetchDisplayImage(
      { displayUrl: ORIGINAL, originalUrl: ORIGINAL, width: 1400 },
      { fetch: fetchImpl, resize: noResizer },
    );

    expect(image.servedFrom).toBe("provider-resize");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("sends the referer the museum CDNs require", async () => {
    const fetchImpl = fetchFor({ [DISPLAY]: { status: 200 } });
    await fetchDisplayImage(
      { displayUrl: DISPLAY, originalUrl: ORIGINAL, width: 1400 },
      { fetch: fetchImpl, resize: noResizer },
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      DISPLAY,
      expect.objectContaining({
        headers: expect.objectContaining({ Referer: "https://images.pexels.com/" }),
      }),
    );
  });

  it("reports every url it tried when nothing can be fetched", async () => {
    const attempt = fetchDisplayImage(
      { displayUrl: DISPLAY, originalUrl: ORIGINAL, width: 1400 },
      {
        fetch: fetchFor({ [DISPLAY]: { status: 500 }, [ORIGINAL]: { status: 404 } }),
        resize: noResizer,
      },
    );

    await expect(attempt).rejects.toBeInstanceOf(ImageUnavailableError);
    await expect(attempt).rejects.toThrow(/500/);
    await expect(attempt).rejects.toThrow(/404/);
  });
});
