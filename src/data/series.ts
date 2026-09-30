/**
 * Small themed series: a few pieces around one theme, in the order they are
 * meant to be painted.
 *
 * Not a collection. A collection is a lens onto the catalogue - a saved filter
 * or an unordered list - and the filters narrow inside it. A series is a short,
 * fixed run with its size in its name, so it is never filtered: narrowing
 * "Seven tiny skies" to the four under twenty minutes would break both the
 * order and the title.
 *
 * The order is the curation: each run starts with the fewest shapes and
 * builds from there. It is a suggestion, not a gate - every piece is open from
 * the start, nothing unlocks, and nothing is scheduled. "A week of leaves" is
 * seven leaves, not a seven-day plan.
 *
 * `src/data/series.test.ts` holds every entry to that: the pieces exist in the
 * shipped catalogue, none repeats, and the number in a title matches the
 * number of pieces.
 */

export interface Series {
  /** Stable and URL-safe: it is the address of the series page. */
  id: string;
  /** Carries the size of the series, in words. */
  title: string;
  /** What the run is and how to approach it. Sits under the title. */
  blurb: string;
  /** Pigment CSS var used to colour-code the series, as collections are. */
  pigmentVar: string;
  /** The pieces, in the order they are meant to be painted. */
  pieceIds: readonly string[];
}

export const SERIES: readonly Series[] = [
  {
    id: "seven-tiny-skies",
    title: "Seven tiny skies",
    blurb:
      "One graded wash to begin, then a boat, hills, clouds and a bird. Paint them small, postcard size or less, and each sky goes down in one wet pass.",
    pigmentVar: "--pig-landscape",
    pieceIds: [
      "gradient-sky-6851",
      "sailboat-under-a-sunset-6154",
      "seascape-5958",
      "sunrise-with-mountain-2289",
      "ocean-scene-8629",
      "grassy-field-under-a-cloudy-sky-1531",
      "roller-against-a-sunset-2714",
    ],
  },
  {
    id: "a-week-of-leaves",
    title: "A week of leaves",
    blurb:
      "Seven single leaves, simplest first, from a pale heart-shaped leaf to a whole small plant in a museum watercolour.",
    pigmentVar: "--pig-botanical",
    pieceIds: [
      "pale-heart-shaped-leaf-Oibw",
      "striped-calathea-leaf-9660",
      "pink-leaf-on-teal-YIvo",
      "fern-leaf-3742",
      "fern-6926",
      "green-maple-leaf-8491",
      "woodland-plant-study-2547",
    ],
  },
  {
    id: "six-fruit-cross-sections",
    title: "Six fruit cross-sections",
    blurb:
      "Fruit cut open, from two halves on a plain ground to a table full of them. Leave the white pith as paper and paint each segment as its own small wash.",
    pigmentVar: "--pig-fruit",
    // The two rated "a stretch" close the run, after the steady ones.
    pieceIds: [
      "colorful-grapefruit-and-lemon-half-on-a-vibrant--3606",
      "bright-orange-slices-and-green-leaves-on-a-yello-8253",
      "bright-and-juicy-slices-of-grapefruit-and-orange-3306",
      "vibrant-close-up-of-sliced-citrus-and-kiwi-fruit-4126",
      "colorful-orange-slices-on-a-contrasting-green-an-8284",
      "vibrant-halves-of-citrus-fruits-including-orange-1831",
    ],
  },
];

/** The query parameter that keeps a piece in its series on Detail. */
export const SERIES_PARAM = "series";
