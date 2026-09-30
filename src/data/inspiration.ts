/*
  Photographs that sit beside a warm-up as inspiration, never as the example.

  Five of the twenty variations are about weather and distance - a sky, a
  sunset, mist, receding hills, a cloud - and there a real photograph shows
  something an illustration cannot: how gently one colour becomes the next in
  the world. Everything else is carried by the illustrated examples.

  Each photo was proposed from Pexels or Unsplash, checked against the
  provider's API on 29/09/2026 (the three Unsplash photos are standard-licence,
  not Unsplash+ or sponsored, and their use was reported to Unsplash as its API
  guidelines require), and approved one by one by the curator. They are fixed
  to their variation: nothing here is random, rotated or searched at run time.

  The alt text is ours, written for someone deciding what to paint. Provider
  captions are machine-written and can be wrong - the sunset's reads "a plane
  flying in the sky at sunset", and there is no plane.

  Relative imports on purpose: `npm run catalog:build` reads this module from
  scripts/ to list these photos in docs/CREDITS.md, outside Vite's `@/` alias.
*/

import { LICENCES } from "../lib/sources/registry";
import type { Credit, ImageSet } from "../lib/sources/types";

export interface InspirationPhoto {
  /** Always a photograph: a painting would be an example, not inspiration. */
  kind: "photograph";
  /** Short name, used in docs/CREDITS.md. */
  title: string;
  alt: string;
  credit: Credit;
  image: ImageSet;
}

const RETRIEVED = "2026-09-29";

function lqip(hex: string): string {
  // The same 1x1 placeholder the catalogue build generates.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="${hex}"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/** Keyed by variation id, so a photo can belong to exactly one variation. */
export const INSPIRATION_PHOTOS = {
  "soft-clouds": {
    kind: "photograph",
    title: "A single cloud",
    alt: "A single soft white cloud, billowing on top with a small wisp trailing below, alone in a clear mid-blue sky.",
    credit: {
      sourceId: "unsplash",
      institution: "Unsplash",
      externalId: "A9_IsUtjHm4",
      objectUrl:
        "https://unsplash.com/photos/white-clouds-and-blue-sky-during-daytime-A9_IsUtjHm4?utm_source=little_wash&utm_medium=referral",
      creator: "engin akyurt",
      creatorUrl: "https://unsplash.com/@enginakyurt?utm_source=little_wash&utm_medium=referral",
      dateDisplay: "2020",
      medium: "Photograph",
      licence: LICENCES.unsplash,
      retrievedAt: RETRIEVED,
    },
    image: {
      delivery: "remote",
      baseUrl:
        "https://images.unsplash.com/photo-1601370552761-d129028bd833?ixid=M3wxMDc1MzU0fDB8MXxzZWFyY2h8Mnx8Y3VtdWx1cyUyMGNsb3VkcyUyMGJsdWUlMjBza3l8ZW58MHwwfHx8MTc5MDY2NDQ3MXww&ixlib=rb-4.1.0",
      intrinsicWidth: 3872,
      intrinsicHeight: 2592,
      lqip: lqip("#2673c0"),
    },
  },
  "layered-mountains": {
    kind: "photograph",
    title: "Misty mountain ridges",
    alt: "Five or six mountain ridges in misty grey under a pale peach sky, palest and faintest at the back and darkest at the front.",
    credit: {
      sourceId: "pexels",
      institution: "Pexels",
      externalId: "16466665",
      objectUrl: "https://www.pexels.com/photo/mountain-peaks-shrouded-in-the-morning-fog-16466665/",
      creator: "Mehmet Turgut  Kirkgoz",
      creatorUrl: "https://www.pexels.com/@tkirkgoz",
      dateDisplay: null,
      medium: "Photograph",
      licence: LICENCES.pexels,
      retrievedAt: RETRIEVED,
    },
    image: {
      delivery: "remote",
      baseUrl: "https://images.pexels.com/photos/16466665/pexels-photo-16466665.jpeg",
      intrinsicWidth: 4096,
      intrinsicHeight: 3072,
      lqip: lqip("#8E929B"),
    },
  },
  "fading-sky": {
    kind: "photograph",
    title: "Clear sky over the sea",
    alt: "A clear sky that is deepest blue at the top and fades to a pale, almost white band where it meets a dark blue sea.",
    credit: {
      sourceId: "pexels",
      institution: "Pexels",
      externalId: "36475851",
      objectUrl: "https://www.pexels.com/photo/endless-blue-ocean-horizon-under-clear-sky-36475851/",
      creator: "Je Hwan Lee",
      creatorUrl: "https://www.pexels.com/@alt5713",
      dateDisplay: null,
      medium: "Photograph",
      licence: LICENCES.pexels,
      retrievedAt: RETRIEVED,
    },
    image: {
      delivery: "remote",
      baseUrl: "https://images.pexels.com/photos/36475851/pexels-photo-36475851.jpeg",
      intrinsicWidth: 8368,
      intrinsicHeight: 5584,
      lqip: lqip("#467BA7"),
    },
  },
  "sunset-wash": {
    kind: "photograph",
    title: "Evening sky gradient",
    alt: "A clear evening sky with no clouds, shading smoothly from cool grey-blue at the top to warm gold at the bottom.",
    credit: {
      sourceId: "unsplash",
      institution: "Unsplash",
      externalId: "Kg2M24Pr9aU",
      objectUrl:
        "https://unsplash.com/photos/a-plane-flying-in-the-sky-at-sunset-Kg2M24Pr9aU?utm_source=little_wash&utm_medium=referral",
      creator: "César Couto",
      creatorUrl: "https://unsplash.com/@xcrap?utm_source=little_wash&utm_medium=referral",
      dateDisplay: "2017",
      medium: "Photograph",
      licence: LICENCES.unsplash,
      retrievedAt: RETRIEVED,
    },
    image: {
      delivery: "remote",
      baseUrl:
        "https://images.unsplash.com/photo-1508614823792-1f56af914148?ixid=M3wxMDc1MzU0fDB8MXxzZWFyY2h8OXx8c3Vuc2V0JTIwZ3JhZGllbnQlMjBza3l8ZW58MHwwfHx8MTc5MDY2NDQ3NHww&ixlib=rb-4.1.0",
      intrinsicWidth: 6720,
      intrinsicHeight: 4480,
      lqip: lqip("#c0c0c0"),
    },
  },
  "misty-landscape": {
    kind: "photograph",
    title: "Hills fading into mist",
    alt: "Blue hills fading into mist: a dark wooded hill in front, paler ridges behind, and a faint double peak in the pale sky.",
    credit: {
      sourceId: "unsplash",
      institution: "Unsplash",
      externalId: "5V-W4zTqZ74",
      objectUrl:
        "https://unsplash.com/photos/green-trees-on-mountain-during-daytime-5V-W4zTqZ74?utm_source=little_wash&utm_medium=referral",
      creator: "Mihály Köles",
      creatorUrl: "https://unsplash.com/@mihaly_koles?utm_source=little_wash&utm_medium=referral",
      dateDisplay: "2021",
      medium: "Photograph",
      licence: LICENCES.unsplash,
      retrievedAt: RETRIEVED,
    },
    image: {
      delivery: "remote",
      baseUrl:
        "https://images.unsplash.com/photo-1613977854253-293f9c54d96c?ixid=M3wxMDc1MzU0fDB8MXxzZWFyY2h8M3x8Zm9nZ3klMjBoaWxscyUyMGxheWVyc3xlbnwwfDB8fHwxNzkwNjY0NDc1fDA&ixlib=rb-4.1.0",
      intrinsicWidth: 5131,
      intrinsicHeight: 2983,
      lqip: lqip("#264059"),
    },
  },
} as const satisfies Record<string, InspirationPhoto>;

export type InspirationVariationId = keyof typeof INSPIRATION_PHOTOS;
