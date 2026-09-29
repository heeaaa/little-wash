/**
 * Where a reference came from, and under what terms.
 *
 * PRODUCT.md:83 makes per-item attribution and provenance "a first-class data
 * requirement". Until now the whole of it was one free-text string shared by
 * all twelve placeholders. These types replace that string with something a
 * build step can validate and a credit line can render.
 *
 * Display metadata only. Nothing here fetches; the ingestion pipeline lives in
 * scripts/ and never reaches the browser bundle, so no API key can leak through
 * this module.
 */

/**
 * Every provider the catalogue can draw from.
 *
 * `placeholder` is the twelve original CC0 SVGs this prototype ships with. It
 * is a real source id rather than a special case so the app cannot quietly
 * forget they are placeholders, and so retiring them is a data change rather
 * than a code change.
 */
export type SourceId =
  | "placeholder"
  | "pexels"
  | "unsplash"
  | "met"
  | "smithsonian"
  | "aic"
  | "rijksmuseum"
  | "openverse";

/**
 * A painting to study, or a photograph to paint from. Museum artworks and
 * stock photographs both belong in the catalogue but read differently: a
 * credit says "Winslow Homer" for one and "photo by X" for the other.
 */
export type ReferenceKind = "artwork" | "photograph";

export type LicenceId =
  | "cc0-1.0"
  | "pdm-1.0"
  | "cc-by-4.0"
  | "unsplash"
  | "pexels";

export interface Licence {
  id: LicenceId;
  /** Short name, shown beside a credit. */
  name: string;
  /** Canonical terms URL, linked from the credit. */
  url: string;
  /**
   * Whether the licence itself compels attribution.
   *
   * We attribute either way - see attribution.ts. This flag exists so the
   * build can tell the difference between a credit we owe and a credit we
   * give, not so any surface can skip one.
   */
  requiresAttribution: boolean;
}

export interface Credit {
  sourceId: SourceId;
  /** The institution or platform holding the work. */
  institution: string;
  /** The provider's own id, for re-fetching and de-duplicating. */
  externalId: string;
  /** Deep link to the work on the provider's site. */
  objectUrl: string;
  /** The maker. `null` only where the provider genuinely records none. */
  creator: string | null;
  /** The maker's page on the provider's site, where one exists. */
  creatorUrl: string | null;
  /** As the provider displays it ("1899", "c. 1640"), not a parsed date. */
  dateDisplay: string | null;
  /** "Watercolour on paper", "Photograph". */
  medium: string | null;
  licence: Licence;
  /** ISO date the metadata was captured, so a credit can be dated. */
  retrievedAt: string;
}

/**
 * Images we generated and ship ourselves.
 *
 * Used for the museums: the Met sends no CORS header and the Art Institute's
 * CDN rejects requests that do not carry its own Referer, so neither can be
 * hotlinked from our origin. Their licences are CC0, so redistributing our own
 * derivatives is exactly what those terms permit.
 */
export interface LocalDelivery {
  delivery: "local";
  /** Ascending widths, each an asset URL emitted by the build. */
  widths: ReadonlyArray<{ width: number; src: string }>;
}

/**
 * Images served by the provider's own CDN, resized by their URL parameters.
 *
 * Used for Pexels and Unsplash. Unsplash's API guidelines require it, and both
 * CDNs are better than anything we would build: any width on demand, AVIF,
 * `Access-Control-Allow-Origin: *` and a year of cache.
 */
export interface RemoteDelivery {
  delivery: "remote";
  /** The provider's image URL, without any sizing parameters. */
  baseUrl: string;
}

export type ImageSet = (LocalDelivery | RemoteDelivery) & {
  /** Natural pixel size, so the layout can reserve the right box. */
  intrinsicWidth: number;
  intrinsicHeight: number;
  /**
   * A tiny inline placeholder shown while the image loads.
   *
   * `null` wherever we have none. It must never survive onto the settled
   * image: DESIGN.md:495-502 makes colour fidelity outrank the transition, and
   * e2e/posture.spec.ts asserts the settled artwork reports `filter: none`.
   */
  lqip: string | null;
};
