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
| `--bark` | sepia ink | `#5B4636` | 91 70 54 | The painted tree's branches only; the warm-up illustrations' line colour |

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
- Body / UI: **Source Sans 3** (400-700, no italic).
- Handwritten accent: **Caveat**, used sparingly. Part of the brand, but no
  element sets `font-hand` yet, so it is not bundled; `src/fonts.ts` says how
  to add it when it gets a job.
- Headings use `text-wrap: balance`; body `text-wrap: pretty`; number columns
  use tabular numerals; body measure capped at 68ch.
- **Self-hosted** from the Fontsource packages, all SIL OFL 1.1, imported in
  `src/fonts.ts` and bundled by Vite: nothing loads from a third party.
  `e2e/fonts.spec.ts` fails on any Google Fonts request and on any face the
  page falls back from. Every file carries unicode-range subsets, so a first
  visit to Today downloads five Latin files, 87 KB (measured 29/09/2026);
  Latin Extended arrives only for a credit that needs it.
- **`font-medium` on a Libre Baskerville heading renders at 400.** It always
  has: the Google Fonts link asked for 400 and 700 only, and the approved
  screens were drawn that way. The family now ships 500 and 600, so heavier
  headings are possible, but importing 500 would thicken every heading at
  once. Treat it as a design change, not a font fix.

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

A prompt is optional on a reference. When a piece has none the line is left
out rather than rendered empty, and the identity block closes up around it -
the order above is unchanged, one rung is simply absent.

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
enlarge view and bottom sheet, colour-coded collection cards, series cards with
their strip of plates and the numbered series rows (see **Small series**
below), warm-up rows that expand into a practice sheet (see **Warm-ups**
below), and a sticky editorial header (mark + wordmark, nav, saved count).

**Optional content takes its container with it.** A reference may have no
prompt and no tip. Detail drops the whole tinted Tip panel rather than heading
an empty one, and Today omits the italic prompt line rather than rendering a
blank paragraph: a card that promises something and then says nothing reads as
a loading failure.

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
- **The Painted section is headed by the painted tree** - a leaf for each piece
  painted, above the dated cards. See **The painted tree** below.

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

Real pieces carry two- or three-line prompts and a credit line, and that alone
pushed "Open this piece" below the fold for 109 of 189 pieces on a sideways
Pixel 7 and for all 189 at 667x375. Three trades hold the promise, cheapest
first, in short landscape only:

- **The full Save button goes** (`.featured-save-full`). The plate's own heart
  saves the same piece in the same screen; the duplicate was what wrapped the
  actions onto a second row.
- **The title and the prompt each drop a step** (1.45rem, 0.98rem). The prompt
  stays whole and in the display face; it is never clamped.
- **Under 740px wide, the "Today's wash" heading leaves the screen but not the
  document.** The header's current-page Today tab sits directly above it, so
  on screen it only repeated that; it stays the page's h1 for screen readers.

Verified 29/09/2026 by rendering every piece of the catalogue: the plate and
the whole action row sit inside the first screen for all 189 at 863x360 and
667x375, and the plate does at 412x839 and 1440x900 as well.

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
- **On an upright phone or tablet the cap also leaves room for the title**:
  `min(62svh, 100svh - 27.5rem)`. Stacked, the name sits under the plate, its
  caption and its credit, and a tall reference (a 9:16 door on a Pixel 7) put
  it 145px below the first screen. 27.5rem is the plate's top plus the tallest
  caption-to-title stack in the catalogue, measured across all 189 pieces; in
  rem so it grows with enlarged text. Verified 29/09/2026: every piece's title
  is inside the first screen at 412x839, 863x360, 667x375 and 1440x900, and
  Enlarge is too in both short-landscape sizes.
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

**A new page opens at its top.** Nothing reset the scroll on navigation, so a
page kept the position of the one before it, clamped to its own height: on a
Pixel 7, a piece opened from card 41 of Browse landed at scrollY 579 with its
plate at -370px, entirely off the screen. `useNewPageAtTop` (in `AppShell`)
moves a forward navigation to a new page to the top in a layout effect, so it
happens before paint and before a view transition snapshots the new page. A
change of query string is the same page and never moves - filters, deals and
warm-ups all rewrite it in place - and Back and Forward are left to the
browser, which already restores the exact place you left.
`e2e/discovery.spec.ts` guards both directions.

**Browse draws a page at a time.** It rendered every matching piece at once.
Measured 30/09/2026 on a Pixel 7 profile with the CPU slowed four times: the
whole catalogue of 189 blocked the main thread for 1,113ms on arrival and a
filter tap took 1,792ms to paint; images were already lazy, so the cards
themselves were the cost, at about 4ms each. Now 24 are drawn, then 24 more
per tap of "Show 24 more" ("Show the last 13" at the end), with "Showing 48 of
189" beside it: 360ms and 830ms on the same profile, 6,383 DOM nodes down to
1,106. Still above the 200ms responsiveness target on that slowed profile, and
recorded as such.

- **A button, not loading on scroll.** An endless list keeps the footer, and
  the platform credits it carries, out of reach, and it moves under a keyboard
  or a screen reader without being asked.
- **The length lives in the URL** (`?shown=48`, written with `replace`), so
  Back returns to a list as long as the one you left and the browser can put
  you back in it. A filter change, a collection and leaving a collection all
  start the new result on its first page.
- **Focus goes to the first piece added**, without scrolling: the new cards
  arrive above the button, exactly where the list left off.
- The results heading keeps the whole count; only the grid is paged.

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

### Warm-ups: choosing one, then following it (`#/exercises`)

Two jobs on one page, in this order: pick a warm-up quickly, then paint along
with it. Rebuilt 29/09/2026 with the curator's approval of the layout (expand in
place), the visuals (original illustrations plus five approved photos) and the
"Keep screen on" switch.

- **Five rows, always.** The list stays five warm-ups long so it scans in a
  glance: classic preview, name, skill focus, duration (a range when the
  variations differ), variation count and the kind as a washi tag. Variations
  are never cards of their own on the page. At `lg+` a row also shows small
  previews of its other variations, decoratively; the count carries the
  information.
- **A row is a disclosure, not a link.** The whole row is one button inside the
  warm-up's `h2` (`aria-expanded`, `aria-controls` while open), and the sheet
  it opens is a `region` named by that button. One warm-up is open at a time.
  Closing is offered three ways - the row itself (it reads "Close" while open),
  a "Close warm-up" button at the foot of the sheet, and Escape from anywhere
  inside it - and the last two return focus to the row.
- **It comes up to meet you.** A warm-up opened below the fold, or whose sheet
  runs past it, scrolls so its row settles under the header (`.jump-target`).
  One already wholly in view stays put, and a deep link or reload never jumps.
- **Variations are a native radio group** of labelled visual choices, classic
  first and checked by default. Selected is a teal border, a tinted card, a
  check and a heavier label - never colour alone - and the visually hidden
  input's focus ring is drawn on its card. Arrow keys choose, as any radio
  group does. On a phone four choices sit in one row (two by two under 380px)
  and five break three-and-two.
- **Preview and guide change together.** The sheet holds the illustrated
  example, then the guide - name, what you will practise, minutes, the switch,
  "You'll need" (colours with a substitution note, three to five materials),
  three to five steps, one "What to notice" - then the inspiration photo where
  there is one. That DOM order is the reading order everywhere.
- **The example stays in view while you paint.** From `md`, and in the propped
  posture at any width, the example holds the left column (`position: sticky`
  under `--header-h`) for the whole length of the guide. On an upright phone
  at least 640px tall it sticks above the steps, capped at 24svh so there is
  room to read. `e2e/warmups.spec.ts` asserts the example and the first step
  are on screen together on every project.
- **Keep screen on** is a `role="switch"` hidden where the browser has no
  Screen Wake Lock. The wish is kept apart from whether a lock is held: the
  browser drops it when the page is hidden and the hook asks again on return.
  A refusal - or a lock dropped while the page is in front of the painter -
  ends the wish: the switch reads off, the reason is said in words ("Your
  browser didn't keep the screen on"), one tap asks again, and nothing is taken
  later behind a switch that says it is off. Closing the warm-up releases the
  lock and forgets the wish. It is a request, not a guarantee, and has only been verified in
  headless Chromium, which refuses it.
- **The URL holds the state** - `kind`, `warmup`, `variation`, written with
  `replace` like Today's dealt piece. The classic is left out of the URL, an
  unknown value falls back rather than failing, and a filter that hides the
  open warm-up closes it.
- **No scores, no streaks.** Nothing on this page is tracked or counted.

### Small series: a run in order (`#/series/<id>`)

A series is a short, fixed run of catalogue pieces around one theme, in the
order they are meant to be painted: "Seven tiny skies", "A week of leaves",
"Six fruit cross-sections". Built 30/09/2026; the content lives in
`src/data/series.ts`, the rules in `src/lib/series.ts`.

- **Not a collection.** A collection is a lens with a cover, and the filters
  narrow inside it. A series names its size and its order is the curation, so
  it is never filtered: narrowing seven skies to four would break both.
- **Whole or withdrawn.** A series is offered only when every piece is in the
  catalogue the painter has switched on. Switch off a source it draws on and
  it leaves Browse rather than showing with gaps in its numbering; its own page
  keeps the title and blurb and says which source it needs ("This series needs
  Unsplash and The Met"), with the way to Sources. A piece that has left the
  catalogue altogether makes the series "not here", because no switch would
  bring it back. `src/data/series.test.ts` fails if a title's number stops
  matching its pieces or a piece id stops matching the catalogue.
- **On Browse**, a Series section above Collections. Each card shows the whole
  run as a strip of small 5:4 plates - the thing a collection's single cover
  cannot say - then "7 pieces · 8-25 min each". Square cells left a wide sky a
  sliver; 5:4 is the ratio every small plate in the app uses. One link, the
  title, with the `.card-link` overlay; the strip is `aria-hidden`, since seven
  descriptions inside a link would bury its name, and the series page names
  every piece. The plates ask the CDN for 200px images (`REMOTE_WIDTHS` gained
  the rung for them): twenty of them cost 276 KB at 400px. An odd last card
  takes the whole row in the two-column grid rather than leaving half of it
  empty.
- **The series page is a contents page, not a gallery.** A numbered row per
  piece - plate, numeral beside the title, time and difficulty with its note,
  credit, Save - so the whole run reads in a screen or two. On a phone Save
  sits under the plate and the text keeps the whole column beside it: in the
  title line it left a title 88px at 320px wide, one word a line. The
  introduction holds the left column from `lg` and sits above the list below
  it. The lede says the promise out loud, as the studio's does: "Take them in
  order, one a day or all in one go. Nothing unlocks, and nothing here keeps
  score."
- **Numbered, never counted.** "No. 3" is a place in the order. Nothing says
  "3 of 7", "4 to go" or "series complete", nothing unlocks, and there are no
  day labels - "A week of leaves" is seven leaves, not a schedule. The painted
  register below applies in full: a painted piece shows its own absolute date
  ("Painted 14 September", the studio's `PaintedNote`), and nothing adds the
  dates up. A series with every piece painted reads exactly as it did, plus
  the dates. `src/lib/series.ts` exposes no progress function, and a test
  asserts that it stays that way.
- **On Detail**, a piece opened from a series carries it in the URL
  (`?series=<id>`), like the dealt piece, so a reload or a shared link keeps
  the way through. The back link names the series. Below the action row - never
  above the title, whose first-screen budget is measured to the rem - a
  navigation headed "Seven tiny skies · No. 3" offers Previous and Next with a
  small plate each; the first piece has no Previous, and the last offers "Back
  to the series" in place of Next, marked with the series' pigment rather than
  a second left arrow - two left-pointing cards read as two ways back. An
  unknown series, one that is withdrawn, or one the piece is not in is simply
  ignored.
- **Previous and Next are a re-wet**, not a move: the same page with a
  different piece in it. Detail is keyed by the piece, as Today's featured piece
  is, so a reference that failed to load does not mark the next one failed
  before it is tried. Tapped from the foot of a phone screen the plate is far
  above the viewport, and holding the shared name made the artwork fly 694px
  down across the header; so the name is released when the plate's top edge is
  off screen (`releaseArtworkIfScrolledAway`), and the new piece resolves out of
  the wet paper where it sits. Where the plate is still in view it re-wets in
  place, the group held still. `e2e/series.spec.ts` asserts that the morph
  never starts above the screen.

### Ornament restraint (load-bearing)

- **No scattered background dabs** (removed - they competed with the artwork).
  Colour lives on real elements only.
- **No sticky note on Today.** The prompt is the piece's own invitation and is
  set as italic display type in the identity block at every width, on the
  pieces that have one. The note was
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

## Motion: one material, three moments

Motion is a system now, not a single exception. It is still restrained - nothing
decorative animates, and the rule below is the whole of it:

> **The paper is never cut, only moved, re-wet or painted on.**

Everything that moves in the app is one of those three things. The first two
run on the same View Transitions machinery so they read as one material rather
than as a set of effects; the implementation lives in `src/lib/wash.ts`, the
turbulence in `src/components/WashFilter.tsx`, and the choreography at the foot
of `index.css`. The third - paint arriving, which is how a leaf joins the
painted tree - is a CSS sequence built from the same scale (see **Painted on**
below and **The painted tree**).

### The scale

One easing family, four durations. Nothing invents its own.

| Token | Value | Used by |
| --- | --- | --- |
| `--ease-paper` | `cubic-bezier(0.16, 1, 0.3, 1)` | every moment, exponential ease-out |

| `--t-micro` | 140ms | every `transition-*` utility (hover, chip, nav) |
| `--t-rise` | 240ms | a surface arriving (`.sheet`), a swatch landing (`.dab-settle`) |
| `--t-move` | 380ms | the artwork changing place; a twig growing on the painted tree |
| `--t-wash` | 520ms | the artwork being replaced; a leaf pressed in, a leaf drying, a leaf stirring |

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

### Painted on - a leaf arrives on the painted tree

The one moment in the app that is allowed to take its time, because it happens
once per painting. It is a sequence of the scale's own steps, not a duration of
its own:

1. **The twig reaches out** from its parent, if the leaf needs a new one:
   `--t-move`.
2. **The brush presses the leaf in** from its stem - scale from the stem with a
   touch of overshoot, as the bead of water spreads past where it settles:
   `--t-wash`, 300ms after its twig starts.
3. **It dries**, 300ms later: the wet, deeper tone and the shine go off - so it
   dries lighter, as watercolour does - and the pigment pools darker at the
   edge: `--t-wash`.

Leaves arriving together start 420ms apart, the newest six at most. It plays
once, when the drawing is at least half on screen, and never again for that
leaf; it is recorded as seen at its start, so leaving part-way never replays it.
Every keyframe runs from a hidden or wet start to the resting state, which is
the dry leaf - a leaf whose animation never runs is simply there.

A chosen leaf **stirs** on its stem (`--t-wash`), a response to a deliberate
touch in the same register as `.dab-settle`: never on arrival, never by itself,
never in a loop - and never later, untouched, for a leaf chosen while it was
still arriving.

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
  when a piece is saved, and the painted tree's arrival and stir above - each a
  response to something the painter did, not an entrance. No decorative motion,
  no entrance animation per section, no idle loop, no hover choreography beyond
  the existing state changes. Under reduced motion the tree's leaves are simply
  there, and a chosen leaf is ringed and lifted without stirring.

## The painted mark, and the register it must keep

`PRODUCT.md:94` - "No pressure, ever. No streaks, no guilt, no achievement
language. History is a record to enjoy, never a target to maintain." This is
the part of the design system that is mostly about words.

**The mark.** A brush glyph, not a tick: a tick reads as a task ticked off a
list, and this is a record of having painted something. Sage (`--sage`) carries
the state as a 38% fill, which is neither the rose of Saved nor the teal of a
primary action - marking something painted is a quiet note to yourself.

**The glyph is ink, not sage.** Measured: ink on the sage-tinted fill is
**10.23:1**, comfortably past AA. A sage glyph on `--surface-raised` would be
**1.96:1** and fails 3:1 outright, which is the same reason rose carries the
heart but never the word.

**Rules for anything that shows practice history:**

1. **Absolute dates only.** "14 September", never "six days ago". A date
   measured from *now* implies a clock you are falling behind.
2. **Nothing reads across the dates.** No gaps, frequency, last-painted,
   longest run or this-month-versus-last. `src/lib/painted.ts` exposes a store
   and no summary, and a test asserts it stays that way.
3. **A count is framed as Saved's is** - a plain number beside the section
   heading. Never "x of y", never "this month", never progress toward anything.
4. **No achievement vocabulary.** "Mark as painted" and "Painted". Never
   Complete, Done, Finished, Achievement, Milestone, Goal, Streak.
5. **The empty state invites, it does not correct.** Saved's register: "Tap
   the heart on a piece you like the look of and it will wait here for you."
6. **Nothing in the app chrome.** The header carries a saved count; painted
   stays inside the studio. A tally of paintings in the furniture is a
   scoreboard however it is worded.
7. **Never punishing.** Painting another piece only ever adds to the record,
   and time passing changes nothing about it: no wilting, no fading, no
   seasons. The only thing that takes a piece out is unmarking that piece -
   and on the painted tree, where leaves are places in the order things were
   painted, the pieces after it then close up by one, so the tree loses its
   newest place rather than gaining a hole.
8. **No targets.** Nothing is drawn or said that waits to be filled - no empty
   place, no outline to colour in, no "x to go", no end state. A record that
   shows room still to fill is a target however it is drawn.

Rules 1, 3, 4, 5 and 6 are enforced by tests in `src/screens/Painted.test.tsx`
and `e2e/painted.spec.ts`, and 7 and 8 - with 1, 3, 4 and 6 again for the
tree - by `src/lib/tree.test.ts`, `src/components/PaintedTree.test.tsx` and
`e2e/tree.spec.ts`, because they are the requirement rather than a preference.

**Where the control lives.** The detail view's action row, and the enlarged
view's title bar - both places where someone has actually just painted.
Deliberately not on cards or on Today: marking something painted from a grid,
before opening it, is not a thing that happens.

## The painted tree

Roadmap item 3, built 01/10/2026: a leaf for every piece marked painted, washed
in that piece's own colours, heading the studio's Painted section. The feeling
it is for is flipping back through your own sketchbook - "look what I've made",
never a ledger. Plan and evidence: `docs/plans/artistic-progress.md`.

**How it grows** (`src/lib/tree.ts`). One drawing for everyone, deterministic,
a function of the count alone - it cannot know when anything was painted. Each
branch forks into a leader that carries on nearly straight and a lateral that
turns off to alternating sides (Honda's model; symmetric forks made a flat
umbrella). Leaves arrive level by level and alternate halves, so the tree is
balanced at every count; a branch is drawn only once its first leaf exists, and
grows longer as the tree ages. So it is a stem with one leaf, a three-leaf
sprout, a young tree by twenty, a round crown by fifty, and there is no last
level. The drawing is framed to the tree it is, centred on the trunk: a small
tree is never shown small on an empty page.

**Its colours** (`src/lib/leafColour.ts`). Only colours the piece names. The
body is the piece's first pigment with any chroma (CIE C* 20 or more) - 70 of
189 pieces open on Cool Grey, Ivory Black, Warm Grey or Chinese White, which is
the ground or the shadow rather than the subject - charged wet-in-wet with the
swatch after it at the tip. A palette of neutrals keeps its first swatch that
can be seen on the paper (L* 88 or darker - Chinese White measured 1.04:1 on
the mat, a leaf that read as an outline waiting to be coloured in), with a
paler one it passed over charged in at the tip: a grey piece grows a grey leaf,
a misty one a grey leaf with a white tip. Only a palette with nothing darker
than white grows a white leaf. No palette at all takes the subject's pigment.
Each leaf is a wash, thinner the darker the pigment, with the pigment pooled
darker at its rim; branches are `--bark` over a paler wash of it.

**The hand in the line** is geometry, not a filter: each leaf's edge and each
branch's width wander a little, seeded per leaf and branch. An SVG turbulence
filter over the drawing was re-rasterised on every tap and measured at
660-780ms per choice on a phone profile at 4x CPU throttle with 189 leaves.

**Layout.** On the neutral mat, like the warm-up illustrations, at 5:4. Phone:
drawing, leaf card, caption, stacked. From `md`, and in the propped posture,
the drawing sits beside its leaf card; propped, it is capped by the screen's
height under the header.

**Choosing a leaf.** The drawing is one `listbox`, one tab stop, its options
the leaves oldest to newest, each named "Ripe Pear, in Cadmium Yellow, painted
14 September"; the newest is chosen first, and a choice is held by its piece,
not its place. A tap takes the leaf under the finger - measured to the leaf's
own shape, since a young tree's leaves are ~100px long on a desktop and a tap
near a tip was out of reach of the centre - the one drawn on top where leaves
overlap, or else the nearest within 32px, so a dense crown still works with wet
hands. Arrow keys, Home and End step through the leaves, and leave Alt, Ctrl
and Cmd shortcuts to the browser (Alt+Left is Back). Previous and Next leaf
buttons (44px) do the same on touch, say aloud the leaf they land on through a
polite live region, and at either end say so with `aria-disabled` rather than
disabling themselves under the finger, which would drop keyboard focus. The
chosen leaf is lifted and ringed in dashed teal - never colour alone. While it
arrives, its ring appears as the brush lands on it, a `--t-rise` after its
press, and never before - the newest leaf arrives last, and a ring shown from
the start circled the empty place it would grow. On a
fine pointer a dotted ring previews the leaf a click would take. The leaf card
names the piece, its date and its two pigments, and its title is the row's one
link (`.card-link`), which morphs the plate into Detail.

**Performance** (Pixel 7 profile, 4x CPU throttle, measured 01/10/2026). The
settled drawing is about 190 elements - one path per leaf, the branches merged
- and takes no pointer; the listbox over it takes none either, and the stage
beneath does the choosing. Choosing a leaf: 64-128ms interaction at 40 leaves,
160-232ms at 189, where the studio's own grid of 189 cards is most of what is
left. Arrival: 16.7ms median frame at both.

**What it must never do**: register rules 7 and 8 above, and the motion rules -
it plays once, waits to be seen, and is still under reduced motion.

## Assets and provenance

Reference artwork is the curated catalogue: 189 photographs and museum works
(150 Pexels, 15 Unsplash, 24 The Met), each approved by hand and credited on
every surface that shows it. The full list is `docs/CREDITS.md`, generated with
the catalogue by `npm run catalog:build`. It replaced the twelve CC0
placeholder SVGs on 29/09/2026; those remain only as unit-test fixtures. Icons
are authored SVG in one stroke weight; no emoji.

### Sources and licences

Every reference carries a structured `credit` - maker, holding institution,
object URL, date, medium, licence and the date the metadata was captured - not
a free-text string. The licence allowlist is enforced at build time.

| Source | Licence | Images |
| --- | --- | --- |
| Prototype placeholders | CC0 1.0 | Ours; unit-test fixtures only since 29/09/2026 |
| Pexels | Pexels License (not CC0) | Hotlinked from its CDN |
| Unsplash | Unsplash License (not CC0) | Hotlinked; its guidelines require it |
| The Met, Smithsonian, Art Institute, Rijksmuseum | CC0 1.0 | Downloaded at build, served as our own AVIF/WebP |

### The credit line

**Every surface that shows a reference shows who made it.** CC0 requires no
attribution and neither photo licence does either; the credit is a product
commitment, not a licence obligation, so `CreditLine` never branches on
`licence.requiresAttribution`.

- Three densities. `compact` (Browse cards, the featured plate) is the maker
  and the licence name as plain text. `inline` (the enlarged view) links the
  maker, the work and the licence. `full` (Detail) adds date and medium.
- `text-[0.8rem] text-ink-faint`, the same size as the existing plate caption.
- **Always below the mat, never over the artwork.** The same rule as ornaments:
  nothing sits on the surface a painter is mixing colour against. In the
  enlarged view the credit joins the title bar, so everything that is not the
  bar is still artwork.
- Outbound links carry `rel="noopener noreferrer"`; Unsplash links carry the
  UTM parameters its guidelines require.
- Platform credits ("Photos provided by Pexels") are an application-level
  obligation and live in the footer, built from the sources actually on screen,
  so switching a source off removes its line.

### Warm-up illustrations and inspiration photos

**Illustrations** (`ExerciseArt`, 20 drawings, one per variation) are original
SVG drawn for Little Wash. They use the variation's own suggested colours, so
the example shows what the list asks for, and they are deliberately loose - a
beginner should think "I could do that". The paint is three shared SVG filters
rendered once per screen by `ExerciseArtDefs`: a crisp wash with pigment pooled
at its edge, a soft wet-in-wet bloom, and a frilly backrun. Each is captioned
"A Little Wash illustration. Yours will look different, and that's fine."

**Photos** sit on the five scenic variations only - soft clouds, layered
mountains, fading sky, sunset wash, misty landscape - and nowhere else, because
there a real photograph shows how gently one colour becomes the next. Each was
proposed from Pexels or Unsplash, checked against the provider's API (standard
licence, not Unsplash+ or sponsored; Unsplash use reported as its guidelines
require), and approved one by one by the curator on 29/09/2026. They are fixed
to their variation in `src/data/inspiration.ts`: nothing is random, rotated or
searched at run time.

- Headed "Photo inspiration" and captioned "A real photograph to look at while
  you paint, not a painting to copy", so a photo is never mistaken for the
  example. They go through `RefArt` and `CreditLine` like every reference:
  uncropped on the neutral mat, lazy-loaded, an honest message if they fail,
  and credited inline with links to photographer, platform and licence.
- Alt text is ours. Provider captions are machine-written and can be wrong -
  the sunset's claims a plane that is not in the photograph.
- They obey the Sources switch: turning a platform off hides its warm-up
  photos, and the footer's platform credits include them explicitly.
- `docs/CREDITS.md` lists them in their own section, generated by
  `npm run catalog:build` like the rest of that file.

### Reference images

Intrinsic size comes from the item, never from the component: `RefArt` used to
hard-code 1000x1000 against twelve square SVGs, and photographs are not square.
Each item carries its own width ladder, and a low-quality placeholder is drawn
as a sibling element that unmounts on load - never a filter on the artwork,
which must report `filter: none` once settled.

**The plate takes the reference's shape, on the screens where the artwork is
the point.** Today's featured plate and Detail's plate set `aspect-ratio` from
the item's intrinsic size (`RefArt ownAspect`, `.art-ratio`), clamped to the
0.5-2.0 range the ingestion pipeline enforces. The viewport caps still decide
how large it gets; `max-width` is now the cap multiplied by the ratio, which is
what keeps a height-capped plate from staying full width and letterboxing
anyway.

Detail's half of this did not work until 29/09/2026, and square placeholders
hid it because 1 is their right answer. The cap reads `--ar` on `.detail-art`,
the plate, but the ratio was set on the mat inside it, and a custom property
inherits downward only: every Detail plate was sized as a square. `Detail`
now sets `--ar` on the plate itself, from the same `plateRatio` `RefArt`
uses, and `Detail.test.tsx` asserts it.

They used to be fixed - `aspect-[4/3]` on Today, `aspect-square` on Detail -
which was right when every reference was a 400x400 SVG. Measured against the
first broad harvest (53% square-ish, 22% tall portraits, 14% wide), a fixed
plate left the artwork filling **45% of the plate at 0.6, and 17% on desktop**,
the rest empty mat. Verified after the change: 100% at every ratio, with tall
and square references gaining about 45% more artwork area on a phone.

**Cards keep their fixed ratio.** `PieceCard` stays `aspect-[5/4]` on purpose:
a grid of differently shaped cards reads as broken rather than as varied. The
rule is that the plate follows the artwork where the artwork is the subject of
the screen, and follows the grid where the grid is.

## Roadmap (future phases, not yet built)

**Ruled out (decided):** conventional progress rewards, points, streaks or
gamification - to uphold PRODUCT.md's "No pressure, ever. No streaks, no guilt,
no achievement language." The only progress feature is the celebratory visual
below, which never punishes a missed day.

1. ~~**Small themed series**~~ - **built 30/09/2026**: "Seven tiny skies", "A
   week of leaves" and "Six fruit cross-sections" (in place of "Five cafe
   treats", which the catalogue could not fill honestly - it holds one treat).
   See **Small series** under Components.
2. **Gentle continuity** - optional reminders and a private painting history,
   never requiring public sharing.
3. ~~**Artistic progress tracking (celebratory, never punishing)**~~ - **built
   01/10/2026** as the painted tree: a leaf for every piece painted, in its own
   colours, with no streaks, no targets and no achievement language. See **The
   painted tree**.

Plus the standing backlog: saved-list screen, PWA/offline, Supabase, backend
reminder scheduling, real curated licensed imagery + provenance pipeline, CI.
