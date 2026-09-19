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
"Scattered Accents" treatment and the treatment chooser have been removed, along
with the `treatment` branching and the `/a` URL segment that carried them: the
app opens straight onto Today at `#/`, and pieces live at `#/piece/<id>`.
Exploration-era links are redirected onto the flat route with their tail intact.

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
| `--ink-faint` | (ink, faint) | `#6A665C` | 106 102 92 | Labels, meta |
| `--line` | (paper line) | `#DFD8C8` | 223 216 200 | Hairlines, borders |
| `--accent` / `--teal` | Deep teal | `#25616A` | 37 97 106 | Primary actions, links, focus ring |
| `--accent-ink` | Paper | `#FBF8F1` | 251 248 241 | Text on teal |
| `--save` / `--rose` | Rose | `#D96986` | 217 105 134 | Saved state, restrained accent |
| `--sage` | Sage | `#A8B99B` | 168 185 155 | Supportive fills only |
| `--note` | note paper | `#DEE0D1` | 222 224 209 | Note slips (`.note-paper`) |

**Contrast rules (verified in-browser against the painted background):** Ink is
body text (about 12:1) and ink-soft is 6.3:1. **ink-faint is a text colour and
must stay one:** it shipped at `#837E72` / 3.59:1 and failed AA at every one of
its uses, so it was darkened to `#6A665C` rather than patched at the call sites.
Measured in-browser it now clears 4.5:1 on every surface in the system - 5.08:1
on Paper, 5.40:1 on raised, 4.60:1 on sunken, 5.07:1 on the art mat. Deep teal passes AA for text and UI, and
carries Paper-coloured text on teal buttons (about 6:1). **Rose is a graphic/accent colour only** - it fails AA for
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
Shadows carry a real offset and soft blur. **Touch targets >= 44x44 px, header and skip link included** - the wet-hands, phone-propped context makes this a practical requirement, not just a standard.

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

**Closing a dialog must not re-enter.** `<dialog onClose>` fires on the native
`close` event, which our own `dialog.close()` also triggers - so a close driven
by React calls the handler a second time and starts a second view transition,
which by spec skips the first. `EnlargeDialog` flags the closes it initiates so
only Escape and the backdrop reach the parent. Any future dialog wired to a
transition needs the same guard.

**Card links (`.card-link`).** A card carries exactly one link. The title is
that link and its `::after` covers the whole card, so the artwork stays a
full-card tap target without a second link to the same destination. Browse
previously gave each of its twelve cards an image link *and* a title link, which
put twenty-four identical destinations in the tab order and in a screen reader's
link list. Controls that sit on a card (Save) take `z-[2]` to stay above the
overlay. Today's featured piece deliberately keeps two links - the artwork and
the "Open this piece" button - because the button is the designed primary action
on a single hero, not a repeated row.

**Your studio (`Studio`, `/studio`).** Where saved pieces live. Saving used to
persist to storage and lead nowhere; this is the destination, and the reason the
header palette is a link.

- **A record, not a collection to complete.** No target, no progress, no
  language about keeping it up. The lede says so out loud - "nothing here is
  keeping score" - because PRODUCT.md's "No pressure, ever" was asserted on
  Exercises and in the footer but nowhere a user would meet it.
- **Newest first**, matching the palette: the piece you just set aside is the
  one you are most likely to want. Both read `savedReferences()`
  (`src/lib/catalog.ts`), which also drops ids whose catalogue entry has gone
  rather than rendering a hole.
- **Built as a stack of `StudioSection`s**, so the roadmap's practice history
  becomes another section rather than a redesign. There is deliberately **no
  "coming soon" placeholder**: this app has twice shipped an entry point ahead
  of its capability, and an unfillable "Painted" panel would repeat it and risk
  reading as a scoreboard.
- **Removing is immediate and has no undo**, matching the palette, where a
  swatch simply lifts back off. The list can shrink under the user, so the count
  is announced - and an empty studio announces "Nothing in your studio", never
  "0 pieces".
- **The empty state is the invitation**, not a failure: it names what the heart
  does and offers a way to the catalogue.

**Nav: the studio earns its place.** "Studio" joins Today / Browse / Exercises
only once at least one piece is saved. An empty destination advertised on every
screen is the pattern that made saving feel like a dead end to begin with. The
palette links either way, so someone standing on `/studio` who removes their
last piece keeps the route, the empty state and a way back in - only the nav
entry goes.

**`PieceCard`.** The one piece-in-a-grid card, shared by Browse and the studio.
It carries three things that are easy to re-implement subtly wrong: the
`.card-link` overlay, the save button raised above it, and the imperative claim
on `PIECE_ART`. Verified: a grid holds the shared name **zero** times at rest and
claims it only on the click that navigates, so the one-holder rule holds. The
claim also releases whatever a previous card took - React never set those inline
names, so nothing else would clear them, and two fast clicks would otherwise
leave two holders and make the browser skip the morph entirely.

**`EmptyPanel`.** The shell every "there is nothing here" moment shares - dashed
plate, quiet badge, display title, explanation held to a readable measure, room
below for the way out. It holds no opinion about *why* something is empty: a
filtered catalogue and an untouched studio need different words but should look
like the same product.

**`WashLink`.** The link form used for anything that opens a piece. See
**Motion** - it exists so a navigation is a move rather than a cut.

**Saved palette (`SavedPalette`).** The header's record of what you have saved,
**and the way into the studio**:
a row of overlapping swatches, each in the saved piece's **own first palette
pigment**, most recent at the front, capped at five with the count carrying the
rest. It replaced an abstract heart-and-number that told you a figure and led
nowhere, in a product whose tagline is "a little colour, every day" and which
otherwise accumulated none.

- **A record, not a score.** It rises *and falls* with what is saved, has no
  target, no streak and no achievement language - PRODUCT.md rules those out,
  and the roadmap asks instead for "a quiet record to enjoy". Removing a save
  simply lifts the swatch off; nothing says anything was lost.
- **The colour is real.** Every reference carries a named palette and the first
  swatch is that piece's primary wash. Nothing here tints artwork or invents a
  hue, so it sits inside "the artwork carries the colour" rather than against it.
- **Empty is a well, not a zero.** An empty palette well is the invitation, and
  it holds the header's right-hand slot so the nav does not slide over on the
  first save.
- **Swatch edges are load-bearing.** Two rings: Paper inside so overlapping
  swatches stay separable, then a faint ink edge, because some first swatches
  sit at 1.3:1 against Paper - readable by hue but edgeless without it. The
  content is carried by the accessible label and the count, not the swatches.
- **Only a swatch added this session settles in** (`.dab-settle`, `--t-rise`).
  Replaying an entrance for the whole row on every load would make a quiet
  record feel like a fanfare.
- **It is a link, always.** It began as a non-interactive `span`: the swatches
  appeared and there was nowhere to go, unreachable by keyboard and, on touch,
  undecodable. It links whether or not anything is saved, so an empty studio can
  explain itself instead of being unreachable, and it carries the 44px floor
  like every other header control. Its accessible name states the destination
  and the count; it used to read out pigment names, which described the
  swatches rather than the pieces.

**Today in the propped posture.** `.art-cap`'s budget promises that "the piece,
its identity and the primary action fit the first screen". Stacked in landscape
they did not - "Open this piece" sat at y=616 in a 390px viewport. In short
landscape the featured piece's three blocks are **placed** side by side rather
than reordered (`grid-row`/`grid-column` on `.featured-plate`,
`.featured-identity`, `.featured-actions`), so the DOM order the control
hierarchy depends on - artwork, identity, primary action - is exactly what a
screen reader and the keyboard still get. The identity column takes the larger
share because it holds the prompt; the prompt and the difficulty note are
allowed to wrap rather than be clamped, and the stacking margins give back the
room instead.

**Back goes where you came from.** A piece card records its origin
(`state.from`), and Detail's back link names it - "Browse", "Your studio", or
Today as the fallback for a shared link. It always returned to Today, which
lost your place in the catalogue and put a third link to `/` on a page that
already had two. An origin that is not one of the app's own routes is ignored
rather than trusted.

**Detail in the propped posture.** The plate was `aspect-square w-full` with no
viewport budget while Today had `.art-cap`, so on a phone lying on its side it
became a 762x762 plate inside a 390px viewport: four screens of document, the
title 1052px down, and Enlarge - the one view built for landscape - 494px below
the fold. The first screen was a header, a back link and the top edge of an
empty mat, in the exact scene PRODUCT.md names.

- `.detail-art` caps the plate at `62svh`, `48svh` in short landscape. The
  reference is the point of this screen, so the cap is generous; what it must
  never do is exceed the screen it is read on.
- **Short landscape puts the plate and the identity side by side**
  (`@media (orientation: landscape) and (max-height: 520px)`) - the same move
  `.enlarge` makes at the same breakpoint, for the same reason: height is the
  scarce axis.
- **Enlarge steps off the artwork there.** Floating it over the mat's corner is
  affordable on a big plate and not on a 169px one, where it covered the
  subject. It sits below the plate instead, still the first thing under the
  piece. Detail is the waypoint; the enlarged view is where the painting
  happens, so reaching it beats plate size.
- **The header goes to one row** above 640px wide in this posture. Two rows cost
  121px of a 375px screen. Narrower than that the row cannot hold wordmark, nav
  and palette together, so it keeps stacking.

**These overrides live in `@layer utilities` with doubled class names**, because
every one of them overrides a Tailwind utility (`py-6`, `mt-5`, `p-3 sm:p-4`,
`absolute`, `hidden`, `md:block`) that outranks the components layer. A first
version sat in components and silently did nothing - and one of those no-ops
hid both navs at once between 640px and 768px wide. If a rule here stops
applying, check the layer before changing the value.

**Enlarge view (`.enlarge`).** The reference at reading size, for a phone
propped beside a sketchbook. Sized to the viewport, never to a fixed aspect
ratio: the artwork is `object-contain` in whatever box the screen leaves, and
the mat is the dialog's own background, so there is no plate inside a plate and
everything that is not the title bar is artwork. The inset is a small fluid
margin (`clamp(0.5rem, 2vmin, 1rem)`), not a percentage of the width, which in a
short landscape viewport ate most of the height. Full-bleed by default; the
inset, backdrop-visible dialog needs room on **both** axes (`min-width: 640px`
and `min-height: 540px`), because a phone held sideways is a wide viewport and a
small screen at once. In landscape under 520px tall - the propped-on-a-stand
posture - the title bar becomes a right-hand rail against a hairline, so the
full height stays with the artwork. Verified: the art fills >= 80% of the
shorter viewport dimension with no clipping at 390x844 (95.9%), 844x390 (95.9%),
667x375 (95.7%), 320x700 (95.0%), 768x1024 (90.0%) and 1440x900 (83.2%).

**MetaRow.** The one time + difficulty summary, used on Today, Browse cards and
Detail. **The difficulty note travels with the label wherever the label
appears** - "Gentle" alone does not tell a nervous beginner what they are
agreeing to, and the reassurance is already written in the data. The label takes
`font-medium`; the note sits at the same size in regular weight, so the label
still leads.

**Filter chips.** The rule holds for every chip group in the app, including the
Exercises kind tabs, which used to fill their default "All" with teal and show
no check at all. `aria-pressed` toggles at >= 44px. A selected chip always
carries a check mark, so selection never depends on colour alone. Teal fill is
reserved for a chip that is **actually narrowing**; the default "Any" / "Anything"
option reads as selected in a quiet sunken style, because choosing the default is
not a choice and must not be the loudest thing on the screen. This doubles as the
at-a-glance signal for which filters are active.

**A control that changes something off-screen brings you to it.** Choosing a
collection on Browse changes results that sit ~1500px below the fold on a phone,
behind five collection cards and the filter panel. The count changed, the live
region announced it, and to anyone looking at the screen the tap did nothing -
it read as a hang.

- **Focus moves to the results heading**, not just the scroll. That takes the
  keyboard with it, so tabbing carries on into the results instead of resuming
  at the collection you just left, and it names where you landed. The heading
  takes `tabIndex={-1}` so it receives focus without joining the tab sequence.
- **`.jump-target` clears the sticky header** (`scroll-margin-top`, 8.5rem below
  `md` where the header is two rows, 6rem above it). Landing underneath the
  header would reproduce the very defect the jump exists to fix.
- **Nothing moves if the change is already visible.** On desktop the results are
  in view, so the page stays put - moving it under someone who can see the
  change is the ruder option.
- **Only a deliberate choice jumps.** A shared `?time=short` link lands where it
  means to without grabbing focus, and a filter chip - which already sits beside
  the results - leaves focus on the chip.

**Time bands are ranges, not budgets.** "Under 10 min" / "10-20 min" / "Over 20
min" tile the catalogue with no overlap and no gap, so **every band genuinely
narrows**. `min` is inclusive and `max` exclusive, which matters: two disjoint
integer endpoints left any non-integer `minutes` matching no band at all while
the filter still claimed to be narrowing. They were upper bounds keyed `"5" | "15" | "30"`, which meant each
band also accepted everything shorter: "30 min+" read as a floor, behaved as
Infinity and returned the whole catalogue, while the chip took the teal fill
this system reserves for a chip that is actually narrowing. That broke the
at-a-glance active-filter signal above, and it broke the product's own
positioning - time is the question Little Wash is built around, so the answer
has to be true. Ranges also let someone ask for a *long* piece, which an upper
bound cannot express.

**Filter group labels** take `--ink-soft`, not `--ink-faint`: they are primary UI
and belong a step up the ink ramp. This is now a hierarchy rule, not a contrast
workaround - `ink-faint` clears AA since it was darkened.

### Ornament restraint (load-bearing)

- **No scattered background dabs** (removed - they competed with the artwork).
  Colour lives on real elements only.
- **No sticky note on Today.** The prompt is the piece's own invitation and is
  set as italic display type in the identity block at every width. The note was
  duplicating it, was the loudest colour on the screen against a principle that
  the artwork carries the colour, and collided with the control block.
  `StickyNote` remains available for other surfaces and now paints from the
  `--note` token (Paper carrying Sage, ink 10.3:1) instead of a hard-coded
  yellow. Its class is **`.note-paper`**, named for the material: the old
  `.sticky` collided with Tailwind's positioning utility and was leaking a
  drop shadow onto every `position: sticky` element, the header included.
- At most one sticky note per screen; tags only on genuine metadata; never
  double a tag.
- Ornaments never sit on the artwork or its mat, and never change reference
  colour.
- Desktop-only flourishes have a mobile fallback that preserves meaning.

## Interaction and accessibility

Every interactive element defines hover, `focus-visible` (3px teal ring,
never removed), disabled, and where relevant loading/selected/pressed. Empty,
offline and permission-denied states are designed per feature. Themed browser
surfaces (selection, caret, scrollbars, tap-highlight). WCAG 2.2 AA: semantic
controls, labelled groups, hierarchical headings, skip link, descriptive
reference alternatives, full keyboard nav, >= 44px targets. Subtle paper-grain
texture over the page. Motion has its own section below and honours
`prefers-reduced-motion`.

**Announcements.** A change of piece is announced by name, not by count: a
`role="status"` region reads "Now showing <title>, <n> minutes, <difficulty>",
silent on first paint. A count-only live region is not sufficient - the piece can
change off-screen with nothing to signal it. This matters more now that a piece
can change behind a 520ms transition.

## Motion: one material, two moments

Motion is a system now, not a single exception. It is still restrained - nothing
decorative animates, and the rule below is the whole of it:

> **The paper is never cut, only moved or re-wet.**

Everything that moves in the app is one of those two things, and both run on the
same View Transitions machinery so they read as one material rather than as a
set of effects. The implementation lives in `src/lib/wash.ts`, the turbulence in
`src/components/WashFilter.tsx`, and the choreography at the foot of
`index.css`.

### The scale

One easing family, four durations. Nothing invents its own.

| Token | Value | Used by |
| --- | --- | --- |
| `--ease-paper` | `cubic-bezier(0.16, 1, 0.3, 1)` | every moment, exponential ease-out |

| `--t-micro` | 140ms | every `transition-*` utility (hover, chip, nav) |
| `--t-rise` | 240ms | a surface arriving (`.sheet`), a swatch landing (`.dab-settle`) |
| `--t-move` | 380ms | the artwork changing place |
| `--t-wash` | 520ms | the artwork being replaced |

`--t-micro` and `--ease-paper` are wired into Tailwind as the default
`transitionDuration` and `transitionTimingFunction` (`tailwind.config.js`), so
a hover or a chip press belongs to the same easing family as the artwork moving
without any call site opting in.

### Move - the artwork changes place

Navigating between Today, a Browse card, Detail and the enlarged view does not
redraw the artwork; it morphs it. Every such link is a `WashLink`, and the
artwork carries one shared `view-transition-name` (`PIECE_ART`, `"piece-art"`).

- **Exactly one element may hold that name at a time.** Today and Detail hold it
  statically; the enlarged view takes it while open and Detail releases it; on
  Browse the card being left claims it imperatively at click time, so the
  browser is never asked to snapshot twelve layers that pair with nothing.
- **The chrome gets out of the way rather than cross-fading with itself.** A
  plain cross-fade leaves two full pages of text legible at half opacity, which
  reads as a double exposure. The outgoing chrome clears, the artwork flies
  through the gap, the new chrome arrives behind it.
- `WashLink` stays a real anchor with a real href. Modifier-click, middle-click
  and "open in new tab" bypass the transition entirely.

### Re-wet - the artwork is replaced

A deal, or a filter change that alters what is featured, is a re-wet: both
snapshots of the artwork are pushed through one animated `feTurbulence` +
`feDisplacementMap` field, so the outgoing piece dissolves into wet paper as the
incoming one resolves out of it. The field is re-seeded per deal - real paint
never repeats, and a transition that does is the thing that reads as canned.

- **The hand-off sits where the paper is wettest.** The opacity curves run
  `linear` with their shaping in the keyframe stops, because easing them
  front-loads both and the outgoing piece vanishes before the bloom starts. The
  project easing still governs what you actually see move: it is splined into
  the turbulence.
- **The chrome does not evacuate here.** A re-wet is the same page with a
  different piece in it; clearing the chrome left the whole screen pale
  mid-bloom. The identity text turns over while the paper is wettest, so title,
  note and artwork change together.
- `baseFrequency` is **fixed, deliberately**. Animating it regenerates the whole
  noise field every frame and cost half the frame rate; fixed, it is generated
  once and only re-sampled as the displacement swells. On a 4x-throttled profile
  that was 30fps against 60.

### Rules this system must not break

- **Colour fidelity outranks the transition.** The UA cross-fade uses
  `mix-blend-mode: plus-lighter`, which brightens both snapshots while they
  overlap. The artwork is set to `normal`: a painter mixes against what is on
  screen, so the reference is never allowed to read brighter than it is, not
  even for 380ms.
- **A settled reference is the real image.** The displacement returns to zero and
  the filter is dropped before the last frame. Verified: the settled artwork
  reports `filter: none` and `transform: none`.
- **Reduced motion is a clean cut, not a fast animation.** `wash.ts` skips
  `startViewTransition` entirely and never sets the `data-wash` attribute, and
  the pseudo-elements are disabled in CSS as well - they sit outside the document
  tree, so the global reduced-motion rule in `@layer base` cannot reach them.
- **Where View Transitions are unavailable the update still happens**, and
  `.piece-settle` remains as the fallback for a changed piece (an
  already-visible default, so nothing is hidden if it never runs).
- **Nothing else animates** beyond `.dab-settle`, the single swatch that lands
  when a piece is saved - a response to a deliberate action, not an entrance.
  No decorative motion, no entrance animation per section, no hover
  choreography beyond the existing state changes.

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
