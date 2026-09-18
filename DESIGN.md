# Little Wash - Design System

_Approved direction, recorded 18/09/2026. This file governs visual decisions;
later work follows it unless a redesign is agreed. Feature specs live in
PRODUCT.md, not here._

## Direction: "The Studio Table" (Organised Chaos)

A welcoming artist's studio table: a strict, editorial grid that stays calm and
readable, with colour arriving as the paraphernalia of a working desk - washi
tape, sticky notes, painted swatches and colour-coded tags. The structure is
orderly; the colour is lively. The two are deliberately in tension, and the grid
always wins, so the result reads as an organised, well-used table rather than
clutter.

The artwork itself always sits on a neutral mat and is never tinted, so
reference colours stay true.

Chosen after a two-round exploration. The alternative "Scattered Accents"
treatment (a much quieter colouring of the same structure) is not the approved
direction; the `data-direction="b"` treatment in code is exploration scaffolding
and will be removed when the approved design is built out.

## Foundations

### Colour

Tokens are defined as RGB channel triples on `:root` / `[data-direction="a"]`
in `src/index.css` and consumed as `rgb(var(--token) / <alpha>)`. Never
hard-code a colour in a component.

| Token | RGB | Hex | Role |
| --- | --- | --- | --- |
| `--surface` | 239 234 224 | `#efeae0` | Page ground - warm studio paper |
| `--surface-raised` | 250 247 240 | `#faf7f0` | Cards, plates, panels |
| `--surface-sunken` | 228 221 205 | `#e4ddcd` | Insets, switch track |
| `--art-mat` | 242 241 238 | `#f2f1ee` | Fixed neutral mat behind every reference |
| `--ink` | 43 42 38 | `#2b2a26` | Primary text |
| `--ink-soft` | 90 86 76 | `#5a564c` | Secondary text (tinted, never pure grey) |
| `--ink-faint` | 133 127 114 | `#857f72` | Labels, meta |
| `--line` | 221 213 196 | `#ddd5c4` | Hairline rules, borders |
| `--accent` | 34 96 107 | `#22606b` | Primary actions, focus ring, links |
| `--accent-ink` | 250 247 240 | `#faf7f0` | Text on accent |
| `--accent-soft` | 205 224 226 | `#cde0e2` | Selected-chip tint |
| `--save` | 194 90 110 | `#c25a6e` | Saved / favourite state |

Body and placeholder text meet WCAG 2.2 AA (>= 4.5:1); large text >= 3:1.
Secondary text is tinted from the ink hue, not neutral grey.

### Subject pigments (colour-coding system)

Each subject owns one pigment, used to code tags, plate rings, collection cards
and exercise mats. Defined in `src/index.css`, mapped in `SUBJECT_PIGMENT`
(`src/lib/types.ts`); use the `pigment(subject, alpha?)` helper.

| Subject | Token | RGB | Hex |
| --- | --- | --- | --- |
| Fruit | `--pig-fruit` | 224 110 63 | `#e06e3f` |
| Botanical | `--pig-botanical` | 110 140 74 | `#6e8c4a` |
| Still life | `--pig-still-life` | 46 110 120 | `#2e6e78` |
| Creatures | `--pig-creatures` | 194 90 110 | `#c25a6e` |
| Landscape | `--pig-landscape` | 194 148 54 | `#c29436` |
| Objects | `--pig-objects` | 104 106 150 | `#686a96` |

Pigments appear as fills, tape tints, plate rings and swatch dots - never as
small body text on the paper ground (contrast is not guaranteed). Colour-coding
is decorative and supportive; the text label always carries the meaning.

### Typography

- Display: **Spectral** (serif, editorial), weights 400/500/600, italic for
  prompts. Used for the wordmark, page and section headings, and piece titles.
- Body / UI: **Inter**, weights 400-700.
- Accent hand: **Caveat**, used sparingly (the landing wordmark only).
- Tracking floor for large display: about -0.01 to -0.02em (`tracking-tight`).
- Headings use `text-wrap: balance`; body uses `text-wrap: pretty`.
- Numerals in meta use `font-variant-numeric: tabular-nums` (`.tnum`).
- Body measure capped at `max-w-reading` (68ch).
- Fonts load from Google Fonts in the prototype; **self-host before
  production** (offline requirement in CLAUDE.md).

### Spacing, shape, elevation

- Radii: cards/plates `--radius-card` 8px; chips/tags `--radius-chip` 7px. The
  squarer corners are part of the editorial character.
- Layout: centred `max-w-6xl`; the working screens use a
  `[minmax(0,1fr) 20rem]` grid - content left, sticky filter panel right - and
  collapse to a single column below `lg`.
- More space above a heading than below it; hairline (`--line`) rules separate
  sections.
- Shadows carry a real offset and soft blur (`--shadow-plate`, `--shadow-lift`).
  No zero-offset colour halos, no hard block shadows.
- Touch targets >= 44x44 CSS px.

## Components

- **Featured plate** (`Today`): the daily piece on the neutral mat inside a
  raised, hairline-bordered card, with a subject-pigment ring
  (`box-shadow: 0 0 0 4px pigment/0.28`). Save button overlays the plate as a
  sibling of the link (never nested, so saving never navigates).
- **Sticky-note prompt** (`StickyNote`): the featured piece's prompt on a small
  tilted note pinned to the plate on `sm+`. On phones the prompt renders as
  plain italic serif instead (the note is decorative and hidden). One sticky per
  screen, maximum.
- **Washi-tape tag** (`WashiTag`) / **SubjectTag**: a colour-coded, taped label
  in the subject's pigment. Applied only to real metadata (subject, exercise
  kind), never as free decoration.
- **Reference / browse cards**: art on the neutral mat, subject tag, title,
  `MetaRow` (time + difficulty). A subtle pigment under-rule keys the card to
  its subject.
- **Filters** (`FilterControls`): grouped toggle buttons (time / difficulty /
  subject) with `aria-pressed`, `role="group"` + labelled; selected = accent
  fill. A "Clear N" reset appears when filters are active.
- **Buttons**: primary = accent fill; secondary = hairline-bordered raised
  surface; quiet = accent underline (e.g. "Deal me another"). Minimum height 52px
  primary, 44px others.
- **Difficulty marks** (`DifficultyMark`): three brush dabs filled to level, with
  a text label always alongside.
- **Palette** (`PaletteRow`): painted dab swatches with pigment names; display
  only, never applied to artwork.
- **Enlarge dialog** (`EnlargeDialog`): native `<dialog>` (focus trap + Escape),
  the reference uncropped on the mat, for use beside a physical sketchbook.
- **Collections** (`Browse`): colour-coded cards that apply a URL filter to the
  catalogue. **Exercises**: cards with an original painterly demo on a
  pigment-tinted mat, a kind tag, optional palette and a step disclosure.
- **Header**: sticky, editorial (not a colour band); wordmark, primary nav
  (Today / Browse / Exercises), saved count, and - during exploration only - the
  treatment switch.

### Ornament restraint (load-bearing)

Organised chaos works only while bounded. Rules:

- **No scattered background dabs.** (Explicitly removed; they competed with the
  artwork and the suggested palette.) Colour lives on real elements only.
- One sticky note per screen; tags only on genuine metadata; never double a tag.
- The pigment ring is for the featured and detail plates only, not every card.
- Ornaments never sit on the artwork or its mat, and never change reference
  colour.
- Desktop-only flourishes must have a mobile fallback that preserves meaning
  (as the sticky-note prompt does).

## Interaction states

Every interactive element defines hover, focus-visible, disabled, and (where
relevant) loading, selected and pressed. Empty, offline and permission-denied
states are designed per feature.

- Focus ring: `2.5px solid var(--accent)`, `outline-offset: 2px`, themed - never
  removed without replacement.
- Themed browser surfaces: selection, caret tint, scrollbars and tap-highlight
  all keyed to the palette.
- `prefers-reduced-motion`: transitions and animations reduced to near-zero.
- Empty filter results show a friendly recovery, never a dead end.

## Accessibility

WCAG 2.2 AA: semantic controls, labelled inputs and groups, hierarchical
headings, a skip link, descriptive reference alternatives (they describe the
subject for someone deciding whether to paint it), visible focus, full keyboard
navigation, sufficient contrast, reduced-motion support, and >= 44px targets.
Verified by rendered inspection at 390 / 768 / 1440 px.

## Motion

Restrained and purposeful: gentle lift on card/button hover, quiet transitions.
No looping or attention-seeking motion. Everything honours reduced-motion.

## Assets and provenance

Prototype references are original CC0 placeholder watercolour SVGs, labelled as
placeholder. Production imagery must be original or appropriately licensed
(open-access / CC0 sources per PRODUCT.md) with per-item provenance and
attribution tracked as first-class data. Icons are authored SVG in one stroke
weight; no emoji or unicode glyphs.

## Roadmap (future phases, not yet built)

Agreed with the user for later phases, in addition to the earlier backlog
(saved list, PWA/offline, Supabase, reminders scheduling, curated licensed
imagery pipeline, CI):

1. **Progress rewards for daily practice.** A light reward for practising.
   Design constraint (open decision): PRODUCT.md commits to "no streaks, no
   pressure, no achievement language". Any reward must stay opt-in and
   celebratory, and must never punish a missed day or push to keep a run alive.
   To reconcile, favour the "artistic progress" expression below over
   conventional streak/points gamification, or update PRODUCT.md's principle
   with the user before building. Flagged for resolution.
2. **Small themed series.** Short, finite sets such as "Seven tiny skies",
   "Five cafe treats", "A week of leaves" - a gentle sequence with an end, not
   an endless feed. Fits the existing Collections model as a finite, ordered
   collection.
3. **Gentle continuity.** Optional daily reminders and a personal painting
   history, private by default and never requiring public sharing.
4. **Artistic progress tracking.** An artsy, cute progress visual rather than a
   counter - for example a bare black-and-white tree whose leaves colour in one
   by one, hexagons filling with honey as the days go, or another Little Wash
   themed motif. This is the preferred, pressure-free expression of item 1.
