/**
 * Which colours a piece's leaf is painted in.
 *
 * Only colours the piece itself names: every reference carries a palette of
 * named pigments, and a leaf is washed in two of them. Nothing here invents a
 * hue, and nothing touches the artwork - these hexes are the palette's own
 * display colours, the same ones its swatches show.
 *
 * Why not simply the first swatch, as the header's saved palette uses? Because
 * 70 of the 189 pieces open on Cool Grey, Ivory Black, Warm Grey or Chinese
 * White (counted 30/09/2026) - the ground or the shadow, not the subject - and
 * a tree of them would be grey. The first swatch with some colour in it is the
 * one a painter would call the piece's colour: the pear's Naples Yellow rather
 * than the table's Warm Grey.
 */

import type { Swatch } from "./types";

export interface LeafPigments {
  /** The body of the leaf. */
  lead: Swatch;
  /** Charged into the tip while the lead is wet, where the palette has another colour. */
  charge: Swatch | null;
}

/**
 * Below this CIE chroma a pigment reads as a neutral. Cool Grey is 3, Warm
 * Grey 10, Terre Verte 12; Raw Umber, the dullest colour a painter would still
 * call a colour, is 21.
 */
export const NEUTRAL_CHROMA = 20;

function channel(hex: string, index: number): number {
  return parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
}

function linear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** CIE L*a*b* of an sRGB hex, D65. */
export function lab(hex: string): { l: number; a: number; b: number } {
  const [r, g, b] = [0, 1, 2].map((i) => linear(channel(hex, i)));
  const x = (r! * 0.4124 + g! * 0.3576 + b! * 0.1805) / 0.95047;
  const y = r! * 0.2126 + g! * 0.7152 + b! * 0.0722;
  const z = (r! * 0.0193 + g! * 0.1192 + b! * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return { l: 116 * f(y) - 16, a: 500 * (f(x) - f(y)), b: 200 * (f(y) - f(z)) };
}

/** How much colour a pigment carries, as opposed to how light it is. */
export function chroma(hex: string): number {
  const { a, b } = lab(hex);
  return Math.hypot(a, b);
}

function isHex(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

/**
 * Above this CIE lightness a neutral all but disappears on the neutral mat:
 * Chinese White (L* 93) measured 1.04:1 against it, a leaf that read as an
 * outline still waiting to be coloured in. Warm Grey is 65, Cool Grey 62.
 */
export const PALE_LIGHTNESS = 88;

/**
 * The leaf's colours: the first swatch with colour in it, charged with the
 * swatch after it. A palette of neutrals keeps its first that can be seen on
 * the paper - a grey piece grows a grey leaf, which is the truth about it -
 * with any paler swatch it passed over charged in at the tip, as mist would
 * be. Only a palette with nothing darker than white grows a white leaf. No
 * palette at all returns null, and the drawing falls back to the subject's
 * own pigment.
 */
export function leafPigments(palette: readonly Swatch[]): LeafPigments | null {
  const usable = palette.filter((swatch) => isHex(swatch.hex));
  if (usable.length === 0) return null;
  const coloured = usable.findIndex((swatch) => chroma(swatch.hex) >= NEUTRAL_CHROMA);
  if (coloured !== -1) return { lead: usable[coloured]!, charge: usable[coloured + 1] ?? null };
  const seen = usable.findIndex((swatch) => lab(swatch.hex).l <= PALE_LIGHTNESS);
  if (seen <= 0) return { lead: usable[0]!, charge: usable[1] ?? null };
  return { lead: usable[seen]!, charge: usable[seen + 1] ?? usable[0]! };
}

/**
 * How opaque the body of a leaf is painted.
 *
 * Watercolour controls value by dilution, so a leaf is a wash, not a solid:
 * the darker the pigment, the more water, and the more paper shows through.
 * Ivory Black then reads as the warm grey of a thin black wash rather than a
 * hole in the tree, while a yellow stays bright enough to see on the paper.
 */
export function washStrength(hex: string): number {
  const { l } = lab(hex);
  return 0.6 + 0.32 * Math.min(1, Math.max(0, (l - 20) / 60));
}

/**
 * The same pigment, deeper: where it pools at the edge of a drying wash.
 * Mixed towards the app's ink rather than black, so it stays warm.
 */
export function pooled(hex: string, amount = 0.35): string {
  const ink = [46, 45, 41];
  return `#${[0, 1, 2]
    .map((i) => {
      const value = Math.round(channel(hex, i) * 255 + (ink[i]! - channel(hex, i) * 255) * amount);
      return value.toString(16).padStart(2, "0");
    })
    .join("")}`;
}
