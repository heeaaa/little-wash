import type { Swatch } from "@/lib/types";
import { INSPIRATION_PHOTOS, type InspirationPhoto } from "@/data/inspiration";

export type ExerciseKind = "brushwork" | "colour";

/** One authored illustration per variation. See ExerciseArt. */
export type ExerciseArtId =
  | "blooms-classic"
  | "blooms-flowers"
  | "blooms-clouds"
  | "blooms-puddles"
  | "wheel-classic"
  | "wheel-tree"
  | "wheel-feathers"
  | "values-classic"
  | "values-mountains"
  | "values-trees"
  | "values-sky"
  | "values-moons"
  | "mix-classic"
  | "mix-leaves"
  | "mix-teardrops"
  | "mix-petals"
  | "graded-classic"
  | "graded-sky"
  | "graded-sunset"
  | "graded-mist";

/**
 * One way to paint a warm-up. Every variation teaches the same technique as
 * its warm-up through a different composition, so each carries its own
 * colours, steps and tip rather than borrowing the classic's.
 */
export interface ExerciseVariation {
  id: string;
  /** Short enough to sit under a thumbnail. */
  name: string;
  /** What you will practise, in a sentence. */
  summary: string;
  minutes: number;
  colours: Swatch[];
  /** How flexible the colours are, so nobody goes shopping first. */
  colourNote: string;
  materials: string[];
  /** Three to five, each one thing to do. */
  steps: string[];
  /** One practical tip, or what to notice as it dries. */
  notice: string;
  art: ExerciseArtId;
  /** Describes the illustrated example, for someone who cannot see it. */
  artAlt: string;
  /** A real photograph to look at, where one helps. Never the example. */
  photo?: InspirationPhoto;
}

export interface Exercise {
  id: string;
  title: string;
  kind: ExerciseKind;
  /** The skill this warm-up trains, whichever variation is chosen. */
  focus: string;
  pigmentVar: string;
  /** The first is the classic exercise and the default. */
  variations: readonly [ExerciseVariation, ...ExerciseVariation[]];
}

const PAPER = "Watercolour paper, or the thickest paper you have";
const BRUSH = "A round brush - a size 8 to 12, or whatever you have";
const WATER = "Two jars of water: one for rinsing, one kept clean";
const TOWEL = "A paper towel or rag";
const PENCIL = "A pencil for light guide marks";

/*
  Colours are named as a painter would find them on a pan, with a display hex
  for the swatch only. They match the illustrations, so what the example shows
  is what the list suggests.
*/
const CERULEAN: Swatch = { name: "Cerulean", hex: "#3f86b0" };
const ULTRAMARINE: Swatch = { name: "Ultramarine", hex: "#3f4d8c" };
const ROSE: Swatch = { name: "Rose Madder", hex: "#c65a67" };
const LEMON: Swatch = { name: "Lemon Yellow", hex: "#e3c34a" };
const SAP: Swatch = { name: "Sap Green", hex: "#6e8c4a" };
const SIENNA: Swatch = { name: "Burnt Sienna", hex: "#b0623c" };
const GAMBOGE: Swatch = { name: "New Gamboge", hex: "#e2a33a" };
const PAYNES: Swatch = { name: "Payne's Grey", hex: "#4c566a" };
const HOOKERS: Swatch = { name: "Hooker's Green", hex: "#3d6a4c" };
const SEPIA: Swatch = { name: "Sepia", hex: "#5b4636" };

const WHEEL_COLOURS: Swatch[] = [LEMON, ROSE, { name: "Cerulean", hex: "#3f77a8" }];
const WHEEL_NOTE =
  "Any yellow, red and blue will make a wheel. A cool yellow, a pinkish red and a mid blue give the cleanest mixes.";

/**
 * Short, pressure-free warm-ups. Brushwork trains the hand; colour trains the
 * eye. No scores, no streaks - a few minutes to loosen up before a study.
 */
export const EXERCISES: Exercise[] = [
  {
    id: "wet-on-wet-blooms",
    title: "Wet-on-wet blooms",
    kind: "brushwork",
    focus: "Soft edges, and letting the water do the work",
    pigmentVar: "--pig-still-life",
    variations: [
      {
        id: "classic-blooms",
        name: "Classic blooms",
        summary: "Let two colours meet on wet paper and watch them bleed into a third.",
        minutes: 5,
        colours: [CERULEAN, ROSE],
        colourNote: "Any blue and any pink or red will do.",
        materials: [PAPER, BRUSH, WATER, TOWEL],
        steps: [
          "Wet a palm-sized patch of paper with clean water until it has an even shine, with no puddles.",
          "Load your brush with blue and touch the tip into the wet patch. Let it spread on its own.",
          "Rinse, load the rose and touch it in beside the blue so the two edges meet.",
          "Tilt the paper gently and let them mix. Don't brush - just watch.",
        ],
        notice:
          "The shinier the paper, the further the colour travels. As the shine fades to a satin sheen, blooms stay smaller and closer.",
        art: "blooms-classic",
        artAlt:
          "Illustrated example: a soft blue bloom and a soft rose bloom meeting in the middle, where they blend into violet with no hard edge.",
      },
      {
        id: "loose-flowers",
        name: "Loose flowers",
        summary: "Drop colour into small wet circles so each bloom becomes a soft flower head.",
        minutes: 10,
        colours: [ROSE, SAP],
        colourNote: "Any pink, red or violet for the flowers, and any green for the stems.",
        materials: [PAPER, BRUSH, WATER, TOWEL],
        steps: [
          "Wet three circles about the size of a coin, leaving dry paper between them.",
          "Drop rose into each wet circle and let it spread to the edge.",
          "While they're still damp, touch a stronger dot of rose into the middle of each.",
          "Let the flowers dry completely. Leave them alone while they do.",
          "On dry paper, paint thin green stems up to each flower, and a leaf or two.",
        ],
        notice:
          "Soft edges happen on wet paper and crisp edges on dry. The contrast between the soft flowers and the sharp stems is what makes them read as petals.",
        art: "blooms-flowers",
        artAlt:
          "Illustrated example: three soft rose flower heads with darker centres, on thin crisp green stems with two small leaves.",
      },
      {
        id: "soft-clouds",
        name: "Soft clouds",
        summary: "Paint a wet blue sky around a few shapes of bare paper, and let them soften into clouds.",
        minutes: 8,
        colours: [CERULEAN, SIENNA],
        colourNote: "Any blue. A touch of brown or orange mixed into the blue makes a soft cloud grey.",
        materials: [PAPER, BRUSH, WATER, TOWEL],
        steps: [
          "Wet a wide band across the top of your paper.",
          "Drop blue into the wet paper around two or three rounded shapes, leaving those shapes unpainted.",
          "While it's wet, touch a little blue-grey along the bottom of each cloud.",
          "If a cloud fills in, dab it gently with a scrunched paper towel to lift the colour.",
        ],
        notice:
          "The clouds are the paper you didn't paint. Leave more white than feels right, because the blue creeps in as it dries.",
        art: "blooms-clouds",
        artAlt:
          "Illustrated example: a soft blue sky with three rounded clouds of bare white paper, each with a faint grey shadow along its base.",
        photo: INSPIRATION_PHOTOS["soft-clouds"],
      },
      {
        id: "abstract-puddles",
        name: "Abstract puddles",
        summary: "Pool three colours on very wet paper and let them run into each other, with no subject at all.",
        minutes: 5,
        colours: [LEMON, ROSE, ULTRAMARINE],
        colourNote: "Any three colours you enjoy. Colours from different families give the most surprising mixes.",
        materials: [PAPER, BRUSH, WATER, TOWEL],
        steps: [
          "Wet a shape of any size generously - a puddle, not just a shine.",
          "Drop in three colours at different points, a little apart.",
          "Tilt the paper one way, then another, and watch where the colour runs.",
          "Lay it flat to dry and see what the edges did.",
        ],
        notice:
          "Frilly, cauliflower-like edges appear when wetter paint runs back into paint that's starting to dry. Here they're a feature, not a mistake.",
        art: "blooms-puddles",
        artAlt:
          "Illustrated example: yellow, rose and blue pools running into each other, with orange, violet and green where they meet and frilly edges.",
      },
    ],
  },
  {
    id: "three-colour-wheel",
    title: "Three-colour wheel",
    kind: "colour",
    focus: "Hue order, and which mixes stay clean",
    pigmentVar: "--pig-fruit",
    variations: [
      {
        id: "classic-wheel",
        name: "Classic wheel",
        summary: "Mix a full ring of six colours from just three primaries.",
        minutes: 15,
        colours: WHEEL_COLOURS,
        colourNote: WHEEL_NOTE,
        materials: [PAPER, BRUSH, WATER, PENCIL],
        steps: [
          "Lightly pencil a circle with six spots around it, like the 12, 2, 4, 6, 8 and 10 on a clock.",
          "Paint yellow at 12, red at 4 and blue at 8.",
          "Mix yellow and red for orange at 2, red and blue for violet at 6, and blue and yellow for green at 10.",
          "If a mix leans too far one way, add a touch of the other colour until it sits halfway.",
          "Mix a little of all three in the middle to see the soft brown-grey they make together.",
        ],
        notice:
          "Some mixes stay bright and some turn muddy. A pinkish red makes a much cleaner violet than an orangey one.",
        art: "wheel-classic",
        artAlt:
          "Illustrated example: six round dabs on a faint pencil circle - yellow, orange, red, violet, blue and green in order - with a small brown-grey dab in the centre.",
      },
      {
        id: "colour-wheel-tree",
        name: "Colour-wheel tree",
        summary: "Paint a round tree whose leaves run through the wheel in order.",
        minutes: 15,
        colours: WHEEL_COLOURS,
        colourNote: WHEEL_NOTE,
        materials: [PAPER, BRUSH, WATER, PENCIL],
        steps: [
          "Mix all three primaries into a brown and paint a simple trunk with two short branches. Let it dry.",
          "Lightly pencil a circle for the crown above the trunk.",
          "Paint leaves round the circle in order: yellow, orange, red, violet, blue, green and back to yellow.",
          "Between each pair, mix the in-between colour on your palette and add a leaf in it.",
        ],
        notice:
          "The trunk is all three primaries mixed together, which is where browns and greys come from. Each leaf should look as if it belongs between its neighbours.",
        art: "wheel-tree",
        artAlt:
          "Illustrated example: a brown trunk with a round crown of twelve leaves that run yellow, orange, red, violet, blue, green and back to yellow.",
      },
      {
        id: "feather-wheel",
        name: "Feather wheel",
        summary: "Fan six feathers from a centre point, each one the next colour round the wheel.",
        minutes: 15,
        colours: WHEEL_COLOURS,
        colourNote: WHEEL_NOTE,
        materials: [PAPER, BRUSH, WATER, PENCIL],
        steps: [
          "Pencil a small centre dot and six lines fanning out from it, evenly spaced.",
          "Paint a feather along each line: press the brush down at the centre, then lift as you pull out to a point.",
          "Go round in order - yellow, orange, red, violet, blue, green - mixing each in-between feather from its neighbours.",
          "Once dry, add a thin, stronger line down the middle of each feather in its own colour.",
        ],
        notice:
          "Feathers opposite each other are complements: yellow and violet, orange and blue, red and green. Mix a pair and you'll get a soft grey.",
        art: "wheel-feathers",
        artAlt:
          "Illustrated example: six pointed feathers radiating from a centre dot, coloured yellow, orange, red, violet, blue and green in order, each with a darker middle line.",
      },
    ],
  },
  {
    id: "value-ladder",
    title: "Value ladder",
    kind: "brushwork",
    focus: "Clear steps from light to dark",
    pigmentVar: "--pig-objects",
    variations: [
      {
        id: "classic-squares",
        name: "Classic squares",
        summary: "Step one colour from pale to dark across five even squares.",
        minutes: 10,
        colours: [ULTRAMARINE],
        colourNote: "Any colour that can go dark: Payne's Grey, Indigo, or a blue with a touch of brown. Yellow can't get dark enough.",
        materials: [PAPER, BRUSH, WATER, PENCIL],
        steps: [
          "Draw five squares in a row, each about the size of a stamp.",
          "Paint the last square with your darkest mix - plenty of paint, very little water.",
          "Paint the first with the palest wash that still shows - mostly water.",
          "Fill the middle three so each is an even step between its neighbours.",
          "When it's dry, squint. If two squares look the same, darken the one on the right.",
        ],
        notice:
          "Watercolour dries lighter than it looks wet, often by a whole step. Make the darks darker than seems sensible.",
        art: "values-classic",
        artAlt:
          "Illustrated example: five blue squares in a row, stepping evenly from very pale on the left to deep blue on the right.",
      },
      {
        id: "layered-mountains",
        name: "Layered mountains",
        summary: "Paint five ridges, one over the next, each a step darker as they come closer.",
        minutes: 12,
        colours: [PAYNES],
        colourNote: "Any dark colour. A blue with a touch of brown makes a lovely misty grey.",
        materials: [PAPER, BRUSH, WATER, "A hair dryer, if you'd rather not wait between layers"],
        steps: [
          "Paint the furthest ridge across the top with your palest wash, down to the bottom of the paper. Let it dry.",
          "Paint the next ridge a little lower and a step darker, over the first. Let it dry.",
          "Repeat until you have five ridges, with the closest and darkest at the bottom.",
          "Keep each ridge line simple: a few peaks and dips are plenty.",
        ],
        notice:
          "Distance reads as paleness. Each ridge only has to be one step darker than the one behind it for the whole range to recede.",
        art: "values-mountains",
        artAlt:
          "Illustrated example: five grey mountain ridges stacked from the top down, the furthest palest and each nearer ridge a step darker.",
        photo: INSPIRATION_PHOTOS["layered-mountains"],
      },
      {
        id: "tree-row",
        name: "Row of trees",
        summary: "Paint five simple pine trees, stepping from palest to darkest along the row.",
        minutes: 10,
        colours: [HOOKERS],
        colourNote: "Any dark green, or a strong mix of blue and yellow.",
        materials: [PAPER, BRUSH, WATER, PENCIL],
        steps: [
          "Lightly mark five tree shapes in a row: a tall triangle on a short trunk is plenty.",
          "Paint the first tree with the palest green wash.",
          "Paint each next tree a step darker, finishing with your darkest mix.",
          "Once dry, add a small trunk under each tree in the same value as its tree.",
        ],
        notice:
          "Simple shapes leave you judging only the value. Squint at the row: it should step down evenly, with no two trees matching.",
        art: "values-trees",
        artAlt:
          "Illustrated example: five green pine trees in a row, from very pale on the left to deep green on the right.",
      },
      {
        id: "sky-bands",
        name: "Sky bands",
        summary: "Stack five flat bands of sky from deep at the top to pale at the horizon.",
        minutes: 10,
        colours: [ULTRAMARINE],
        colourNote: "Any blue, or any colour you'd like your sky to be.",
        materials: [PAPER, BRUSH, WATER, PENCIL],
        steps: [
          "Pencil five bands across the page, each about a finger wide.",
          "Paint the top band in your darkest blue, one flat, even value. Let it dry.",
          "Paint each band below a step paler, letting each dry before the next touches it.",
          "Finish at the bottom with the palest wash.",
        ],
        notice:
          "Unlike a graded wash, each band is one flat value with a crisp edge: a ladder you can see the rungs of.",
        art: "values-sky",
        artAlt:
          "Illustrated example: five horizontal blue bands stacked with thin gaps, deep blue at the top stepping evenly to very pale at the bottom.",
      },
      {
        id: "moons",
        name: "Circles and moons",
        summary: "Paint five round moons, each a step darker, in a gentle arc.",
        minutes: 10,
        colours: [SEPIA],
        colourNote: "Any colour that can go dark. Sepia, Payne's Grey and Indigo all make good moons.",
        materials: [PAPER, BRUSH, WATER, "A coin or bottle cap to trace round"],
        steps: [
          "Trace five circles in a gentle arc, like a moon rising and setting.",
          "Paint the first with your palest wash and the last with your darkest.",
          "Fill the middle three in even steps between them.",
          "Try to paint each circle in one pass, starting at the top and working round, so you don't leave streaks.",
        ],
        notice:
          "Round shapes make uneven paint easy to spot. A well-loaded brush and one steady pass keep each moon flat.",
        art: "values-moons",
        artAlt:
          "Illustrated example: five sepia circles in a gentle arc, from very pale on the left to deep brown on the right.",
      },
    ],
  },
  {
    id: "two-colour-mixing-strip",
    title: "Two-colour mixing strip",
    kind: "colour",
    focus: "How changing the proportions changes the colour",
    pigmentVar: "--pig-creatures",
    variations: [
      {
        id: "classic-strip",
        name: "Classic strip",
        summary: "Walk one colour into another in five steps, shifting the mix a little each time.",
        minutes: 10,
        colours: [SAP, SIENNA],
        colourNote: "Any two colours. Colours that sit far apart on the wheel make the most interesting middles.",
        materials: [PAPER, BRUSH, WATER, PENCIL],
        steps: [
          "Draw five boxes in a row.",
          "Paint pure green in the first box and pure sienna in the last.",
          "For the middle box, mix the two about half and half.",
          "For the second box, mix mostly green with a little sienna. For the fourth, mostly sienna with a little green.",
          "Stand back: the strip should read as a smooth journey from one end to the other.",
        ],
        notice:
          "The half-and-half mix rarely sits in the exact middle, because one colour is usually stronger. Add the stronger one in smaller touches.",
        art: "mix-classic",
        artAlt:
          "Illustrated example: five boxes shifting from sap green on the left, through olive and golden brown, to burnt sienna on the right.",
      },
      {
        id: "turning-leaves",
        name: "Turning leaves",
        summary: "Paint five leaves down a stem, turning from green to autumn one mix at a time.",
        minutes: 10,
        colours: [SAP, SIENNA],
        colourNote: "Any green and any orange-brown or red.",
        materials: [PAPER, BRUSH, WATER, TOWEL],
        steps: [
          "Paint a thin curving stem in a mix of both colours.",
          "Paint the top leaf pure green: press the brush down, then lift as you pull to the tip.",
          "For each leaf further down, add a little more sienna to the mix.",
          "Finish with the bottom leaf in pure sienna.",
        ],
        notice:
          "This is the season turning in five steps. The halfway leaf, an olive-brown, is often the loveliest colour on the page.",
        art: "mix-leaves",
        artAlt:
          "Illustrated example: a curving stem with five leaves, green at the top turning through olive and gold to burnt sienna at the bottom.",
      },
      {
        id: "teardrops",
        name: "Teardrops",
        summary: "Drop a row of seven teardrops, each a slightly different mix of blue and yellow.",
        minutes: 8,
        colours: [ULTRAMARINE, LEMON],
        colourNote: "Any blue and any yellow. The middle drops show you every green in between.",
        materials: [PAPER, BRUSH, WATER, TOWEL],
        steps: [
          "Load your brush with pure blue. Touch the tip down, press, then lift to leave a teardrop.",
          "Rinse lightly, add a touch of yellow to the blue on your palette, and paint the next drop beside it.",
          "Keep shifting the mix towards yellow, one drop at a time.",
          "End with a drop of pure yellow.",
        ],
        notice:
          "Mix on the palette, not the paper, so every drop is one even colour. Seeing the steps side by side shows you how much 'a little' really is.",
        art: "mix-teardrops",
        artAlt:
          "Illustrated example: seven teardrops in a row, from ultramarine blue through teal and green to lemon yellow.",
      },
      {
        id: "petals",
        name: "Petals",
        summary: "Paint a five-petal flower where each petal is a new mix of rose and yellow.",
        minutes: 10,
        colours: [ROSE, LEMON],
        colourNote: "Any pink or red and any yellow.",
        materials: [PAPER, BRUSH, WATER, PENCIL],
        steps: [
          "Mark a small centre and five petal positions around it.",
          "Paint the first petal pure rose, pressing the brush flat and lifting to a rounded tip.",
          "Going round, add a little more yellow to the mix for each petal.",
          "Paint the fifth petal almost all yellow. Once dry, dot the centre with a mix of both.",
        ],
        notice:
          "Rose is strong and yellow is weak: it takes a lot of yellow to move rose, and only a touch of rose to move yellow.",
        art: "mix-petals",
        artAlt:
          "Illustrated example: a five-petal flower whose petals go round from rose through coral and peach to lemon yellow, with an orange centre.",
      },
    ],
  },
  {
    id: "graded-wash",
    title: "Graded wash",
    kind: "brushwork",
    focus: "One smooth, even transition",
    pigmentVar: "--pig-botanical",
    variations: [
      {
        id: "classic-rectangle",
        name: "Classic rectangle",
        summary: "Fade one colour smoothly from deep at the top to almost nothing at the bottom.",
        minutes: 10,
        colours: [SAP],
        colourNote: "Any single colour. Transparent colours such as a green, a blue or a rose grade most smoothly.",
        materials: [PAPER, BRUSH, WATER, "A book to tilt your paper on"],
        steps: [
          "Tilt your paper slightly towards you so paint gathers in a bead along the bottom of each stroke.",
          "Load the brush fully and paint a strong band across the top of a pencilled rectangle.",
          "Dip the brush in clean water, then paint the next band, just catching the bead above.",
          "Keep adding water with each band until the brush is nearly clean and the colour disappears.",
          "Soak up the last bead with a damp, squeezed-out brush.",
        ],
        notice:
          "The bead along the bottom edge is what keeps it smooth. Keep it moving - if it dries between strokes, you'll get a line.",
        art: "graded-classic",
        artAlt:
          "Illustrated example: a rectangle of sap green that is strong at the top and fades evenly to almost white at the bottom.",
      },
      {
        id: "fading-sky",
        name: "Fading sky",
        summary: "Grade a blue sky from deep overhead to pale at the horizon, then add a strip of land.",
        minutes: 8,
        colours: [CERULEAN, PAYNES],
        colourNote: "Any blue for the sky. Ultramarine gives a deeper sky, Cerulean a lighter one. Any dark for the land.",
        materials: [PAPER, BRUSH, WATER, "A book to tilt your paper on"],
        steps: [
          "Pencil a low horizon line.",
          "Lay a strong band of blue across the top of the page.",
          "Work down, adding water with each band, so the blue fades out just above the horizon.",
          "Once dry, paint a thin, dark strip of land along the horizon.",
        ],
        notice:
          "Real skies are deepest overhead and palest at the horizon. It's the same wash as the classic, turned into weather.",
        art: "graded-sky",
        artAlt:
          "Illustrated example: a blue sky that is deep at the top and fades to white at a low horizon, above a thin dark strip of land.",
        photo: INSPIRATION_PHOTOS["fading-sky"],
      },
      {
        id: "sunset-wash",
        name: "Sunset wash",
        summary: "Grade from rose into gold in one wash, so the two colours melt rather than stripe.",
        minutes: 10,
        colours: [ROSE, GAMBOGE],
        colourNote: "Any warm pink or red and any warm yellow. Mix both puddles before you start.",
        materials: [PAPER, BRUSH, WATER, "A book to tilt your paper on"],
        steps: [
          "Mix two puddles before you start: one rose, one gold.",
          "Lay rose across the top and work down, catching the bead each time.",
          "Halfway down, start picking up gold instead, so the colours blend in the bead.",
          "Finish in pale gold near the bottom. Once dry, a low strip of dark hills makes it a sunset.",
        ],
        notice:
          "There's no time to mix once the bead is moving, which is why both puddles come first. Where the colours meet, they should melt, not stripe.",
        art: "graded-sunset",
        artAlt:
          "Illustrated example: a wash that shades from rose at the top through coral into gold, above a low dark silhouette of hills and a small tree.",
        photo: INSPIRATION_PHOTOS["sunset-wash"],
      },
      {
        id: "misty-landscape",
        name: "Misty landscape",
        summary: "Grade a soft grey sky, then fade two hills downwards into mist.",
        minutes: 12,
        colours: [ULTRAMARINE, SIENNA],
        colourNote: "A blue with a touch of brown makes a soft grey. Payne's Grey on its own works too.",
        materials: [PAPER, BRUSH, WATER, TOWEL],
        steps: [
          "Grade a pale blue-grey wash from the top of the page down to nearly clear. Let it dry.",
          "Paint a far hill in a pale wash, then soften its lower edge with a damp brush so it fades away.",
          "Paint a nearer hill a little darker and lower, fading it downwards the same way.",
          "Leave the bottom of the page almost white. That's the mist.",
        ],
        notice:
          "Each hill is a tiny graded wash from its ridge down into nothing. The softer the fade, the thicker the mist looks.",
        art: "graded-mist",
        artAlt:
          "Illustrated example: a pale grey sky over two blue-grey hills, the far one paler, each fading downwards into white mist.",
        photo: INSPIRATION_PHOTOS["misty-landscape"],
      },
    ],
  },
];
