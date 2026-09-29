/**
 * Pexels.
 *
 * Images are hotlinked: its CDN resizes to any width from query parameters,
 * returns AVIF straight from the browser's own `Accept` header, sends
 * `Access-Control-Allow-Origin: *` and caches for a year. Nothing we built
 * would improve on that, and its licence forbids redistributing its photos on
 * other platforms, so we do not copy them.
 *
 * Its featured collections are curated around a coherent subject, which is why
 * `collectionId` exists on HarvestQuery: a Pexels theme is a good source of
 * candidates. It is not a shortcut past the review gate.
 */

import { z } from "zod";
import type {
  Candidate,
  HarvestContext,
  HarvestQuery,
  SourceProvider,
} from "../types.ts";

const API = "https://api.pexels.com/v1";

const PhotoSchema = z.object({
  id: z.number(),
  width: z.number(),
  height: z.number(),
  url: z.string(),
  photographer: z.string(),
  photographer_url: z.string(),
  avg_color: z.string().nullable().optional(),
  alt: z.string().nullable().optional(),
  src: z.object({ original: z.string() }),
});

const PageSchema = z
  .object({
    photos: z.array(PhotoSchema).optional(),
    // A collection returns `media` rather than `photos`, and can include videos.
    media: z.array(PhotoSchema.extend({ type: z.string().optional() })).optional(),
  })
  /*
    One of the two must be present. Without this a response of an unexpected
    shape parses cleanly and yields nothing, so a change at Pexels' end would
    look like "no results" rather than failing loudly.
  */
  .refine((page) => page.photos !== undefined || page.media !== undefined, {
    message: "Pexels payload has neither `photos` nor `media`",
  });

export type PexelsPage = z.infer<typeof PageSchema>;

/**
 * Pure. Tests run this against a committed fixture captured from the live API,
 * so a change in Pexels' response shape fails a test rather than a build.
 */
export function normalisePexels(payload: unknown, retrievedAt: string): Candidate[] {
  const page = PageSchema.parse(payload);
  /*
    A collection can hold videos. Pexels capitalises the discriminator
    ("Photo", "Video"), so this matches case-insensitively and accepts only
    what it can prove is a photograph - a lowercase comparison here silently
    let every video through.
  */
  const photos =
    page.photos ??
    (page.media ?? []).filter(
      (m) => m.type === undefined || m.type.toLowerCase() === "photo",
    );

  return photos.map((photo) => ({
    sourceId: "pexels" as const,
    externalId: String(photo.id),
    providerTitle: photo.alt?.trim() || `Photo ${photo.id}`,
    providerAlt: photo.alt?.trim() || null,
    objectUrl: photo.url,
    creator: photo.photographer,
    creatorUrl: photo.photographer_url,
    dateDisplay: null,
    medium: "Photograph",
    classification: null,
    intrinsicWidth: photo.width,
    intrinsicHeight: photo.height,
    dominantColour: photo.avg_color ?? null,
    // The unparameterised original; widths are added at render time.
    imageUrl: photo.src.original,
    licenceId: "pexels" as const,
    retrievedAt,
  }));
}

export const pexels: SourceProvider = {
  id: "pexels",
  keyEnvVar: "PEXELS_API_KEY",
  // Documented as 200/hour and 20,000/month; the live ceiling measured higher.
  requestsPerHour: 200,

  async harvest(query: HarvestQuery, ctx: HarvestContext): Promise<Candidate[]> {
    const key = ctx.env.PEXELS_API_KEY;
    if (!key) throw new Error("PEXELS_API_KEY is not set (see .env.example)");

    const retrievedAt = ctx.now().toISOString().slice(0, 10);
    const perPage = query.perPage ?? 40;
    const out: Candidate[] = [];

    for (let page = 1; page <= (query.pages ?? 1); page += 1) {
      const url = query.collectionId
        ? `${API}/collections/${query.collectionId}?per_page=${perPage}&page=${page}&type=photos`
        : `${API}/search?query=${encodeURIComponent(query.query ?? "")}` +
          `&per_page=${perPage}&page=${page}` +
          (query.orientation ? `&orientation=${query.orientation}` : "");

      const res = await ctx.fetch(url, { headers: { Authorization: key } });
      if (!res.ok) {
        throw new Error(`Pexels ${res.status} ${res.statusText} for ${url}`);
      }
      const batch = normalisePexels(await res.json(), retrievedAt);
      if (batch.length === 0) break;
      out.push(...batch);
    }

    return out;
  },
};

/** The featured themes, for choosing what to harvest. */
export async function pexelsFeaturedCollections(
  ctx: HarvestContext,
  perPage = 40,
): Promise<Array<{ id: string; title: string; photosCount: number }>> {
  const key = ctx.env.PEXELS_API_KEY;
  if (!key) throw new Error("PEXELS_API_KEY is not set (see .env.example)");

  const res = await ctx.fetch(`${API}/collections/featured?per_page=${perPage}`, {
    headers: { Authorization: key },
  });
  if (!res.ok) throw new Error(`Pexels ${res.status} listing collections`);

  const parsed = z
    .object({
      collections: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          photos_count: z.number().optional(),
        }),
      ),
    })
    .parse(await res.json());

  return parsed.collections.map((c) => ({
    id: c.id,
    title: c.title,
    photosCount: c.photos_count ?? 0,
  }));
}
