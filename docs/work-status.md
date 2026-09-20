# Work status - little wash

_Last updated: 19/09/2026_

## Where this stands - 19/09/2026

Open PR: **heeaaa/little-wash#1**, branch `feat/design-pass-and-ci`, four
commits, **CI green on both jobs**. `main` is untouched.

Gates on the branch: lint clean repo-wide, typecheck clean, 108 unit and
component tests, 93 end-to-end checks, coverage 94.22 statements / 89.25
branches with thresholds enforced.

### Decisions taken, so they are not silently revisited

| Decision | Choice | Why |
| --- | --- | --- |
| Saved screen shape | "Your studio" at `/studio`, saved pieces as section one of a stack | Room for the roadmap's practice history without a redesign |
| Its entry points | Header palette always links; "Studio" nav item only once something is saved | An empty destination advertised everywhere is the dead end the screen exists to fix |
| Unsaving | Immediate, no undo | Matches the palette, where a swatch simply lifts back off |
| Time bands | Real ranges, inclusive `min` / exclusive `max` | Upper bounds meant "Over 20 min" returned everything while styling itself as narrowing |
| Dealt piece | Lives in the URL, written with `replace` | Survives reload and is shareable; `replace` keeps skipped deals out of history, so Back leaves the screen rather than stepping through them |
| Motion | One system, two moments - move and re-wet | "The paper is never cut, only moved or re-wet"; recorded in full in DESIGN.md |
| Landscape layouts | Side by side, placed with grid, DOM order untouched | The documented control hierarchy must survive the reflow |
| Evidence images | `Claude outputs/` is gitignored and untracked | 21 MB of binaries that change every run |
| `test:integration` | Deliberately absent | No backend to integrate against; an empty green job is worse than an honest gap |

### Still open, and deliberately not decided here

1. **A "Painted - coming soon" placeholder in the studio.** The chosen
   direction's sketch showed one; it was left out because it repeats the
   entry-point-ahead-of-capability defect the critique flagged twice, and risks
   reading as a scoreboard against "No pressure, ever". Structural room exists -
   adding it is one more `StudioSection`.
2. **"Browse the studio" vs "Your studio".** Two uses of one word. A copy call.
3. **Branch protection.** Workflow YAML cannot require its own checks. Require
   *Lint, types, unit tests, build* and *End-to-end journeys* on `main` in
   repository settings.

### Known and accepted

- At **568x320** - an old phone in landscape - Today's primary action sits below
  the fold. That viewport leaves 199px under a 121px header while the identity
  block alone is 190px. Both current landscape phones pass.
- At **320 CSS px** the four-item nav is wider than the viewport and scrolls
  within itself. The page does not scroll horizontally, so WCAG 1.4.10 holds.
- `StickyNote` is built and unused. DESIGN.md keeps it available for other
  surfaces; it now paints from the `--note` token.

### Code review - 13 findings, all fixed

An independent high-effort review after CI went green found 13 issues, **none of
which the pipeline could see**. Three mattered: `axe-core` was an undeclared
dependency, so the WCAG gate rested on a transitive hoist; an `AppShell` test
claimed to cover "the last piece is removed" and removed nothing; and closing
the enlarged view started two view transitions, the second cancelling the first
(measured 2, now 1). The rest were races, a nav/studio count mismatch, a
modifier-click arming a jump, non-tiling band endpoints, an arbitrary sleep in
an e2e spec, a comment promising Back navigation `replace` cannot give, and
stale README numbers. Full list on the PR.

The lesson worth keeping: green CI is not the same as correct. The pipeline
cannot see an undeclared transitive dependency, a comment that contradicts its
code, or a test that asserts the wrong thing.

## Decision / phase

Adopted the official **little wash** brand (`assets/branding.png`) as the visual
source of truth and applied it across the approved "Studio Table" structure.

- Palette remapped to brand: Paper `#F5F1E8`, Deep teal `#25616A`, Sage
  `#A8B99B`, Rose `#D96986`, Ink `#2E2D29`.
- Type set to brand: Libre Baskerville (display) + Source Sans 3 (body) + Caveat
  (hand).
- Real logo used: transparent watercolour "w" mark in the header beside the
  lowercase "little wash" wordmark (Libre Baskerville); favicon / app-icon set
  generated from the mark on a Paper tile; `site.webmanifest` added.
- Subject colour-coding retuned to muted, brand-harmonised hues (still-life =
  teal, creatures = rose).
- Collapsed the exploration scaffolding: removed the Bold/Calm switch, the
  second "Scattered Accents" treatment and the chooser. The `treatment`
  branching, `DirectionId` and the `/a` URL segment are now gone too: the app
  opens on Today at `/`, pieces are `/piece/<id>`, and legacy `/a/...` links
  redirect onto the flat route with their tail intact.
- Originals kept intact in `assets/`; only derivatives created (in
  `src/assets/brand/` and `public/`).
- `DESIGN.md` updated with the adopted rules, contrast usage limits and full
  asset mappings.

## Audit findings (summary)

- `logo-trans.png` - clean transparent icon; was oversized (1.16 MB) and
  off-centre (content touched the bottom edge). Fixed by trimming to the alpha
  bounding box and re-padding to an even square derivative.
- `logo-text.png` - good master lockup but has a baked paper background (no
  transparency); use on matching paper only. The header uses the transparent
  mark + live wordmark instead.
- `logo-1024.jpg` - mark on solid white, JPEG; the white tile clashes with the
  Paper brand ground, so app icons are generated on a Paper tile instead.
- Palette contrast: Ink and Deep teal pass AA on Paper; **Rose fails AA for
  small text** (accent/graphic only); **Sage is too light for text** (fills
  only). Recorded as usage rules in DESIGN.md.

## Verified

- `tsc -b`, `eslint --max-warnings=0`, `vite build`, single-file build: PASS.
- `vitest run`: 41/41 PASS.
- Rendered inspection at 390 / 768 / 1440 px across Today, Browse, Exercises,
  Detail, empty state, enlarged dialog; keyboard-focus walk shows the teal focus
  ring. Before/after screenshots delivered in chat.
- The Impeccable launcher is a Windows binary and cannot execute in this cloud
  session, so its `critique` / `audit` / `polish` scripts could not be run; the
  equivalent manual audit and polish were done per the skill's references and
  its launcher-unavailable guidance.

## Checkpoint - 19/09/2026: Today restructured (phone-led)

**Objective.** Fix the P1 from `/impeccable critique` (25/40): on a phone the
filters sat ~2,500px below the results they act on, and the primary action was
below the fold. Approved via `/impeccable shape`.

**Decisions taken.**

- Piece first, no gate. Time and energy become the primary control directly
  under the piece; subject demotes to a bottom sheet below `lg` and to below a
  rule in the desktop rail.
- "More to try" removed from Today; Browse owns the catalogue.
- Palette moved below the controls.
- Sticky note dropped from Today (it duplicated the prompt and was the loudest
  colour on the screen). Recorded in DESIGN.md.
- Teal chip fill now marks an actually-narrowing filter; the default "Any" reads
  as selected but quiet.
- `pickDaily` reseeded on **date + active filter combination**. The old rule
  picked from the whole catalogue and fell back to the first match, so a
  two-item pool was dominated by its first item on **75%** of days (measured)
  where a fair share is 50%. With the filters now primary this made the app feel
  stuck. Regression test verified red against the old implementation first.

**Changed.** `src/screens/Today.tsx`, `src/screens/Browse.tsx`,
`src/components/FilterControls.tsx` (restructured into `PrimaryFilters`,
`SubjectGroup`, `SubjectSheet`, `ClearFilters`), `src/components/EmptyState.tsx`,
`src/components/SurpriseButton.tsx`, `src/components/Icon.tsx` (added `tag`),
`src/state/AppContext.tsx`, `src/lib/catalog.ts`, `src/index.css`
(`.art-cap`, `.sheet`, `.piece-settle`), tests, `DESIGN.md`.

**Verified.** `tsc -b --noEmit` clean; `eslint src` clean; `vitest run` 52/52
PASS (was 41); `npm run build` succeeds. Measured in Chromium at 390x844,
768x1024, 1440x900: primary action above the fold at all three; artwork 100%
visible while both control groups are in view; sheet is `:modal`, Escape closes
and returns focus; no horizontal overflow; no console errors. Detector URL scan
on Today fell from 7 to 3 primary findings at 390 and 10 to 5 at 1440, with
`first-viewport-column-overflow` cleared.

**Known baseline failure (pre-existing, unrelated).** `npm run lint` exits 1 on
the Impeccable skill's own bundled vendor JS under `.claude/skills/` and
`.agents/skills/`. Add those paths to `eslint.config.js` ignores, or scope the
script to `src`.

**Done since.** `/impeccable adapt` fixed the enlarge dialog (viewport-sized,
full-bleed on small screens, side rail in short landscape; art >= 80% of the
shorter dimension at every tested size). `/impeccable audit` closed the
accessibility gaps: `--ink-faint` darkened to `#6A665C` so it clears AA on every
surface, header/wordmark/skip targets raised to 44px, `summary` added to the
focus-ring selector, and Browse cards collapsed to one link each. `/impeccable
polish` renamed `.sticky` to `.note-paper` (it was leaking a drop shadow onto
the sticky header), added `--note` as a real token, put the difficulty note in
`MetaRow` so it travels with every label, stripped the `chaos`/`scattered`
branching and `DirectionId`, and dropped the `/a` URL segment.

`/impeccable overdrive` then gave piece changes a motion system built on View
Transitions, under one rule: the paper is never cut, only moved or re-wet.
Navigating morphs the artwork between Today, Browse, Detail and the enlarged
view; dealing dissolves it through an animated turbulence field. Both fall back
to an ordinary update where the API is missing or motion is reduced, and the
settled reference is always the unfiltered image. Measured at 60fps on a
4x-throttled profile after fixing `baseFrequency` (animating it regenerated the
noise field every frame and halved the frame rate). DESIGN.md's motion section
was rewritten from "one authored moment" to the four-step scale and two moments
this now uses.

`/impeccable delight` then replaced the header's heart-and-count with the saved
palette: a row of swatches in the actual first pigment of each saved piece,
most recent first, capped at five. A record rather than a score - it falls when
a piece is unsaved and uses no achievement language. It does not resolve the
saved-list dead end below; it acknowledges the save, which nothing did before.

`/impeccable critique` then ran a dual-agent review of `src`: **26/40** (trend
25 -> 26), 0 P0, 3 P1, 2 P2. The report was delivered in the session and the
run was stopped before its snapshot was written, so `.impeccable/critique/`
still holds only the earlier 25/40 run. Its findings are captured in full
below rather than by reference.

The score barely moved even though five heuristics improved, and that is the
useful finding. The deterministic floor is now clean - 0 detector findings
(positive-controlled), 0 axe violations across 12 runs, a contrast floor of
5.08:1, no reflow failure down to 320 CSS px, 0 console errors, a focus ring on
every one of 100+ tab stops. With the mechanical defects gone, the pass reached
product-level problems earlier runs never got to. Heuristic 2 dropped 4 -> 2 not
because anything regressed but because this run found the time-band semantics.

## Next

The critique's P1s and P2s are closed. Remaining, in order:

1. **Real reference imagery with provenance.** Moved to the front on
   20/09/2026 at the user's direction. The catalogue is twelve AI-generated
   placeholder SVGs; PRODUCT.md names open-licensed and public-domain
   collections as the real source, with per-item attribution and provenance as
   a first-class data requirement. It sets the precache budget, the data model
   and the storage question, so it should precede the phases that depend on
   those.
2. **PWA / offline.** Planned in full and **parked** on 20/09/2026 - see
   `docs/plans/pwa-offline.md`, which carries the approved decisions, the
   measured baseline, six workstreams and the two font questions still open.
   No service worker is registered although the manifest and full icon set
   ship, so the install surface is ahead of the capability.
3. **Supabase**, backend reminder scheduling, and CI.

Known and accepted, not defects to chase:

- At 320 CSS px the four-item nav is wider than the viewport and scrolls within
  itself. The page does not scroll horizontally, so WCAG 1.4.10 holds.
- At **568x320** - an old phone in landscape - Today's primary action still sits
  below the fold. That viewport leaves 199px under a 121px header while the
  identity block alone is 190px; it cannot fit without removing content. The
  two current landscape phones (844x390, 667x375) both pass.
- Browse's h1 is "Browse the studio" and the saved screen is "Your studio". Two
  uses of one word; arguably coherent, still a copy decision worth making.

## CI and end-to-end tests - built

Everything through this session was verified with throwaway scratchpad scripts
and then deleted, so none of it was protected. CLAUDE.md specifies `test:e2e`,
`test:integration` and GitHub Actions as scaffolding that should already exist;
none of it did.

**`e2e/` - 31 Playwright journeys, run on three viewports (93 checks):**

| File | Covers |
| --- | --- |
| `discovery.spec.ts` | Today -> deal -> detail -> enlarge -> save -> studio, the flow CLAUDE.md names, plus one-link-per-card and the studio empty state |
| `filtering.spec.ts` | every time band narrows and none returns the catalogue; filters survive reload; the empty state explains itself where it can be seen; collection jump; junk params ignored |
| `posture.spec.ts` | the propped phone - no sideways scroll on any route, Detail's plate and Enlarge in the first screen, Today's action in the first screen, the enlarged view >= 80% of the short axis unclipped, and the settled reference unfiltered |
| `accessibility.spec.ts` | axe on all five routes, the 44px floor, the skip link, a focus ring on every tab stop with no trap, reduced motion as a clean cut |

Runs against the **production build**, not the dev server. Data is isolated by
construction: every test gets a fresh context, so `localStorage` starts empty
and seeds go through `seedFavourites`. **Retries are 0** - a retry that turns a
flaky failure green hides the thing CI exists to surface.

**`.github/workflows/ci.yml`** - two jobs on PRs and pushes to `main`. Actions
pinned to commit SHAs (resolved and verified against the API, not guessed),
`permissions: contents: read`, no secrets anywhere, superseded runs cancelled
except on `main`. Coverage and build artifacts always; Playwright report always
and traces on failure, 7-14 day retention.

**Two gates that were not real gates, fixed on the way:**

- `npm run lint` exited 1 on ~1,300 errors from vendored tooling in `.claude/`
  and `.agents/`. CI would have been red on day one. Those paths are ignored
  now and lint is clean across the whole repository, not just `src`.
- Coverage only counted `src/lib`, hiding every screen and component behind an
  exclusion. It now covers all substantive source (94.88% statements, 89.44%
  branches) with thresholds set just below actuals so they ratchet: 90/85/85/90
  overall, 95/88/95/95 for `src/lib`.
- `e2e/` and `playwright.config.ts` were outside every tsconfig, so the test
  code itself was not typechecked. `tsconfig.e2e.json` now covers them with
  both DOM and Node libs, since `page.evaluate` bodies run in the browser.

**No `test:integration`.** There is no backend to integrate against, and an
empty green job is worse than an honest gap. It goes in with Supabase.

**Needs doing by hand:** branch protection. Workflow YAML cannot require its
own checks. Require **Lint, types, unit tests, build** and **End-to-end
journeys** on `main` in repository settings.

## Cleared this pass

**P2 - a dealt piece is no longer lost.** `pinnedId` moved from component state
into the URL (`?piece=<id>`), so the piece someone chose to paint survives a
reload, a locked phone and a discarded tab, and can be shared. Changing a filter
now releases it, which also removed the case where a filter that still matched
the pinned piece played the 520ms wash and changed nothing on screen.

**P2 - the empty state comes to you.** Emptying the catalogue shortens the page
and the browser clamps the scroll; the explanation sat at y=31 behind a 121px
header, leaving three unlabelled buttons in a dashed box. The panel now brings
itself into view (`.jump-target`, reused from the Browse collection jump) when
it is not already visible. Focus deliberately stays on the control that emptied
the results - it is the way out. Verified: explanation at 257, header ends 121.

**P3 - the focus ring was a width the browser could not render.** `2.5px`
rounded to 2px at dpr 1, 2 and 3, so DESIGN.md documented a ring that never
existed. Now 3px, which also reads better in the glare-and-bad-light scene
PRODUCT.md describes. Verified 3px at all three ratios.

**P3 - Detail's back link follows you.** It always returned to Today, losing
your place in the catalogue and making a third link to `/`. It now names and
returns to where you came from, preserving filters. A `state.from` that is not
one of the app's routes is ignored rather than followed.

**P3 - Exercises chips follow the app's own chip rule.** They filled the default
"All" with teal - reserved for a chip that is actually narrowing - and carried
no check mark, so selection depended on colour alone. Both fixed.

**Deferred P1 tail - Today in landscape.** "Open this piece" sat at y=616 in a
390px viewport. The featured piece's three blocks are now placed side by side in
short landscape without reordering the DOM, so the documented control hierarchy
is untouched. 844x390: **310** (fold 390). 667x375: **366** (fold 375). Portrait
unchanged at 721.

## Browse collections - fixed

Reported from use: tapping a collection on a phone looked like nothing
happened. Measured, it did nothing visible - the results heading sat **1520px
below the fold** at 390x844 (1091 in landscape, 1131 on tablet), behind five
collection cards and the filter panel. Only the count and the live region
changed. The critique had caught the same thing as a Jordan red flag.

Choosing a collection now moves focus to the results heading, which carries the
scroll, the keyboard and the screen reader together. New `.jump-target` utility
supplies `scroll-margin-top` so the heading clears the sticky header.

| | before | after |
| --- | --- | --- |
| 390x844 | heading at 1520, off-screen | scrollY 1384, heading at **136** (header ends 121) |
| 844x390 | 1091, off-screen | heading at **96** (header ends 69) |
| 768x1024 | 1131, off-screen | heading at **96** |
| 1440x900 | already in view | **unchanged** - no jump when nothing is hidden |

Guards, all verified: a deep-linked `?time=short` URL does not jump or grab
focus; a filter chip leaves focus on the chip; reduced motion lands instantly
rather than smooth-scrolling; back-navigation returns to the full catalogue.
Three focus tests added, one verified red without the fix.

**Related, still open:** the P2 empty state landing behind the sticky header is
the same family of defect and can now reuse `.jump-target`.

## Detail in landscape - fixed

The plate had no viewport budget, so at 844x390 it was 762x762 inside a 390px
viewport. The first screen showed a header, a back link and the top edge of an
empty mat.

| | 844x390 | 667x375 |
| --- | --- | --- |
| document | 1583 -> **783** | 1503 -> **836** |
| title | 1052 -> **165** | 946 -> **165** |
| Enlarge (bottom) | 928 -> **359** (fold 390) | 803 -> **352** (fold 375) |
| artwork | 762 (195% of the short axis) -> 169 (43%) | 585 (156%) -> 162 (43%) |

Three changes: `.detail-art` caps the plate by viewport height; short landscape
puts plate and identity side by side, as `.enlarge` already did at the same
breakpoint; and the header drops to a single row above 640px wide, which was
costing 121px of a 375px screen. Enlarge also steps off the artwork in that
posture - on a 169px plate the floating button covered the subject.

Portrait, tablet and desktop measure identically to before.

**Layer note, learned twice the hard way.** These overrides fight Tailwind
utilities (`py-6`, `mt-5`, `p-3`, `absolute`, `hidden`, `md:block`), so they
live in `@layer utilities` with doubled class names. The first version sat in
`@layer components` and silently did nothing - including one no-op that hid
**both** navs between 640px and 768px wide until a measurement caught it.
Verified by reading computed styles, not by assuming.

**Not fixed, and next:** Today in the same posture still puts "Open this piece"
below the fold (616 vs a 390 fold). Today's control hierarchy is load-bearing
in DESIGN.md, so it wants its own pass rather than being swept in here.

## Time bands - fixed

`TIME_BAND_MAX = {5:7, 15:20, 30:Infinity}` matched on `minutes <= max`, so
every band also accepted everything shorter: "30 min+" read as a floor, behaved
as Infinity and returned all twelve pieces - a five-minute mug included - while
the chip took the teal fill reserved for a chip that is actually narrowing.

Bands are now real ranges, keyed by name rather than by a number that meant
something else:

| Band | Label | Spans | Pieces |
| --- | --- | --- | --- |
| `short` | Under 10 min | 0-9 | 4 |
| `medium` | 10-20 min | 10-20 | 5 |
| `long` | Over 20 min | 21+ | 3 |

They tile the catalogue exactly (4 + 5 + 3 = 12), so every band narrows, the
active-filter signal is honest again, and someone with a free afternoon can
finally ask for a long piece - which an upper bound cannot express.

Also changed: the "Five-minute starts" collection filtered on the old `"5"`
band and would have promised five minutes while returning up to nine. It is now
**"Quick starts"** on the `short` band. Stale `?time=5` links degrade to "Any
time" through the existing `readParam` guard rather than erroring.

Evidence: six tests go red against the old upper-bound logic and green on the
fix, three of them asserting against the shipped catalogue rather than a
fixture. Verified in the browser: short 4, medium 5, long 3, each band's
minutes inside its own range.

## Saved screen - built

Shipped as **Your studio** at `/studio`. The P1 above is closed: saving now has
a destination, and the header palette is the way in.

- **Thesis.** "Your studio", room to grow: saved pieces are section one, and the
  page is a stack of sections so the roadmap's practice history joins later
  without a redesign.
- **Route** `/studio`, nav label "Studio", h1 "Your studio".
- **Entry.** The header `SavedPalette` always links to it; the "Studio" nav item
  appears only once at least one piece is saved.
- **Unsave** removes from the list immediately, no undo. **Ordering** is most
  recent first, matching `SavedPalette`.
- **Resolved: no "Painted - coming soon" placeholder.** The chosen direction's
  sketch showed one; it was left out because it repeats the
  entry-point-ahead-of-capability defect the critique flagged twice, and risks
  reading as a scoreboard against "No pressure, ever". The growth room is
  structural instead - the page is a stack of `StudioSection`s, so adding
  "Painted" later is one more section. Reversible in a few lines if wanted.
- **Built.** `src/screens/Studio.tsx`; `BrowseCard` lifted out of `Browse.tsx`
  into `src/components/PieceCard.tsx`; the empty-state shell lifted out of
  `EmptyState.tsx` into `EmptyPanel.tsx` (its rendered output unchanged);
  `savedReferences()` added to `src/lib/catalog.ts` and used by both the studio
  and the palette.
- **Risks, all checked in the browser.** `PIECE_ART` is held **0** times at rest
  on Browse and the studio and claimed only on the navigating click, so the
  one-holder rule holds. Removing the last piece while standing on `/studio`
  keeps the route, shows the empty state and leaves the palette linking; only
  the nav entry goes. The `EmptyState` refactor left its tests untouched.
- **Also fixed on the way.** `SaveButton`'s saved label rendered in rose at
  **2.57:1** - a real AA failure, pre-existing but never reachable by earlier
  sweeps, which all ran with no favourites seeded so the saved state never
  appeared. The label now takes ink and rose carries only the heart, which is
  what DESIGN.md's contrast rules already required.
- **Open copy question.** Browse's h1 is "Browse the studio" and this is "Your
  studio". Arguably coherent - the studio is the place, yours is your corner -
  but it is two uses of one word. Worth a decision.
- **Known, accepted.** At 320 CSS px the four-item nav is wider than the
  viewport and scrolls within itself. The page does not scroll horizontally, so
  WCAG 1.4.10 holds (a single component may scroll in one direction), but the
  fourth item sits off-screen until scrolled. Two links point at `/studio` per
  route - the palette and the nav item - the same shape as the wordmark and
  "Today" both pointing at `/`, with distinct accessible names.

## Housekeeping

`src/directions/`, `ScatterMarks.tsx` and `Chooser.tsx` are gone;
`DirectionShell.tsx` became `AppShell.tsx`. `scripts/screenshots.mjs` has been
deleted too - it targeted the removed `#/a` routes, hardcoded a Linux Chromium
path and an output directory from another machine, and the Playwright suite
replaced it entirely.

## Roadmap

No gamification (decided). Future: small themed series; gentle continuity
(optional reminders + private history); celebratory, never-punishing artistic
progress visual. Plus backlog: saved-list screen, PWA/offline, Supabase,
reminder scheduling, licensed imagery pipeline, CI. Detail in DESIGN.md.
