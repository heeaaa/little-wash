/**
 * Getting a candidate's image in front of the curator.
 *
 * The review tool used to point the plate straight at the provider's resize
 * URL - for Pexels, `?auto=compress&cs=tinysrgb&w=1200`. That service is not
 * dependable. Measured against the live CDN on 21/09/2026 over 40 shortlisted
 * candidates, 30 returned HTTP 500 or a 503 reading "upstream connect error
 * ... reset reason: overflow" for the resized URL, and all 30 of those
 * returned 200 for the untouched original. Immediate retries and a different
 * requested width both failed the same way; the service recovered on its own
 * something under an hour later. So it is a provider-side outage rather than
 * a permanent property of those images - but during it, a curation session is
 * a column of broken plates, which is what this is here to prevent.
 *
 * The original is the fallback, because it kept working throughout. It is
 * bigger - mean 1.5MB, and 29 of 428 shortlisted candidates are over 40
 * megapixels - so it is resized here before it reaches the browser rather
 * than asking the page to decode a 108-megapixel JPEG twice.
 *
 * No retry loop: retrying inside an outage was measured and does nothing but
 * make the page slower. Recovery is a curator pressing "Try again".
 *
 * Network shape only. The resizer is injected so this stays testable without
 * decoding anything, and so a resize failure can never lose bytes we already
 * hold.
 */

/** Which URL actually produced the bytes. */
export type ImageOrigin = "provider-resize" | "original";

export interface ProxiedImage {
  bytes: Uint8Array;
  contentType: string;
  servedFrom: ImageOrigin;
  /** True when these bytes were downscaled here rather than by the provider. */
  resizedLocally: boolean;
}

export interface ImageRequest {
  /** The provider's resize URL. Tried first because it is the cheap one. */
  displayUrl: string;
  /** The untouched original. Tried when the resize fails. */
  originalUrl: string;
  /** Width to downscale a fallback original to. */
  width: number;
}

export interface ImageProxyDeps {
  fetch: typeof globalThis.fetch;
  /**
   * Downscale to `width`, returning null when it cannot. Best effort: a
   * resizer that fails or throws costs quality, never the image.
   */
  resize?: (bytes: Uint8Array, width: number) => Promise<Uint8Array | null>;
}

/** One URL that was tried and what came back, for an honest error message. */
export interface ImageAttempt {
  url: string;
  /** An HTTP status, or "network" when the request never completed. */
  status: number | "network";
  detail?: string;
}

export class ImageUnavailableError extends Error {
  constructor(readonly attempts: readonly ImageAttempt[]) {
    super(
      `No image could be fetched:\n` +
        attempts.map((a) => `  ${a.status} ${a.url}${a.detail ? ` (${a.detail})` : ""}`).join("\n"),
    );
    this.name = "ImageUnavailableError";
  }
}

/**
 * Headers some provider CDNs insist on.
 *
 * Cloudflare in front of artic.edu rejects an image request with no Referer,
 * and sending our own user agent is the polite half of hotlinking.
 */
function headersFor(url: string): Record<string, string> {
  return {
    Referer: `${new URL(url).origin}/`,
    "User-Agent": "little-wash-curation/1.0",
  };
}

export async function fetchDisplayImage(
  request: ImageRequest,
  deps: ImageProxyDeps,
): Promise<ProxiedImage> {
  const attempts: ImageAttempt[] = [];

  /*
    Resize first, original second. A local source hands back the same URL for
    both, and fetching it twice would only be slow, so it is tried once.
  */
  const order: Array<{ url: string; origin: ImageOrigin }> = [
    { url: request.displayUrl, origin: "provider-resize" },
  ];
  if (request.originalUrl !== request.displayUrl) {
    order.push({ url: request.originalUrl, origin: "original" });
  }

  for (const { url, origin } of order) {
    let response: Response;
    try {
      response = await deps.fetch(url, { headers: headersFor(url) });
    } catch (error) {
      attempts.push({ url, status: "network", detail: String(error) });
      continue;
    }

    if (!response.ok) {
      attempts.push({ url, status: response.status });
      continue;
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    // A CDN answering an image request with an error page is a failure wearing
    // a 200, and it reaches the canvas as a decode error rather than as this.
    if (!contentType.startsWith("image/")) {
      attempts.push({ url, status: response.status, detail: `served ${contentType}` });
      continue;
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length === 0) {
      attempts.push({ url, status: response.status, detail: "empty body" });
      continue;
    }

    if (origin === "provider-resize") {
      return { bytes, contentType, servedFrom: origin, resizedLocally: false };
    }

    const resized = await tryResize(bytes, request.width, deps.resize);
    return resized
      ? { bytes: resized, contentType: "image/jpeg", servedFrom: origin, resizedLocally: true }
      : { bytes, contentType, servedFrom: origin, resizedLocally: false };
  }

  throw new ImageUnavailableError(attempts);
}

async function tryResize(
  bytes: Uint8Array,
  width: number,
  resize: ImageProxyDeps["resize"],
): Promise<Uint8Array | null> {
  if (!resize) return null;
  try {
    const out = await resize(bytes, width);
    return out && out.length > 0 ? out : null;
  } catch {
    // Serving a 20MB original beats serving nothing.
    return null;
  }
}
