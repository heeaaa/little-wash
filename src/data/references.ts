import type { PaintReference } from "@/lib/types";

import pear from "@/assets/refs/pear.svg";
import lemon from "@/assets/refs/lemon.svg";
import persimmon from "@/assets/refs/persimmon.svg";
import mug from "@/assets/refs/mug.svg";
import succulent from "@/assets/refs/succulent.svg";
import mushroom from "@/assets/refs/mushroom.svg";
import seashell from "@/assets/refs/seashell.svg";
import tulipBottle from "@/assets/refs/tulip-bottle.svg";
import paperBoat from "@/assets/refs/paper-boat.svg";
import teapot from "@/assets/refs/teapot.svg";
import cottage from "@/assets/refs/cottage.svg";
import cherries from "@/assets/refs/cherries.svg";

const SOURCE = "Original illustration for Little Wash - CC0 (prototype placeholder art)";

/**
 * Prototype catalogue. Deterministic and hand-authored so filtering, shuffle and
 * the daily pick are reproducible in tests. Every subject is chosen for
 * sketchability: a clear focal shape, minimal background, manageable in the
 * stated time. Artwork is original and labelled as placeholder.
 */
export const REFERENCES: PaintReference[] = [
  {
    id: "ripe-pear",
    title: "Ripe Pear",
    subject: "fruit",
    difficulty: "gentle",
    minutes: 6,
    prompt: "One pear, one wash. Let the colours meet while the paper is wet.",
    alt: "A single ripe pear, rounded and full at the base, in soft yellow-greens with a warm blush and a short stem and leaf.",
    palette: [
      { name: "Lemon Yellow", hex: "#dcd77e" },
      { name: "Sap Green", hex: "#8ea24a" },
      { name: "Yellow Ochre", hex: "#c69a52" },
    ],
    tip: "Drop the green into the still-wet yellow and tilt the paper - don't stir the two together.",
    source: SOURCE,
    art: pear,
  },
  {
    id: "lemon-sprig",
    title: "Lemon Sprig",
    subject: "botanical",
    difficulty: "gentle",
    minutes: 12,
    prompt: "A lemon and two leaves. A good study in a single warm yellow.",
    alt: "A bright lemon resting on a short sprig with two green leaves curving off to the left.",
    palette: [
      { name: "Cadmium Lemon", hex: "#f3d24f" },
      { name: "Olive Green", hex: "#8aa856" },
      { name: "Raw Sienna", hex: "#c98a3c" },
    ],
    tip: "Leave a soft white gap for the highlight rather than painting around it too tightly.",
    source: SOURCE,
    art: lemon,
  },
  {
    id: "autumn-persimmon",
    title: "Autumn Persimmon",
    subject: "fruit",
    difficulty: "gentle",
    minutes: 8,
    prompt: "A warm orange globe with a little green crown. Quick and cheerful.",
    alt: "A round orange persimmon with a four-pointed green calyx and short stem on top.",
    palette: [
      { name: "Cadmium Orange", hex: "#e07a33" },
      { name: "Scarlet", hex: "#c85f24" },
      { name: "Sap Green", hex: "#8a9a4a" },
    ],
    tip: "Start pale and warm, then charge one side with a stronger orange for the shadow while wet.",
    source: SOURCE,
    art: persimmon,
  },
  {
    id: "morning-mug",
    title: "Morning Mug",
    subject: "objects",
    difficulty: "gentle",
    minutes: 5,
    prompt: "A rounded mug and a curl of steam. Five minutes, one object.",
    alt: "A wide ceramic mug in muted blue-grey with a rounded handle and two thin wisps of steam rising.",
    palette: [
      { name: "Payne's Grey", hex: "#5f7079" },
      { name: "Cerulean", hex: "#9fb0b6" },
      { name: "Warm Grey", hex: "#c4b2a6" },
    ],
    tip: "Keep the steam almost dry - a nearly clean, barely-there stroke reads better than a solid line.",
    source: SOURCE,
    art: mug,
  },
  {
    id: "potted-succulent",
    title: "Potted Succulent",
    subject: "botanical",
    difficulty: "steady",
    minutes: 18,
    prompt: "A rosette of leaves in a little pot. Build it from the centre out.",
    alt: "A green succulent rosette of pointed leaves sitting in a terracotta pot.",
    palette: [
      { name: "Sap Green", hex: "#7fa25e" },
      { name: "Terre Verte", hex: "#a7c47d" },
      { name: "Burnt Sienna", hex: "#b96b45" },
    ],
    tip: "Vary the green leaf to leaf - a touch more blue on some, more yellow on others - so it doesn't go flat.",
    source: SOURCE,
    art: succulent,
  },
  {
    id: "two-toadstools",
    title: "Two Toadstools",
    subject: "botanical",
    difficulty: "steady",
    minutes: 15,
    prompt: "A tall cap and a small one. Practise the spotted red wash.",
    alt: "Two red-capped toadstool mushrooms with pale cream stems and small light spots, one tall and one short.",
    palette: [
      { name: "Vermilion", hex: "#c05a44" },
      { name: "Cream", hex: "#eadfce" },
      { name: "Burnt Umber", hex: "#8a5a3c" },
    ],
    tip: "Paint the cap and lift out the spots with a thirsty brush while the red is still damp.",
    source: SOURCE,
    art: mushroom,
  },
  {
    id: "scallop-shell",
    title: "Scallop Shell",
    subject: "creatures",
    difficulty: "steady",
    minutes: 15,
    prompt: "A fan of ridges from one hinge. A lesson in gentle radiating lines.",
    alt: "A fan-shaped scallop seashell in soft peach and sand tones, with ridges radiating from the hinge at the top.",
    palette: [
      { name: "Naples Yellow", hex: "#f0cdb4" },
      { name: "Light Red", hex: "#dd9f7f" },
      { name: "Raw Umber", hex: "#b98a6a" },
    ],
    tip: "Let the base wash dry fully, then draw the ridges with a fine damp brush so they don't bleed.",
    source: SOURCE,
    art: seashell,
  },
  {
    id: "tulip-in-a-bottle",
    title: "Tulip in a Bottle",
    subject: "still-life",
    difficulty: "steady",
    minutes: 20,
    prompt: "One stem, one glass. The bottle is mostly the paper you leave alone.",
    alt: "A single pink tulip on a green stem standing in a clear glass bottle suggested with pale grey edges.",
    palette: [
      { name: "Rose Madder", hex: "#d6607a" },
      { name: "Sap Green", hex: "#5f7e46" },
      { name: "Cool Grey", hex: "#cdd8dc" },
    ],
    tip: "Paint the glass with only a few grey edge strokes - the white paper does the rest of the work.",
    source: SOURCE,
    art: tulipBottle,
  },
  {
    id: "paper-boat",
    title: "Paper Boat",
    subject: "objects",
    difficulty: "gentle",
    minutes: 6,
    prompt: "A folded boat on a few ripples. Crisp folds, loose water.",
    alt: "A folded paper boat in pale blue-grey sitting on two rows of simple water ripples.",
    palette: [
      { name: "Cool Grey", hex: "#9fb2bb" },
      { name: "Cerulean", hex: "#8fb6c9" },
      { name: "Payne's Grey", hex: "#6d7d84" },
    ],
    tip: "Keep the fold lines sharp and dark, and let the water beneath stay light and broken.",
    source: SOURCE,
    art: paperBoat,
  },
  {
    id: "little-teapot",
    title: "Little Teapot",
    subject: "still-life",
    difficulty: "steady",
    minutes: 22,
    prompt: "A round pot, a spout and a handle. Watch the ellipses.",
    alt: "A round teal teapot with a curved spout on the right, a looping handle on the left, and a small knobbed lid.",
    palette: [
      { name: "Cobalt Teal", hex: "#8fb7b0" },
      { name: "Viridian", hex: "#6f9d95" },
      { name: "Payne's Grey", hex: "#5f8f87" },
    ],
    tip: "Get the lid and base ellipses agreeing before any colour - it's the drawing that sells a teapot.",
    source: SOURCE,
    art: teapot,
  },
  {
    id: "cottage-on-the-hill",
    title: "Cottage on the Hill",
    subject: "landscape",
    difficulty: "stretch",
    minutes: 35,
    prompt: "A house, a roof, a tree. A whole small scene to hold together.",
    alt: "A little cottage with a red pitched roof and blue windows on a low green hill, with a leafy tree standing to the right.",
    palette: [
      { name: "Terracotta", hex: "#b65f4a" },
      { name: "Olive Green", hex: "#8aa85c" },
      { name: "Slate Blue", hex: "#7c8bb0" },
      { name: "Raw Sienna", hex: "#c69a52" },
    ],
    tip: "Lay the sky and hill as one wet wash first, then let it dry before the roof and walls go on.",
    source: SOURCE,
    art: cottage,
  },
  {
    id: "bowl-of-cherries",
    title: "Bowl of Cherries",
    subject: "still-life",
    difficulty: "stretch",
    minutes: 30,
    prompt: "A cluster of cherries in a shallow bowl. Overlaps and cast shadows.",
    alt: "A shallow cream bowl holding a cluster of deep-red cherries with green stems arcing up out of the bowl.",
    palette: [
      { name: "Alizarin Crimson", hex: "#a02a40" },
      { name: "Scarlet", hex: "#c23c52" },
      { name: "Sap Green", hex: "#6d7d3a" },
      { name: "Warm Grey", hex: "#d9cdbb" },
    ],
    tip: "Leave a small white dot on each cherry and keep the shadowed ones cooler and darker for depth.",
    source: SOURCE,
    art: cherries,
  },
];
