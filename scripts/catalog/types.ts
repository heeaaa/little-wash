/**
 * The shapes the ingestion pipeline passes between its stages.
 *
 * Node only. Nothing in scripts/ is ever imported from src/, so no provider
 * code and no API key can reach the browser bundle. The types the *app* shares
 * with this pipeline live in src/lib/sources/types.ts and are imported here,
 * not redefined, so a change to a credit is one edit.
 */

import type {
  Credit,
  ImageSet,
  LicenceId,
  ReferenceKind,
  SourceId,
} from "../../src/lib/sources/types.ts";
import type {
  Difficulty,
  PaintReference,
  Subject,
  Swatch,
} from "../../src/lib/types.ts";
import type { Measurements } from "./measure.ts";

export type {
  Credit,
  ImageSet,
  LicenceId,
  Measurements,
  PaintReference,
  ReferenceKind,
  SourceId,
};

/** What to ask a provider for. Not every provider supports every field. */
export interface HarvestQuery {
  /** Free-text search. */
  query?: string;
  /** A provider-side curated set, such as a Pexels collection id. */
  collectionId?: string;
  perPage?: number;
  /** How many pages to walk. Kept small: this is curation, not scraping. */
  pages?: number;
  /** "square" | "portrait" | "landscape", where the provider supports it. */
  orientation?: string;
  /** A museum department to search within, where the provider has them. The Met only. */
  department?: number;
}

/**
 * One reference as a provider describes it, normalised but not yet curated.
 *
 * Deliberately separate from PaintReference. A candidate has not passed the
 * sketchability gate, has no human-written alt text, no prompt, no palette and
 * no tip - and must not be mistakable for something that has.
 */
export interface Candidate {
  sourceId: SourceId;
  /** The provider's own id, for re-fetching and de-duplicating. */
  externalId: string;
  /** The provider's title. A starting point for the curator, not the final one. */
  providerTitle: string;
  /**
   * The provider's own alt text, where it has any.
   *
   * Machine-written and usually a caption rather than a description, so it
   * seeds the review tool's field and never fills it. PRODUCT.md asks that a
   * reference alternative describe the subject usefully to someone deciding
   * whether to paint it, which none of these do.
   */
  providerAlt: string | null;
  objectUrl: string;
  creator: string | null;
  creatorUrl: string | null;
  dateDisplay: string | null;
  medium: string | null;
  /** The provider's own category, used by the shortlist heuristics. */
  classification: string | null;
  intrinsicWidth: number | null;
  intrinsicHeight: number | null;
  /** Average or dominant colour as hex, where the provider computes one. */
  dominantColour: string | null;
  /**
   * The image URL, meaning depends on the source's delivery mode: a base URL
   * to hotlink and resize for Pexels and Unsplash, a file to download for the
   * museums.
   */
  imageUrl: string;
  licenceId: LicenceId;
  /** ISO date this metadata was captured, so a credit can be dated. */
  retrievedAt: string;
  /**
   * What the image's own pixels say, measured at harvest time.
   *
   * Optional because a candidate harvested before measuring existed still
   * works - the shortlist falls back to its caption heuristics for those. A
   * measured candidate is judged on what it actually looks like instead.
   */
  measurements?: Measurements;
  /**
   * The subject this query was meant to fill, when it came from the harvest
   * plan. Prefills the review form, so a harvest aimed at "misty trees" does
   * not arrive asking whether each one is fruit.
   */
  plannedSubject?: Subject;
  /**
   * Unsplash only: the link its API guidelines ask to be called when a photo
   * is used, which counts it towards the photographer's downloads. Called
   * once, when the curator approves the photo - see trackUnsplashDownload.
   */
  downloadLocation?: string;
  /**
   * A smaller copy to measure from, where `imageUrl` is a multi-megabyte
   * original that only the derive step should download. The Met only.
   */
  previewUrl?: string;
}

/**
 * A candidate a human has approved and written for.
 *
 * The curator-authored fields are the ones no API can supply: whether it is
 * actually sketchable, how long it takes, what to say about it, and an alt
 * that describes the subject rather than captioning the photograph.
 */
export interface ApprovedEntry {
  /** Our slug, stable across catalogue rebuilds. Favourites are stored by it. */
  id: string;
  candidate: Candidate;

  title: string;
  subject: Subject;
  difficulty: Difficulty;
  minutes: number;
  /**
   * A one-line invitation, where one adds something.
   *
   * Optional: plenty of references say all they need to by being the image,
   * and an invented line of encouragement under every one of them reads as
   * filler. Omitted rather than stored empty.
   */
  prompt?: string;
  alt: string;
  palette: Swatch[];
  /** A concrete brushwork note, on the same terms as `prompt`. */
  tip?: string;
  kind: ReferenceKind;

  /** When this entry was approved, for the record. */
  approvedAt: string;
  /** Why it passed the sketchability gate, in the curator's words. Optional. */
  curationNote?: string;
}

export interface HarvestContext {
  /** Injected so tests never reach the network. */
  fetch: typeof globalThis.fetch;
  env: Record<string, string | undefined>;
  /** Injected so a captured `retrievedAt` is deterministic under test. */
  now: () => Date;
  /** Waits between requests. Injected so tests can pace without waiting. */
  sleep?: (ms: number) => Promise<void>;
}

export interface SourceProvider {
  readonly id: SourceId;
  /** The env var holding this provider's key, or null when none is needed. */
  readonly keyEnvVar: string | null;
  /** Requests per hour the provider allows, for the harvester's throttle. */
  readonly requestsPerHour: number;
  harvest(query: HarvestQuery, ctx: HarvestContext): Promise<Candidate[]>;
}
