# little wash - Design System

_Approved direction, updated 19/09/2026 to adopt the official brand
(`assets/branding.png` is the visual source of truth). This file governs visual
decisions; later work follows it unless a redesign is agreed. Feature specs live
in PRODUCT.md._

## Direction: "The Studio Table"

A welcoming artist's studio table: a strict, editorial grid that stays calm and
readable, with colour arriving as the paraphernalia of a working desk - washi
tape, sticky notes, painted swatches and colour-coded tags. The structure is
orderly; the colour is lively but restrained, in the brand's teal/sage/rose
family. Artwork always sits on a fixed neutral mat and is never tinted, so
reference colours stay true.

There is one treatment. The earlier Bold/Calm exploration switch, the second
"Scattered Accents" treatment and the treatment chooser have been removed; the
app opens straight onto Today.

## Brand

- **Name / wordmark:** lowercase **"little wash"**, set in Libre Baskerville.
  Always lowercase. Never Title Case, never an alternative face.
- **Mark:** the watercolour "w" of three overlapping petals (teal, pale teal,
  sage). Used as the app icon and beside the wordmark. Never redrawn.
- **Tagline:** "a little colour, every day."
- **Character:** calm, gentle, curious, colourful; unpressured.

### Brand assets (`assets/`, originals - keep intact)

| File | Role | Notes |
| --- | --- | --- |
| `branding.png` | Branding board | Reference only; never pasted into the UI |
| `logo-text.png` | Primary horizontal lockup (mark + wordmark) | Baked paper background, no transparency; for marketing on matching paper |
| `logo-trans.png` | Icon-only mark, transparent | The master mark; source for all derivatives |
| `logo-1024.jpg` | Mark on solid white | App-icon candidate on white; superseded by paper-tile derivatives below |

### Derivatives (generated; safe to regenerate)

| File | From | Use |
| --- | --- | --- |
| `src/assets/brand/mark.png` (512, transparent, trimmed + evenly padded) | `logo-trans.png` | In-app header mark, rendered at 32px |
| `public/favicon.ico`, `favicon-32.png`, `favicon-16.png` | mark on rounded Paper tile | Browser tab |
| `public/apple-touch-icon.png` (180) | mark on Paper | iOS home screen |
| `public/icon-192.png`, `icon-512.png` | mark on Paper | PWA / maskable |
| `public/site.webmanifest` | - | Name, colours, icons |

### Logo usage rules

- Header uses the transparent mark + the wordmark set live in Libre Baskerville
  (crisp, responsive, accessible), not a flattened image.
- Clear space around the lockup: at least the height of the mark's petal.
- Minimum wordmark height about 18px; below that use the mark alone.
- Never place the mark on a busy or coloured ground that lowers its contrast;
  for small icons it sits on a Paper tile.
- Small favicons (16-32px) use the Paper-tile version, not the bare transparent
  mark, so the pale centre petal stays legible.

## Foundations

### Colour

Tokens are RGB channel triples on `:root` in `src/index.css`, consumed as
`rgb(var(--token) / <alpha>)`. Components never hard-code a colour.

| Token | Brand name | Hex | RGB | Role |
| --- | --- | --- | --- | --- |
| `--surface` / `--paper` | Paper | `#F5F1E8` | 245 241 232 | Page ground |
| `--surface-raised` | (paper, lighter) | `#FBF8F1` | 251 248 241 | Cards, plates, panels |
| `--surface-sunken` | (paper, deeper) | `#ECE6D9` | 236 230 217 | Insets |
| `--art-mat` | neutral mat | `#F2F1EE` | 242 241 238 | Fixed neutral behind every reference |
| `--ink` | Ink | `#2E2D29` | 46 45 41 | Primary text |
| `--ink-soft` | (ink, tinted) | `#5C584E` | 92 88 78 | Secondary text |
| `--ink-faint` | (ink, faint) | `#837E72` | 131 126 114 | Labels, meta |
| `--line` | (paper line) | `#DFD8C8` | 223 216 200 | Hairlines, borders |
| `--accent` / `--teal` | Deep teal | `#25616A` | 37 97 106 | Primary actions, links, focus ring |
| `--accent-ink` | Paper | `#FBF8F1` | 251 248 241 | Text on teal |
| `--save` / `--rose` | Rose | `#D96986` | 217 105 134 | Saved state, restrained accent |
| `--sage` | Sage | `#A8B99B` | 168 185 155 | Supportive fills only |

**Contrast rules (verified against Paper):** Ink is body text (about 12:1).
Deep teal passes AA for text and UI, and carries Paper-coloured text on teal
buttons (about 6:1). **Rose is a graphic/accent colour only** - it fails AA for
small text on Paper, so it is used for the saved heart, tags and marks, never
body copy. **Sage is light** - fills and large blocks only, never text on Paper.

### Subject colour-coding

Each subject owns a muted pigment, tuned to sit calmly beside the brand palette
(still-life anchors on brand teal, creatures on brand rose). Defined in
`index.css`, mapped in `SUBJECT_PIGMENT` (`src/lib/types.ts`); use `pigment()`.

| Subject | Hex | RGB |
| --- | --- | --- |
| Fruit | `#C89254` | 200 146 84 |
| Botanical | `#6E8C5A` | 110 140 90 |
| Still life | `#25616A` | 37 97 106 |
| Creatures | `#D96986` | 217 105 134 |
| Landscape | `#7C93A6` | 124 147 166 |
| Objects | `#977C93` | 151 124 147 |

Pigments appear as tape tints, plate rings, card rules and swatch dots - never
as small body text. The text label always carries the meaning.

### Typography

- Display / editorial: **Libre Baskerville** (400 / 700 + italic). Wordmark,
  page and section headings, piece titles, prompts (italic).
- Body / UI: **Source Sans 3** (400-700).
- Handwritten accent: **Caveat**, used sparingly.
- Headings use `text-wrap: balance`; body `text-wrap: pretty`; number columns
  use tabular numerals; body measure capped at 68ch.
- Fonts load from Google Fonts in the prototype; **self-host before production**.

### Spacing, shape, elevation

Radii: cards/plates 8px, chips/tags 7px. Layout: centred `max-w-6xl`, a
`[1fr 20rem]` content + sticky-filter grid collapsing to one column below `lg`.
More space above a heading than below it; hairline rules between sections.
Shadows carry a real offset and soft blur. Touch targets >= 44x44 px.

**`.art-cap`** caps the featured artwork against the viewport (40svh phone,
52svh from `sm`, 46svh from `lg`, with a `vh` fallback first) so the piece, its
identity and the primary action fit the first screen. The budget is the screen,
never a fixed pixel height.

## Today: control hierarchy (load-bearing)

Today is a decision surface, not a document. Its order is fixed:

**artwork -> identity (title, prompt, minutes, difficulty + its plain-English
note) -> primary action -> time and energy -> subject -> palette.**

- **Time and energy lead.** They are the two questions the product is positioned
  on, so they are the primary control wherever they appear - never a "refine"
  panel reached after the results. Below `lg` they sit in a card directly under
  the piece; at `lg+` they head the sticky rail.
- **Subject demotes.** It is the conventional axis and carries seven options.
  Below `lg` it is a trigger that always states its current value, opening a
  native `<dialog>` bottom sheet (`.sheet`); at `lg+` it sits below a rule in
  the rail. A subject set by URL must still show as an active control.
- **The catalogue is not on Today.** No "more to try" list: offering the rest of
  the library here reopens the deliberation the screen exists to close. "Deal me
  another" is the one-tap alternative, and Browse owns the catalogue.
- **The palette follows the controls**, not the piece. It is what you need once
  you have committed.
- Requirement to preserve: when a control is in view, the artwork it changes is
  still on screen. Verified at 390x844 and 768x1024.

Browse carries the same hierarchy: controls precede the results below `lg`.

## Components

Featured plate (save overlay as a sibling of the link), washi-tape colour-coded
subject tags (real metadata only), reference/browse cards with a pigment
under-rule, primary time/energy filter groups and the subject sheet, buttons
(teal primary, hairline secondary, teal-underline quiet), brush-dab difficulty
marks with a text label, palette dab swatches (display only), native `<dialog>`
enlarge view and bottom sheet, colour-coded collection cards, exercise cards
with painterly demos, and a sticky editorial header (mark + wordmark, nav,
saved count).

**Filter chips.** `aria-pressed` toggles at >= 44px. A selected chip always
carries a check mark, so selection never depends on colour alone. Teal fill is
reserved for a chip that is **actually narrowing**; the default "Any" / "Anything"
option reads as selected in a quiet sunken style, because choosing the default is
not a choice and must not be the loudest thing on the screen. This doubles as the
at-a-glance signal for which filters are active.

**Filter group labels** take `--ink-soft`, not `--ink-faint`: they are primary UI
and `ink-faint` fails AA at 3.59:1 on Paper.

### Ornament restraint (load-bearing)

- **No scattered background dabs** (removed - they competed with the artwork).
  Colour lives on real elements only.
- **No sticky note on Today.** The prompt is the piece's own invitation and is
  set as italic display type in the identity block at every width. The note was
  duplicating it, was the loudest colour on the screen against a principle that
  the artwork carries the colour, and collided with the control block.
  `StickyNote` remains available for other surfaces; if reused, give it a
  `--note` token in the brand family rather than its hard-coded yellow.
- At most one sticky note per screen; tags only on genuine metadata; never
  double a tag.
- Ornaments never sit on the artwork or its mat, and never change reference
  colour.
- Desktop-only flourishes have a mobile fallback that preserves meaning.

## Interaction, accessibility, motion

Every interactive element defines hover, `focus-visible` (2.5px teal ring,
never removed), disabled, and where relevant loading/selected/pressed. Empty,
offline and permission-denied states are designed per feature. Themed browser
surfaces (selection, caret, scrollbars, tap-highlight). WCAG 2.2 AA: semantic
controls, labelled groups, hierarchical headings, skip link, descriptive
reference alternatives, full keyboard nav, >= 44px targets. Motion is restrained
and honours `prefers-reduced-motion`. Subtle paper-grain texture over the page.

**Motion.** One authored moment: `.piece-settle`, the featured piece settling in
after a filter change or a deal (320ms, exponential ease-out, from an
already-visible default so nothing is hidden if it never runs). `.sheet` rises
220ms on open. Nothing else animates.

**Announcements.** A change of piece is announced by name, not by count: a
`role="status"` region reads "Now showing <title>, <n> minutes, <difficulty>",
silent on first paint. A count-only live region is not sufficient - the piece can
change off-screen with nothing to signal it.

## Assets and provenance

Reference artwork is original CC0 placeholder watercolour SVG, labelled as
placeholder. Production imagery must be original or appropriately licensed
(open-access / CC0) with per-item provenance tracked. Icons are authored SVG in
one stroke weight; no emoji.

## Roadmap (future phases, not yet built)

**Ruled out (decided):** conventional progress rewards, points, streaks or
gamification - to uphold PRODUCT.md's "No pressure, ever. No streaks, no guilt,
no achievement language." The only progress feature is the celebratory visual
below, which never punishes a missed day.

1. **Small themed series** - "Seven tiny skies", "Five cafe treats", "A week of
   leaves": finite, ordered collections.
2. **Gentle continuity** - optional reminders and a private painting history,
   never requiring public sharing.
3. **Artistic progress tracking (celebratory, never punishing)** - an artsy,
   cute progress visual (a tree colouring in leaf by leaf, hexagons filling with
   honey, or another little wash motif): a quiet record to enjoy, with no
   streaks, no targets and no achievement language.

Plus the standing backlog: saved-list screen, PWA/offline, Supabase, backend
reminder scheduling, real curated licensed imagery + provenance pipeline, CI.
