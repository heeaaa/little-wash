/**
 * Matching a colour sampled from a photograph to a watercolour pigment.
 *
 * A painter cannot mix "#685342". They can reach for burnt umber. The palette
 * on a reference is a suggestion of what to squeeze onto the palette, so the
 * useful output of colour analysis is a pigment name, not a hex code.
 *
 * The hex values below are approximate masstones - what each pigment looks
 * like at full strength on white paper. They vary by brand, and a real tube
 * swatched out would differ. They are close enough to pick a sensible name
 * and to colour a 12px dot, which is all the app uses them for.
 */

export interface Pigment {
  name: string;
  hex: string;
  /** Rough family, used to keep a suggested palette from being all one note. */
  family: "yellow" | "red" | "blue" | "green" | "earth" | "neutral" | "violet";
}

/**
 * A working watercolour palette: the pigments a beginner is likely to own,
 * across a full range of hues plus the earths that do most of the work.
 */
export const PIGMENTS: readonly Pigment[] = [
  { name: "Lemon Yellow", hex: "#f2e55c", family: "yellow" },
  { name: "Cadmium Yellow", hex: "#f7c531", family: "yellow" },
  { name: "Yellow Ochre", hex: "#c69a52", family: "yellow" },
  { name: "Raw Sienna", hex: "#b57e3c", family: "earth" },
  { name: "Cadmium Orange", hex: "#e2702c", family: "red" },
  { name: "Burnt Sienna", hex: "#9c4c2b", family: "earth" },
  { name: "Burnt Umber", hex: "#6b432a", family: "earth" },
  { name: "Raw Umber", hex: "#7a6244", family: "earth" },
  { name: "Vandyke Brown", hex: "#4a3527", family: "earth" },
  { name: "Scarlet", hex: "#d43d2f", family: "red" },
  { name: "Cadmium Red", hex: "#c8322c", family: "red" },
  { name: "Alizarin Crimson", hex: "#9e2b3f", family: "red" },
  { name: "Rose Madder", hex: "#c86b82", family: "red" },
  { name: "Permanent Magenta", hex: "#9c3f78", family: "violet" },
  { name: "Dioxazine Violet", hex: "#5b3b78", family: "violet" },
  { name: "Ultramarine Blue", hex: "#2f4a9c", family: "blue" },
  { name: "Cobalt Blue", hex: "#3a6bb5", family: "blue" },
  { name: "Cerulean Blue", hex: "#4f93bd", family: "blue" },
  { name: "Prussian Blue", hex: "#1f4a5c", family: "blue" },
  { name: "Payne's Grey", hex: "#4a5a66", family: "neutral" },
  { name: "Indigo", hex: "#2e3f55", family: "blue" },
  { name: "Viridian", hex: "#2e7a63", family: "green" },
  { name: "Sap Green", hex: "#6f8f3a", family: "green" },
  { name: "Olive Green", hex: "#6b6f36", family: "green" },
  { name: "Hooker's Green", hex: "#3f6b45", family: "green" },
  { name: "Terre Verte", hex: "#6f8272", family: "green" },
  { name: "Naples Yellow", hex: "#e8d6a0", family: "yellow" },
  { name: "Warm Grey", hex: "#a89c8c", family: "neutral" },
  { name: "Cool Grey", hex: "#8e9699", family: "neutral" },
  { name: "Ivory Black", hex: "#33312c", family: "neutral" },
  { name: "Chinese White", hex: "#f0ece2", family: "neutral" },
];

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Lab {
  l: number;
  a: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const n = parseInt(match[1]!, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** sRGB to CIE L*a*b* through linear RGB and XYZ, D65. */
export function rgbToLab({ r, g, b }: Rgb): Lab {
  const linear = (channel: number): number => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };

  const rl = linear(r);
  const gl = linear(g);
  const bl = linear(b);

  // sRGB D65 matrix, normalised to the D65 white point.
  const x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
  const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175;
  const z = (rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041) / 1.08883;

  const f = (t: number): number =>
    t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;

  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/**
 * Perceptual distance, with lightness deliberately weighted down.
 *
 * Dilution is how a painter controls value in watercolour: the same pigment
 * runs from near-white to near-black out of one pan. So a sampled colour that
 * is much lighter than a pigment's masstone may still be that pigment, thinned.
 * Hue and chroma are what actually identify it.
 */
const LIGHTNESS_WEIGHT = 0.45;

export function pigmentDistance(a: Lab, b: Lab): number {
  const dl = (a.l - b.l) * LIGHTNESS_WEIGHT;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

export interface PigmentMatch {
  pigment: Pigment;
  /** Lower is closer. Useful for ordering, not for showing to anyone. */
  distance: number;
}

/** The closest pigment to a sampled colour. */
export function nearestPigment(rgb: Rgb): PigmentMatch {
  const lab = rgbToLab(rgb);
  let best: PigmentMatch | null = null;

  for (const pigment of PIGMENTS) {
    const pigmentRgb = hexToRgb(pigment.hex);
    if (!pigmentRgb) continue;
    const distance = pigmentDistance(lab, rgbToLab(pigmentRgb));
    if (!best || distance < best.distance) best = { pigment, distance };
  }

  // PIGMENTS is a non-empty literal, so this is unreachable in practice.
  return best ?? { pigment: PIGMENTS[0]!, distance: Number.POSITIVE_INFINITY };
}

/**
 * Turn sampled colours into a mixable palette.
 *
 * Two rules beyond nearest-match, both about being useful rather than
 * accurate: no pigment appears twice, and no more than two from the same
 * family, so a photograph of oranges does not suggest four yellows and
 * nothing to shade them with.
 */
export function suggestPalette(
  sampled: readonly Rgb[],
  limit = 4,
): Array<{ name: string; hex: string }> {
  const used = new Set<string>();
  const familyCount = new Map<string, number>();
  const out: Array<{ name: string; hex: string }> = [];

  for (const rgb of sampled) {
    if (out.length >= limit) break;

    // Walk outwards from the nearest until one is acceptable, so a crowded
    // family yields its second choice rather than dropping the colour.
    const ranked = PIGMENTS.map((pigment) => {
      const pigmentRgb = hexToRgb(pigment.hex);
      return {
        pigment,
        distance: pigmentRgb
          ? pigmentDistance(rgbToLab(rgb), rgbToLab(pigmentRgb))
          : Number.POSITIVE_INFINITY,
      };
    }).sort((a, b) => a.distance - b.distance);

    for (const { pigment } of ranked) {
      if (used.has(pigment.name)) continue;
      if ((familyCount.get(pigment.family) ?? 0) >= 2) continue;
      used.add(pigment.name);
      familyCount.set(pigment.family, (familyCount.get(pigment.family) ?? 0) + 1);
      out.push({ name: pigment.name, hex: pigment.hex });
      break;
    }
  }

  return out;
}
