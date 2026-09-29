/**
 * The Metropolitan Museum of Art, open access.
 *
 * No key, 80 requests a second, and `isPublicDomain` tells us plainly which
 * objects are CC0. Two things make it the most awkward of the providers:
 *
 * - Its image host sends **no CORS header**, and it offers only fixed
 *   derivatives (`original`, `web-large`, `mobile-large`) rather than
 *   arbitrary widths. So its images are downloaded at build time and served as
 *   our own AVIF/WebP. CC0 is exactly the licence that permits that.
 * - Search returns object ids only, so every candidate costs one more request,
 *   and the object payload has no image dimensions and no alt text at all.
 *   Dimensions come from the downloaded file; alt text is the curator's job,
 *   and the build refuses an entry without it.
 */

import { z } from "zod";
import type {
  Candidate,
  HarvestContext,
  HarvestQuery,
  SourceProvider,
} from "../types.ts";

const API = "https://collectionapi.metmuseum.org/public/collection/v1";

const ObjectSchema = z.object({
  objectID: z.number(),
  isPublicDomain: z.boolean(),
  title: z.string().nullable().optional(),
  artistDisplayName: z.string().nullable().optional(),
  artistULAN_URL: z.string().nullable().optional(),
  objectDate: z.string().nullable().optional(),
  medium: z.string().nullable().optional(),
  classification: z.string().nullable().optional(),
  objectName: z.string().nullable().optional(),
  objectURL: z.string().nullable().optional(),
  primaryImage: z.string().nullable().optional(),
  primaryImageSmall: z.string().nullable().optional(),
});

const SearchSchema = z.object({
  total: z.number().optional(),
  objectIDs: z.array(z.number()).nullable().optional(),
});

function blank(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Pure. One Met object becomes at most one candidate: anything not in the
 * public domain, or with no image, is dropped here rather than being carried
 * to a licence gate that would only reject it later.
 */
export function normaliseMetObject(
  payload: unknown,
  retrievedAt: string,
): Candidate | null {
  const object = ObjectSchema.parse(payload);
  if (!object.isPublicDomain) return null;

  /*
    The original is the image: web-large is only 600px on its long edge
    (measured 28/09/2026), below the 1200px the enlarged view needs. It is
    large, so web-large rides along as the preview harvest measures from, and
    only the derive step, once per approved piece, downloads the original.
  */
  const original = blank(object.primaryImage);
  const small = blank(object.primaryImageSmall);
  const image = original ?? small;
  if (!image) return null;

  return {
    sourceId: "met",
    externalId: String(object.objectID),
    providerTitle: blank(object.title) ?? `Object ${object.objectID}`,
    // The Met supplies no alt text whatsoever. The build gate is what keeps
    // this from shipping as an empty alt attribute.
    providerAlt: null,
    objectUrl:
      blank(object.objectURL) ??
      `https://www.metmuseum.org/art/collection/search/${object.objectID}`,
    creator: blank(object.artistDisplayName),
    creatorUrl: blank(object.artistULAN_URL),
    dateDisplay: blank(object.objectDate),
    medium: blank(object.medium),
    classification: blank(object.classification) ?? blank(object.objectName),
    // Not in the payload; filled from the downloaded file when images derive.
    intrinsicWidth: null,
    intrinsicHeight: null,
    dominantColour: null,
    imageUrl: image,
    ...(original && small ? { previewUrl: small } : {}),
    licenceId: "cc0-1.0",
    retrievedAt,
  };
}

/** The pause before each object request. About three a second. */
export const MET_PAUSE_MS = 350;

export function normaliseMetSearch(payload: unknown): number[] {
  return SearchSchema.parse(payload).objectIDs ?? [];
}

export const met: SourceProvider = {
  id: "met",
  keyEnvVar: null,
  /*
    The API documents 80 requests a second, but the firewall in front of it
    does not agree: 130 unpaced requests on 28/09/2026 earned a 403 for every
    request after. Paced at MET_PAUSE_MS, which is what this reflects.
  */
  requestsPerHour: 3_600_000 / MET_PAUSE_MS,

  async harvest(query: HarvestQuery, ctx: HarvestContext): Promise<Candidate[]> {
    const retrievedAt = ctx.now().toISOString().slice(0, 10);

    /*
      q must be the LAST parameter. Measured 28/09/2026: with q first the Met
      ignores the words, so "hippopotamus" returned a stela, a bust and an
      altarpiece; with q last, 77 hippopotamuses. isPublicDomain is still
      asked for, though it is not a documented search filter and changed
      nothing when measured; the real guarantee is normaliseMetObject, which
      drops anything not in the public domain. A department narrows further:
      "cat" across the museum finds portraits with cats in them, within
      Egyptian Art the bronze cats.
    */
    const searchUrl =
      `${API}/search?` +
      (query.department ? `departmentId=${query.department}&` : "") +
      `hasImages=true&isPublicDomain=true&q=${encodeURIComponent(query.query ?? "")}`;
    const searchRes = await ctx.fetch(searchUrl);
    if (!searchRes.ok) {
      throw new Error(`Met ${searchRes.status} ${searchRes.statusText} searching`);
    }

    // Search gives ids only, so each candidate is one more request. Capped
    // rather than paged: this is curation, not a bulk download. The Met
    // publishes a full CSV for anyone who wants the whole collection.
    const ids = normaliseMetSearch(await searchRes.json()).slice(
      0,
      query.perPage ?? 40,
    );

    const out: Candidate[] = [];
    for (const id of ids) {
      await ctx.sleep?.(MET_PAUSE_MS);
      const res = await ctx.fetch(`${API}/objects/${id}`);
      // A refusal is the firewall, not the object: asking again only extends it.
      if (res.status === 403 || res.status === 429) {
        throw new Error(
          `The Met is refusing requests (${res.status}). Wait an hour and harvest again; ` +
            "anything already measured is cached.",
        );
      }
      if (!res.ok) continue;
      const candidate = normaliseMetObject(await res.json(), retrievedAt);
      if (candidate) out.push(candidate);
    }
    return out;
  },
};
