/**
 * Unsplash.
 *
 * Images are hotlinked because its API guidelines require it: "we require the
 * image URLs returned by the API to be directly used or embedded in your
 * applications". That is also the better engineering choice - its CDN resizes
 * on demand, serves AVIF and sends `Access-Control-Allow-Origin: *`.
 *
 * `urls.raw` carries an `ixid` parameter that Unsplash uses to attribute
 * traffic back to the photographer. It must survive into the rendered URL, so
 * widths are added with URL.searchParams rather than by concatenation.
 *
 * `links.download_location` is kept on the candidate and called once, when
 * the curator approves the photo: that is the point it is "used" in the sense
 * the guidelines mean, and it is what credits the photographer with a
 * download. See trackUnsplashDownload.
 */

import { z } from "zod";
import type {
  Candidate,
  HarvestContext,
  HarvestQuery,
  SourceProvider,
} from "../types.ts";

const API = "https://api.unsplash.com";

const PhotoSchema = z.object({
  id: z.string(),
  width: z.number(),
  height: z.number(),
  color: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  alt_description: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  urls: z.object({ raw: z.string() }),
  links: z.object({ html: z.string(), download_location: z.string().optional() }),
  user: z.object({
    name: z.string().nullable().optional(),
    username: z.string().nullable().optional(),
    links: z.object({ html: z.string() }).optional(),
  }),
});

const PageSchema = z.union([
  z.object({ results: z.array(PhotoSchema) }),
  z.array(PhotoSchema),
]);

/** Unsplash's guidelines require outbound links to carry these. */
const UTM = "utm_source=little_wash&utm_medium=referral";

function withUtm(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("utm_source", "little_wash");
    parsed.searchParams.set("utm_medium", "referral");
    return parsed.toString();
  } catch {
    return `${url}?${UTM}`;
  }
}

/** Pure, so tests run it against a committed fixture with no network. */
export function normaliseUnsplash(payload: unknown, retrievedAt: string): Candidate[] {
  const parsed = PageSchema.parse(payload);
  const photos = Array.isArray(parsed) ? parsed : parsed.results;

  return photos.map((photo) => {
    const caption = photo.description?.trim() || photo.alt_description?.trim() || null;
    return {
      sourceId: "unsplash" as const,
      externalId: photo.id,
      providerTitle: caption || `Photo ${photo.id}`,
      providerAlt: photo.alt_description?.trim() || null,
      objectUrl: withUtm(photo.links.html),
      creator: photo.user.name?.trim() || photo.user.username?.trim() || null,
      creatorUrl: photo.user.links?.html ? withUtm(photo.user.links.html) : null,
      // Unsplash records when the photo was uploaded, not when it was taken,
      // so only the year is honest enough to show beside an artwork date.
      dateDisplay: photo.created_at ? photo.created_at.slice(0, 4) : null,
      medium: "Photograph",
      classification: null,
      intrinsicWidth: photo.width,
      intrinsicHeight: photo.height,
      dominantColour: photo.color ?? null,
      imageUrl: photo.urls.raw,
      licenceId: "unsplash" as const,
      retrievedAt,
      ...(photo.links.download_location
        ? { downloadLocation: photo.links.download_location }
        : {}),
    };
  });
}

/**
 * The harvest plan speaks Pexels' orientation words. Unsplash's only
 * difference is "squarish", and it answers 400 to "square".
 */
function unsplashOrientation(orientation: string): string {
  return orientation === "square" ? "squarish" : orientation;
}

export type DownloadTracking = { tracked: true } | { tracked: false; reason: string };

/**
 * Tell Unsplash a photo has been used, as its API guidelines require.
 *
 * Never throws: an approval must not be lost because Unsplash was slow or
 * down. It says plainly whether the call counted, so the caller can report a
 * miss rather than assume it did not happen.
 */
export async function trackUnsplashDownload(
  candidate: Pick<Candidate, "sourceId" | "downloadLocation">,
  ctx: Pick<HarvestContext, "fetch" | "env">,
): Promise<DownloadTracking> {
  if (candidate.sourceId !== "unsplash") {
    return { tracked: false, reason: "not an Unsplash photo" };
  }
  if (!candidate.downloadLocation) {
    return { tracked: false, reason: "no download link was recorded at harvest" };
  }
  const key = ctx.env.UNSPLASH_ACCESS_KEY;
  if (!key) return { tracked: false, reason: "UNSPLASH_ACCESS_KEY is not set" };

  try {
    const res = await ctx.fetch(candidate.downloadLocation, {
      headers: { Authorization: `Client-ID ${key}` },
    });
    return res.ok
      ? { tracked: true }
      : { tracked: false, reason: `Unsplash answered ${res.status}` };
  } catch (error) {
    return { tracked: false, reason: String(error) };
  }
}

export const unsplash: SourceProvider = {
  id: "unsplash",
  keyEnvVar: "UNSPLASH_ACCESS_KEY",
  // Demo applications get 50/hour; production access is an Unsplash review.
  requestsPerHour: 50,

  async harvest(query: HarvestQuery, ctx: HarvestContext): Promise<Candidate[]> {
    const key = ctx.env.UNSPLASH_ACCESS_KEY;
    if (!key) throw new Error("UNSPLASH_ACCESS_KEY is not set (see .env.example)");

    const retrievedAt = ctx.now().toISOString().slice(0, 10);
    const perPage = query.perPage ?? 30;
    const out: Candidate[] = [];

    for (let page = 1; page <= (query.pages ?? 1); page += 1) {
      const url =
        `${API}/search/photos?query=${encodeURIComponent(query.query ?? "")}` +
        `&per_page=${perPage}&page=${page}` +
        (query.orientation ? `&orientation=${unsplashOrientation(query.orientation)}` : "");

      const res = await ctx.fetch(url, {
        headers: { Authorization: `Client-ID ${key}` },
      });
      if (!res.ok) {
        throw new Error(`Unsplash ${res.status} ${res.statusText} for ${url}`);
      }
      const batch = normaliseUnsplash(await res.json(), retrievedAt);
      if (batch.length === 0) break;
      out.push(...batch);
    }

    return out;
  },
};
