/**
 * What each source is called, what it licenses under, and how its images are
 * delivered.
 *
 * This is the switchboard the `#/sources` preference screen reads and the one
 * place a new provider has to be declared. Pure display data and pure string
 * building - no fetching, no keys. Ingestion adapters live in scripts/ and are
 * never imported from src/.
 */

import type { Licence, LicenceId, SourceId } from "./types";

export const LICENCES: Record<LicenceId, Licence> = {
  "cc0-1.0": {
    id: "cc0-1.0",
    name: "CC0 1.0",
    url: "https://creativecommons.org/publicdomain/zero/1.0/",
    requiresAttribution: false,
  },
  "pdm-1.0": {
    id: "pdm-1.0",
    name: "Public Domain Mark 1.0",
    url: "https://creativecommons.org/publicdomain/mark/1.0/",
    requiresAttribution: false,
  },
  "cc-by-4.0": {
    id: "cc-by-4.0",
    name: "CC BY 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/",
    requiresAttribution: true,
  },
  unsplash: {
    id: "unsplash",
    name: "Unsplash License",
    url: "https://unsplash.com/license",
    requiresAttribution: false,
  },
  pexels: {
    id: "pexels",
    name: "Pexels License",
    url: "https://www.pexels.com/license/",
    requiresAttribution: false,
  },
};

/**
 * A credit a provider requires of the application itself, over and above the
 * per-item credit.
 *
 * Pexels asks for a prominent "Photos provided by Pexels" link on any surface
 * making API requests; Unsplash asks that both the photographer and Unsplash
 * be attributed. The museums ask for nothing, because CC0 asks for nothing.
 */
export interface PlatformAttribution {
  label: string;
  url: string;
}

export interface SourceInfo {
  id: SourceId;
  /** Shown on the sources screen and in credits. */
  label: string;
  /** One line explaining what a painter gets from this source. */
  blurb: string;
  homeUrl: string;
  licence: Licence;
  delivery: "local" | "remote";
  platformAttribution: PlatformAttribution | null;
  /**
   * True for sources that are not real reference imagery. CLAUDE.md requires
   * temporary assets to be labelled honestly, so the sources screen says so
   * rather than letting placeholders pass as a collection.
   */
  placeholder: boolean;
}

/**
 * Unsplash's guidelines require outbound links to carry these, so a
 * photographer can see the traffic a credit sent them.
 */
const UNSPLASH_UTM = "utm_source=little_wash&utm_medium=referral";

export const SOURCES: Record<SourceId, SourceInfo> = {
  placeholder: {
    id: "placeholder",
    label: "Prototype placeholders",
    blurb: "Original CC0 illustrations drawn for this prototype, not real references.",
    homeUrl: "https://github.com/heeaaa/little-wash",
    licence: LICENCES["cc0-1.0"],
    delivery: "local",
    platformAttribution: null,
    placeholder: true,
  },
  pexels: {
    id: "pexels",
    label: "Pexels",
    blurb: "Free photographs, curated into themes. Good for simple objects, plants and landscapes.",
    homeUrl: "https://www.pexels.com",
    licence: LICENCES.pexels,
    delivery: "remote",
    platformAttribution: {
      label: "Photos provided by Pexels",
      url: "https://www.pexels.com",
    },
    placeholder: false,
  },
  unsplash: {
    id: "unsplash",
    label: "Unsplash",
    blurb: "Free photographs with a wide range of subjects and light.",
    homeUrl: `https://unsplash.com?${UNSPLASH_UTM}`,
    licence: LICENCES.unsplash,
    delivery: "remote",
    platformAttribution: {
      label: "Photos from Unsplash",
      url: `https://unsplash.com?${UNSPLASH_UTM}`,
    },
    placeholder: false,
  },
  met: {
    id: "met",
    label: "The Met",
    blurb: "Public-domain works from the Metropolitan Museum of Art's open access collection.",
    homeUrl: "https://www.metmuseum.org",
    licence: LICENCES["cc0-1.0"],
    delivery: "local",
    platformAttribution: null,
    placeholder: false,
  },
  smithsonian: {
    id: "smithsonian",
    label: "Smithsonian",
    blurb: "CC0 works and specimen photography from Smithsonian Open Access.",
    homeUrl: "https://www.si.edu/openaccess",
    licence: LICENCES["cc0-1.0"],
    delivery: "local",
    platformAttribution: null,
    placeholder: false,
  },
  aic: {
    id: "aic",
    label: "Art Institute of Chicago",
    blurb: "Public-domain paintings and drawings, with unusually good descriptions.",
    homeUrl: "https://www.artic.edu",
    licence: LICENCES["cc0-1.0"],
    delivery: "local",
    platformAttribution: null,
    placeholder: false,
  },
  rijksmuseum: {
    id: "rijksmuseum",
    label: "Rijksmuseum",
    blurb: "Public-domain works from the Dutch national collection.",
    homeUrl: "https://www.rijksmuseum.nl",
    licence: LICENCES["cc0-1.0"],
    delivery: "local",
    platformAttribution: null,
    placeholder: false,
  },
  openverse: {
    id: "openverse",
    label: "Openverse",
    blurb: "CC0 and public-domain photographs gathered from across the open web.",
    homeUrl: "https://openverse.org",
    licence: LICENCES["cc0-1.0"],
    delivery: "local",
    platformAttribution: null,
    placeholder: false,
  },
};

/** Stable display order: photographs first, then museums, placeholders last. */
export const SOURCE_ORDER: readonly SourceId[] = [
  "pexels",
  "unsplash",
  "met",
  "smithsonian",
  "aic",
  "rijksmuseum",
  "openverse",
  "placeholder",
];

export function sourceInfo(id: SourceId): SourceInfo {
  return SOURCES[id];
}

/**
 * Build a provider CDN URL for a given width.
 *
 * Both photo platforms resize from query parameters, and both negotiate a
 * modern format - Unsplash from an explicit `fm`, Pexels from the browser's
 * own `Accept` header - so asking for a width is all we ever do. Anything
 * local returns its base URL untouched, because its widths were generated at
 * build time and are listed on the ImageSet.
 */
export function remoteImageUrl(
  sourceId: SourceId,
  baseUrl: string,
  width: number,
): string {
  // A provider URL can already carry parameters, so build rather than concatenate.
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return baseUrl;
  }

  switch (sourceId) {
    case "pexels":
      url.searchParams.set("auto", "compress");
      url.searchParams.set("cs", "tinysrgb");
      url.searchParams.set("w", String(width));
      return url.toString();
    case "unsplash":
      url.searchParams.set("w", String(width));
      url.searchParams.set("fm", "avif");
      url.searchParams.set("q", "70");
      url.searchParams.set("fit", "max");
      return url.toString();
    default:
      return baseUrl;
  }
}
