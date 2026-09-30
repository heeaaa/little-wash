# Plan and record: the painted tree

_Roadmap item 3 in DESIGN.md, "Artistic progress tracking (celebratory, never
punishing)". Planned and built 30/09-01/10/2026 on `feat/artistic-progress`,
cut from `main` at `30a84c4` once `feat/small-series` had merged. Built with
Impeccable's delight (the thesis) and overdrive (the craft) at the user's
request. The rules it keeps are in DESIGN.md, "The painted tree"; this file is
the plan, the decisions and the evidence._

## Thesis

Every piece marked painted grows one leaf on a little tree in the studio,
washed in that piece's own colours. Opening the studio after painting, the new
leaf arrives the way watercolour does: a twig reaches out, the brush presses the
leaf in, the shine goes off and the pigment settles darker at its edge as it
dries lighter. Tap a leaf and it stirs and says which piece it was. Time passing
never changes the tree; only painting does.

The feeling is flipping back through your own sketchbook - "look what I've
made", never a ledger.

## Decisions

The user asked for the plan to be followed by implementation without a round of
questions, so these were made here and are recorded so they can be revisited.

| Decision | Choice | Why |
| --- | --- | --- |
| Motif | A tree, leaf by leaf (the brief's first option) | Honey is not this product's material; a tree grows, where a vessel fills |
| Leaf shape | A one-stroke brush leaf, pressed and lifted | A real watercolour technique; the same material as the header's swatches |
| Leaf colour | First palette swatch with CIE chroma >= 20, charged with the next swatch at the tip | 70 of 189 pieces open on a grey, black or white; the first swatch would make a grey tree |
| No palette (4 pieces) | The subject's pigment | A design-system colour, not an invented one |
| Growth | Size follows the leaf count; new growth only at the edge | A full-size bare tree with three leaves reads as empty and waiting - a target |
| Framing | Fitted to the tree, centred on the trunk | No empty page showing room still to fill |
| Where | Heads the studio's Painted section | Register rule 6: nothing in the chrome; Saved stays first |
| Arrival | Once per leaf, when the drawing is half on screen; the newest six at most | Delight must survive the hundredth visit |
| Empty state | Unchanged - no tree, no bare branch, no seed | A bare tree is a winter tree, and reads as loss |
| Detail, Today | Untouched | The tree is found in the studio, not advertised as a reward for marking |

Considered and not chosen: a phyllotaxis bloom of petals (abstract, and too
close to the brand mark, which is never redrawn); a washing line of papers (a
progress bar by another name); a rinse jar that clouds (muddy, and it fills).

## What changed while building it, and why

Each of these was found by measuring or looking, not by reasoning.

1. **The shape.** Symmetric forks (the first model) made a flat acacia
   umbrella; steering twigs outward from a centre split the crown in two. A
   leader that carries on nearly straight with a lateral to alternating sides
   (Honda's model) gave a round crown from about fifty leaves. Contact sheets at
   1-400 leaves: `Claude outputs/artistic-progress/growth-*.png`.
2. **Bare limbs.** Branches born at full length left long bare limbs at the
   first fork. Branches now start at 38% of their length and grow as the tree
   ages, so a sapling is compact.
3. **Stranded leaves.** The stem's first leaves sat mid-trunk on a grown tree;
   they now sit near its top, inside the crown.
4. **Muddy crowns.** Multiply blending turned a dense crown to mud and made
   Ivory Black leaves holes. Leaves are now washes: thinner the darker the
   pigment, with the pigment pooled at the rim.
5. **The first leaf's stem never grew.** The trunk's id is `""`, which is
   falsy, so `newTwig ? ...` skipped it. Found in arrival frames; a component
   test went red on it (`expected 0 to have a length of 1`), then green.
6. **Choosing a leaf was slow.** Pixel 7 profile, 4x CPU throttle, 189 leaves:
   658-796ms from tap to second frame. Traced, in order of what it bought:
   - `toLocaleDateString` built a new formatter for every leaf name on every
     render: formatters are now made once and the names memoised.
   - A turbulence filter over the whole drawing was re-rasterised on every
     tap: the hand-drawn wobble is now seeded geometry.
   - ~1,250 SVG elements: now ~190 (one path per leaf in tree coordinates,
     branches merged into two paths), memoised so a tap flips two leaves.
   - Non-scaling strokes on every leaf doubled hit testing: the rim width is
     now set once, in tree units.
   - Hit testing walked the listbox's 189 hidden labels on every pointer move
     (50-75ms a move): the listbox now takes no pointer; the stage beneath it
     does the choosing, and hover is drawn without re-rendering.
   Result: 160-232ms interaction (Event Timing) at 189 leaves and 64-128ms at
   40, where the studio's own grid of 189 cards is most of what is left.
7. **Tablet.** Stacked at 768 the tree was 720px wide with its card stranded
   below; the drawing sits beside its card from `md`.
8. **Targets.** The leaf card's title was 22.5px tall; it is now the row's one
   link (`.card-link`), 358x70 at 390px wide.

## Acceptance criteria and status

1. One leaf per painted piece, in that piece's colours; none painted shows
   today's empty state. **Met** - component, studio and e2e tests.
2. A complete-looking plant at every count; no bare branch or empty place.
   **Met** - `tree.test.ts` checks every count 1-250; contact sheets 1-400.
3. Adding a leaf never removes or reshapes one; time passing changes nothing.
   **Met** - prefix tests across 1-250; identical drawing a year apart.
4. Chosen by tap, mouse and keyboard; the card names the piece and date and
   opens it. **Met** - component and e2e tests on three projects.
5. A new leaf arrives once, only on screen, never after, never under reduced
   motion. **Met** - e2e with a phase recorder that proves "never arrived".
6. No axe violations; one tab stop; visible focus; 44px targets; screen reader
   hears piece, colour and date. **Met** - axe with 60 leaves on three projects;
   focus ring measured 3px teal; targets measured.
7. No horizontal scroll at 390, 768, 863x360 and 1440; smooth arrival on a
   throttled phone. **Met** - measured; arrival median frame 16.7ms.
8. Every register rule asserted by a test. **Met** - see DESIGN.md rules 1-8.

## Tests

- `src/lib/tree.test.ts` (27): exact counts, determinism, unbounded growth;
  never punishing (every leaf keeps its branch and shape, every branch stays,
  no leaf moves more than 8% of the frame - measured 7.06% - and the tree never
  shrinks); no targets (no bare branch, at every count); structure (branches
  join, leaves sit on their branch, pipe-model widths, nothing below ground,
  balanced within one leaf at every count); framing; outlines.
- `src/lib/leafColour.test.ts` (14): chroma, the neutral threshold, fallbacks,
  no invisible white leaf where a grey will do, and the whole shipped catalogue
  painted only in its own palettes.
- `src/lib/leavesSeen.test.ts` (12): the seen record, including unreadable data,
  storage that throws, and storage that reads but will not write.
- `src/components/PaintedTree.test.tsx` (37): names and order, colours, the
  leaf card, keyboard (and the browser's own shortcuts left alone), steps that
  keep focus and are said aloud, pointer choice by the leaf's shape and reach,
  hover preview, a choice held by its piece, arrival waiting for the viewport,
  the stem growing first, the newest six, the chosen leaf ringed as it
  arrives and never stirring by itself, settling, reduced motion, the register,
  and identical drawings a year apart.
- `src/components/PaintedNote.test.tsx` (+1): the stored day whatever the
  device's time zone, including after it changes.
- `src/screens/Painted.test.tsx` (+2): the tree only when something is painted.
- `e2e/tree.spec.ts` (10, x3 projects): the journey from Detail, tap reach,
  keyboard and focus ring, arrival once across a reload, waiting below the
  fold, leaving part-way, reduced motion, posture, axe with 60 leaves, and the
  header kept clear.

Mutation checks, each against a deliberately broken build, restored after:
bare twigs drawn early (3 tree tests red), no alternating order (balance red),
no seen record (reload red), no waiting for the viewport (below-the-fold red),
taps ignored (tap tests red), no reach limit (out-of-reach red), reduced motion
ignored (reduced-motion red).

## Independent review

A read-only review by a separate agent after the gates were green found no
high-severity issue, two medium and eight low. Each was checked first-hand,
and every fix has a test shown to fail against the code before it:

| Finding | Outcome |
| --- | --- |
| A tap near the tip of a big desktop leaf was out of reach of its centre (medium) | Hit test measures to the leaf's shape; topmost wins on overlap |
| All-neutral palettes opening on Chinese White grew a 1.04:1, all-but-invisible leaf (medium) | Pale neutrals passed over for one that can be seen; the white charges the tip |
| Storage that reads but will not write replayed every arrival | Reads switch to memory once a write fails |
| A leaf chosen while arriving had no ring, then stirred untouched on settling | Ringed from the moment the brush lands on it (a first fix ringed it from the start, round empty paper - caught in the arrival frames); a stir only for a leaf that can be seen to stir |
| Alt+Left and other browser shortcuts were swallowed | Modifier keys pass through |
| Previous and Next changed the card silently for a screen reader | A polite live region says the leaf |
| Cached date formatters kept the zone they were made in: a day out after a zone change | UTC formatters on UTC dates; red on `Pacific/Kiritimati` before |
| The choice was held by index, so unmarking an earlier piece moved it | Held by piece id |
| A piece added while the tree was on screen was marked seen unseen | The record is written only at phase changes |
| An e2e colour check could pass on an empty list; the sheen ran off the scale | Both fixed; the sheen now dries in `--t-wash` |

Also recorded from the review: leaves are places in painting order, so
unmarking a piece moves each later piece one place back (register rule 7
says so), and VoiceOver activating the hidden options needs a real device.

## Safari's engine, and what is still not verified

- **WebKit 26.6, iPhone 15 profile, checked by hand.** This machine's WebKit
  cannot reach a local server, so it ran the repo's single-file build from
  disk. The arrival matched Chromium frame for frame - the stem grows from its
  base and each leaf from its stem, so SVG transform origins behave - the
  settled trees at 12 and 54 leaves matched, a touch tap chose a leaf, and the
  selection ring's computed stroke was identical to Chromium's. Frames:
  `Claude outputs/artistic-progress/webkit-*.png`. Not in CI, which runs
  Chromium.
- **A real iPhone and a real mid-range Android.** Not done. The performance
  numbers above are a desktop CPU throttled 4x.

## Follow-ups, not in this change

- The studio draws every painted card at once; with the whole catalogue painted
  that grid is most of the remaining cost of a tap (`content-visibility` on the
  cards is the likely fix).
- The main chunk grew 7.0 KB gzip (128.9 to 135.9 KB); route-splitting the
  studio is already on the PWA plan's list.
