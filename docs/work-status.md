# Work status - little wash

_Last updated: 03/10/2026_

## Checkpoint - 03/10/2026: Optional Google sign-in

**Objective.** Optional Google sign-in, so the pieces someone saves and marks
painted are kept with their account on every device, with guests otherwise
unchanged (open guest tabs now follow each other's lists, review finding 8).
On `feat/google-sign-in`, cut from `main` at `067d7c8`. The user asked for a
thorough plan, then implementation, then a PR; never merge (merging deploys).
Plan, decisions and evidence: `docs/plans/google-sign-in.md`. The owner's
steps: `docs/deploying-accounts.md`. Rules: DESIGN.md, "Accounts".

**Decisions (made here, recorded to be revisited).** Supabase Auth and
Postgres on the free plan; Google only, redirect with PKCE; Saved and Painted
follow the account; the first sign-in moves this browser's pieces in (later
painted day wins); offline changes are "last to arrive wins"; sign-out is this
device only; the offer lives in the studio and the footer only. The Supabase
project is `dbbjvtbaljprmfhmxdmr`; nothing here connects to it.

**Changed.** `supabase/` (migration, config, PGlite tests), `src/lib/account/`,
`src/state/AccountContext.tsx`, `src/components/account/`,
`src/screens/Privacy.tsx`, the guest lists' replace listeners
(`favorites.ts`, `painted.ts`, their hooks, `leavesSeen.ts`), `e2e/`
(`account.spec.ts`, `fakeSupabase.ts`), `e2e-live/`, `integration/`, CI's
accounts job, `test:integration` (backend) with the provider checks moved to
`test:providers`, DESIGN.md, README, PRODUCT.md.

**Evidence, measured.**

- An independent review: 1 high, 3 medium, 8 low. All fixed, each with a test
  shown red against the code before it; listed in the plan.
- Found while fixing them: backend tests leaked supabase-js clients from test
  to test (a leftover client refreshed a later test's session); a sheet left
  open when another tab signed in came back on the next sign-out. Both red,
  then green.
- Bundle: main JavaScript 136.80 to 148.80 KB gzip (+12.00 KB) against
  `main`; CSS 10.99 to 11.48 KB gzip; the sign-in chunk is 60.34 KB gzip,
  loaded only when the sign-in sheet opens or someone is signed in, and the
  only file with supabase-js in it.

**Verified locally, 03/10/2026 (Node 24.13; CI uses 22), on the final code.**
`npm run lint` and `npm run typecheck` exit 0. `npm run test:coverage`:
1,120 of 1,120 in 63 files; 97.47 statements, 93.23 branches, 93.77
functions, 97.47 lines, thresholds met. Playwright with CI's 2 workers: 264
of 264 on phone, propped phone and desktop; after one last class on the
dismiss button's focus ring, the account journeys again, 39 of 39.
Screenshots: `Claude outputs/google-sign-in/` and its `review-fixes/`.

**Not run here.** The real local Supabase stack (`npm run test:integration`,
`npm run test:e2e:live`): no Docker on this machine; CI's accounts job runs
them, and the PR's first run is their first evidence. Real Google, the real
project and real phones (the iPhone home-screen app especially): the owner's
step 6. A real screen reader.

**Next action.** The owner works through `docs/deploying-accounts.md`; then
the deploy-preview checks of step 6. If the iPhone home-screen app is left
signed out, the planned follow-up (sign-in in a window that stays in the app).

## Checkpoint - 01/10/2026: The painted tree

**Objective.** Roadmap item 3, artistic progress that is celebratory and never
punishing, on `feat/artistic-progress`, cut from `main` at `30a84c4` after
`feat/small-series` merged (PR #5). Built with Impeccable delight and
overdrive at the user's request; the user asked for planning, then
implementation without a round of questions, then a PR. Plan, decisions and
evidence: `docs/plans/artistic-progress.md`. Rules: DESIGN.md, "The painted
tree", "Painted on", register rules 7 and 8.

**Decisions (made here, recorded to be revisited).** A tree, leaf by leaf; a
one-stroke brush leaf; leaf colour from the piece's first pigment with chroma
(70 of 189 open on a neutral); growth and framing that never show room to
fill; arrival once per leaf when on screen, newest six; the empty state, Today
and Detail untouched.

**Changed.** New `src/lib/tree.ts`, `leafColour.ts`, `leavesSeen.ts`
(storage key `little-wash:leaves-seen:v1`), `src/components/PaintedTree.tsx`,
`e2e/tree.spec.ts`. Studio renders the tree; `PaintedNote` caches its date
formatters and exports `paintedOn`; `wash.ts` exports `prefersReducedMotion`;
`index.css` gains `--bark` and the tree's styles; DESIGN.md, README.

**Evidence, measured.**

- A real bug found in arrival frames: the trunk's id `""` is falsy, so the
  first leaf's stem never grew. Component test red, then green.
- Choosing a leaf, Pixel 7 profile at 4x CPU, 189 leaves: 658-796ms to the
  second frame before; 160-232ms interaction (Event Timing) after, 64-128ms at
  40 leaves. Five causes traced and removed (see the plan).
- Seven mutation checks, each red against a broken build.
- Bundle: +7.0 KB gzip JS, +0.7 KB gzip CSS against `main`.
- An independent read-only review: 0 high, 2 medium, 8 low. All fixed, each
  with a test shown red against the code before it (listed in the plan). One
  first fix was itself wrong - the ring circled empty paper while its leaf
  waited to arrive - and was caught in the arrival frames.
- Safari's engine: WebKit 26.6 on the iPhone 15 profile, from the single-file
  build (this machine's WebKit cannot reach a local server). Arrival, settled
  trees and a touch tap matched Chromium.

**Verified locally, 01/10/2026 (Node 24.13; CI uses 22), on the final code.**
`npm run lint` and `npm run typecheck` exit 0. `npm run test:coverage` with
the committed `Series.test.tsx`: 855/855 in 53 files, 97.3 statements /
93.95 branches / 92.61 functions / 97.3 lines, thresholds met (with the stray
file below: 855/858, its three red tests the only failures). Playwright with
CI's 2 workers: 225/225 on phone, propped phone and desktop. Two earlier
7-worker runs of the same code each had 2 of 225 time out at 30s - different
tests each time, on Today and a series step, the first pair on
`net::ERR_ABORTED` at the first navigation - which passed when re-run; the
machine was also running a browser. Screenshots:
`Claude outputs/artistic-progress/`.

**Not part of this branch.** `src/screens/Series.test.tsx` carries someone
else's uncommitted follow-up to the series work: three red tests for real
defects (Series back link loses filters; focus drops to the page on Previous
and Next; the enlarged view survives a change of piece) - one of them needs
jsdom's dialog shim to fail for the right reason. Left unstaged and untouched.

**Remaining.** A real iPhone and a real mid-range Android: Chromium only here.
The studio draws every painted card at once, which is most of a tap's cost
with the whole catalogue painted. CI on the PR.

## Checkpoint - 30/09/2026: Small themed series, Browse in pages

**Objective.** Build roadmap item 1, small themed series, on
`feat/small-series`. Two pre-existing problems found on the way were fixed
with it, one at the user's direction and one at their request mid-build.
Plan, decisions and acceptance criteria: `docs/plans/small-series.md`. Rules:
DESIGN.md, "Small series", "A new page opens at its top" and "Browse draws a
page at a time".

**Decisions (user, 30/09/2026).** Cross-section fruits in place of "Five cafe
treats" (the catalogue holds one treat); each piece shows its own painted date
and nothing adds them up; the scroll bug fixed app-wide; skies and leaves as
proposed; Browse paged with "Show more". **Awaiting the curator's review:** the
fruit list, and all three titles and blurbs, on the rendered pages.

**Changed.** Series: `src/data/series.ts`, `src/lib/series.ts`,
`src/screens/Series.tsx`, `SeriesCard`, `SeriesSteps`, Detail (series in the
URL, keyed by piece, name released when the plate has scrolled away), Browse's
Series section, the route. Scroll: `src/hooks/useNewPageAtTop.ts` in
`AppShell`. Paging: `src/lib/paging.ts`, Browse, `setFilter` releases `shown`.
Shared: `claimArtwork` and `releaseArtworkIfScrolledAway` in `wash.ts`,
`rewet(update, before)`, `WashLink moment`, `EmptyPanel titleAs`,
`PaintedNote` (from Studio), a 200px rung in `REMOTE_WIDTHS`.

**Evidence, measured.**

- Scroll bug, red then green: "a piece opened from far down Browse starts at
  its top" failed at plate y=-370 (phone) and y=-318 (propped) before the fix,
  passes after. Before/after at Pixel 7:
  `Claude outputs/small-series/scroll-{before,after}-pixel7.png`.
- Next from the foot of Detail on a phone: the artwork's morph started at
  translateY -472 and flew 694px; after the release there is no morph of the
  old artwork and the new one resolves in place. Desktop re-wets in place
  (group 190 to 190).
- Browse, Pixel 7 profile, CPU x4, whole catalogue: blocked main thread
  1,113 to 360ms, filter tap to paint 1,792 to 830ms, DOM nodes 6,383 to 1,106.
- Series strips: 20 plates, 276 KB at 400px wide; the 200px rung serves them.
- Mutation checks: the per-piece key, the "stays put" scroll rules and the
  failed-image test each go red when their code is reverted.

**Verified locally, 30/09/2026 (Node 24.13 - the repo pins 22; CI uses 22).**
`npm run lint` and `npm run typecheck` exit 0. `npm run test:coverage` 762/762
in 49 files, 97.11 statements / 93.6 branches / 91.97 functions / 97.11 lines
(baseline 642/642 in 41, 96.66 / 93.15 / 91.75 / 96.66). `npm run test:e2e`
195/195 on phone, propped phone and desktop (baseline 159/159); after that run
the filtering journeys stopped drawing the whole catalogue just to count it,
and `e2e/filtering.spec.ts` passed 18/18 on its own - CI runs the full suite on
the final revision. Impeccable finish review: "fix" with six items, all six
scored resolved on recapture, "ship" for those six (not a whole-surface
review). Evidence: `Claude outputs/small-series/` (pass1-3, motion).

**Remaining.** Curator review of the series content; collection covers pass no
`sizes` and download 1600px images for 96px plates (most of a phone's 1,685 KB
on Browse), left for its own change; the 830ms filter tap on a slowed phone;
real-device check; branch protection still unset.

## Checkpoint - 30/09/2026: Warm-ups and catalogue ready for main

**Objective.** Ship the curated catalogue, self-hosted fonts and rebuilt
warm-ups page to `main`. Branch `feat/real-catalogue-and-fonts`, pushed, with
a PR into `main` for CI. **Netlify is connected to `main`** (user-confirmed
30/09/2026), so merging that PR is the public deploy.

**Commits on the branch.** `161be52` catalogue and self-hosted fonts;
`17b1ec7` warm-ups with variations, guides and pictures (user-reviewed and
approved 30/09/2026); `66a2ebe` Browse's h1 is "Browse the catalogue" (closes
"Still open" item 2 below).

**Warm-ups decisions (user-approved 29/09/2026).**

- Layout: the list expands in place, one warm-up open at a time.
- Visuals: 20 original SVG illustrations, plus five photos the user picked
  (soft clouds, layered mountains, fading sky, sunset wash, misty landscape),
  fixed to their variation - no shuffling.
- A "Keep screen on" switch (Screen Wake Lock), hidden where unsupported.
- Not route-split: +14.1 kB gzip on the main chunk (111.66 -> 125.80 kB,
  468.8 -> 512.3 kB raw), which crosses Vite's 500 kB advisory. Revisit with
  the PWA work.

**Verified locally 30/09/2026, before commit.** `npm run lint` and
`npm run typecheck` exit 0; `npm run test:coverage` 642/642 in 41 files,
96.66 statements / 93.15 branches / 91.75 functions / 96.66 lines;
`npm run test:e2e` (build + Playwright) 159/159.

**Not verified.** Wake lock, install and touch on a real device.

**Next.** CI on the PR, then merge when the user says so. After that, on the
live site: a real-phone check, then the go-live tidy-ups (README still says
"working name ... prototype ... mock data"; DESIGN.md backlog is stale; branch
protection; a short privacy note; the two moderate `react-router` advisories).
PWA/offline is the next feature: `docs/plans/pwa-offline.md`, whose
Workstream 1 (self-hosted fonts) is already done.

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

1. ~~**A "Painted - coming soon" placeholder in the studio.**~~ **Closed
   20/09/2026** - built rather than placeheld, which answers the first
   objection. The second one was answered by rules rather than by restraint:
   see "The painted mark, and the register it must keep" in `DESIGN.md`, and
   the register tests in `src/screens/Painted.test.tsx`.
2. ~~**"Browse the studio" vs "Your studio".**~~ **Closed 30/09/2026** - Browse's
   h1 is now "Browse the catalogue" (user-approved). "Studio" means only the
   user's own space: the nav item, `/studio`, the header palette and "Your
   studio".
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

---

## Checkpoint - 20/09/2026: reference imagery, phase A

**Objective.** Replace the free-text provenance string with a real credit and
image model, and put the seams in place for the ingestion pipeline, without
touching the network. Plan: `~/.claude/plans/staged-crafting-bird.md`.

**Decisions taken with the user.**

- Catalogue will mix museum artworks and photographs, tagged `kind`.
- Sources: Pexels and Unsplash (hotlinked), Met, Smithsonian, Art Institute and
  Rijksmuseum (downloaded at build, self-hosted). Pexels leads in phase B.
- Source switching is a **settings preference** at `#/sources`, not a filter.
- Curation is heuristics producing a shortlist, then a local review tool.
- **Attribution is always shown**, on every surface, regardless of licence.

**Verified live against the providers, 20/09/2026.** Recorded because several
of these contradict the documentation:

- Unsplash and Pexels CDNs both send `Access-Control-Allow-Origin: *`, cache for
  a year and resize on demand. Pexels returns AVIF from the browser's `Accept`
  header; Unsplash needs an explicit `fm=avif`.
- The Met's image host sends **no CORS header**; the Art Institute's IIIF host
  **403s without `Referer: https://www.artic.edu/`**. Neither can be reliably
  hotlinked from our origin, which is why they are downloaded at build time.
- The old Rijksmuseum API (`api.rijksmuseum.nl`) is **HTTP 410 Gone**. The new
  one returns Linked Art JSON-LD with **ID-only search results**, so it needs a
  fetch per object and has almost no facets. It goes last.
- Openverse anonymous is **200 requests/day** - ingestion only, never runtime.
- Keys confirmed working: Pexels (200, and its real ceiling is **25,000/month**,
  not the documented 20,000), Unsplash (200, demo tier at 50/hr), Smithsonian
  (200 on a CC0 image search). Stored in gitignored `.env`.
- Pexels exposes **1,153 featured collections**, several directly useful:
  "Simply Citrus" (67), "Moka Pot Moments" (72), "Aquatic Aesthetic" (84).

**Changed.**

- New `src/lib/sources/` - `types.ts`, `registry.ts`, `attribution.ts`,
  `images.ts`. Pure; no fetch code and no key reaches the bundle.
- `PaintReference` loses `source: string` and `art: string`, gains `kind`,
  `credit` and `image`. The twelve placeholders migrated onto it.
- `CreditLine` (3 densities) on Detail, Today, Browse cards and the enlarged
  view. Platform credits in the footer, built from the sources on screen.
- `RefArt` rewritten: real `srcset`/`sizes`, per-item intrinsic dimensions
  replacing the hard-coded 1000x1000, an LQIP sibling that unmounts on load,
  and an error state instead of a broken-image icon.
- `#/sources` screen, `useSources`, `lib/sourcePrefs.ts`. Disabled ids are
  stored, not enabled ones, so a provider added later is on by default.
- `Collection` gains optional `referenceIds`; `lib/collections.ts` resolves
  either shape and drops collections that have emptied out.
- **Browse no longer imports `REFERENCES` directly** - the leak that would have
  bypassed source preferences.
- `.env.example` (placeholders only, no `VITE_` prefix). Docs updated:
  `PRODUCT.md` licence scope, `DESIGN.md` provenance section, `README.md`.

**Verified.** `npm run lint` exit 0. `npm run typecheck` exit 0.
`npm run test:coverage` 188/188 pass, 94.98 statements / 91.05 branches with
thresholds enforced (baseline was 108 tests, 94.22 / 89.25); `src/lib/sources`
at 100%. `npm run build` exit 0. `npx playwright test` 111/111 pass across
three device projects (baseline 93), including the colour-fidelity posture
check and axe on the new `#/sources` route. Screenshots taken at 390, 768 and
1440 px.

`vitest.config.ts` now excludes `src/lib/sources/types.ts` from coverage: it is
declarations only, so v8 instruments an empty module and reports 0%. Same
grounds as `vite-env.d.ts`. Every runtime value in that layer is still gated.

**Open, for phase B and C.**

1. `collectionSearch` has no URL for a list-backed collection - it returns the
   filter params, which for a curated list would mean no filter at all. No
   list-backed collection exists yet, so nothing is broken; phase C must add
   `?collection=<id>` and have Browse honour it before shipping one.
2. `DESIGN.md:139-140` fixes the Today hierarchy as "artwork -> identity ->
   primary action -> ...". The credit now sits inside identity, one 0.8rem line
   above the primary action. The posture test still passes; the line should be
   amended to name the credit.
3. "Visit Prototype placeholders" reads awkwardly for the placeholder source.
   Cosmetic, and it disappears when placeholders are retired in phase C.
4. Unsplash is on the demo tier (50 req/hr). Enough to ingest a curated set;
   production access (1,000/hr) is an Unsplash review, not a switch.
5. Unsplash's download-tracking endpoint is not implemented. It is a production
   integration, deferred per CLAUDE.md until that phase is requested.

**Next.** Phase B: `scripts/catalog/` - the provider interface, Pexels first,
then Unsplash and the Met; harvest, shortlist heuristics, the review tool,
committed API fixtures, the licence gates and a generated `docs/CREDITS.md`.

---

## Checkpoint - 20/09/2026: reference imagery, phase B

**Objective.** Build the ingestion pipeline and land the first three providers,
so a curated catalogue can be assembled. Plan:
`~/.claude/plans/staged-crafting-bird.md`.

**Changed.**

- `scripts/catalog/` - the whole pipeline, Node only, never imported from
  `src/`. `provider.ts` is the registry; adding a source is one file in
  `providers/` and one line there.
- Adapters for **Pexels**, **Unsplash** and **the Met**. Each splits into a
  pure `normalise()` and an impure `harvest()` that takes its `fetch` from an
  injected context, so both halves are testable without the network.
- `shortlist.ts` - sketchability heuristics that score and explain, never
  decide. Every candidate is kept with its reasoning attached.
- `build.ts` - the licence, provenance and alt-text gates, plus the generated
  catalogue module and `docs/CREDITS.md`. All problems are reported at once.
- CLIs: `catalog:collections`, `catalog:harvest`, `catalog:shortlist`,
  `catalog:review`, `catalog:build`.
- `catalog:review` is a local-only page answering the question `PRODUCT.md:68`
  left open - who curates, through what interface. It shows the image, the
  heuristic reasoning and a form, enforces the same alt rules as the build
  while you type, and writes to `catalog/approved/<source>.json`.
- `npm run test:integration` plus `vitest.integration.config.ts` - live API
  schema-drift checks, off by default, skipping with a printed reason when a
  key is absent.
- CI gains a catalogue-drift step: it re-runs `catalog:build` and fails on a
  diff, so the generated catalogue cannot be hand-edited past the gates. It
  reads only committed files, so CI still holds no secrets.
- `tsconfig.scripts.json`; vitest now collects `scripts/**/*.test.ts` and holds
  `scripts/catalog/**` to 80% (the project's floor for a new module).
- Dev dependencies added: `tsx` (runs the TS CLIs, and CI needs a reliable
  runner for the drift check) and `zod` (validates provider payloads). Neither
  reaches the bundle.

**Two real bugs the tests caught, both in code I had just written.**

1. Pexels capitalises its media discriminator (`"Photo"`, `"Video"`). The
   filter compared against lowercase `"video"`, so **every video would have
   passed through as a reference**. Now case-insensitive and allow-listed.
2. The Pexels page schema had both `photos` and `media` optional, so a payload
   of any unexpected shape parsed cleanly and yielded nothing - a change at
   Pexels' end would have looked like "no results" rather than failing. Now one
   of the two is required.

**Verified.** `npm run lint` exit 0. `npm run typecheck` exit 0.
`npm run test:coverage` 283/283 pass, 94.02 statements / 90.60 branches, with
`scripts/catalog` at 98.77 / 94.38 / 96.42 (baseline before this phase: 188
tests). `npm run build` exit 0. `npx playwright test` 111/111.
`npm run test:integration` 3/3 against the live Pexels, Unsplash and Met APIs,
and verified to skip with a printed reason when `.env` is absent.

End-to-end, against the live API: harvested 30 candidates from the Pexels
"Simply Citrus" collection, shortlisted to 17, approved one through the review
tool, built it, and confirmed the generated credit (institution, creator,
licence, object URL, capture date), the image delivery (`remote` - Pexels must
never be copied) and `docs/CREDITS.md` including the required platform credit.
The smoke-test entry was then removed; `catalog/approved/` is empty on purpose.

**Heuristics tuned against real data.** The first harvest ranked "a vibrant
flat lay of various citrus slices and herbs" near the top. "various", "flat
lay", "arrangement" and similar were added to the busy list, taking the
shortlist from 25 of 30 to 17 of 30, with a regression test carrying the
original phrasing.

**What the review tool proved.** Its top-ranked candidate scored well on
"close-up" and is a net bag of lemons with hands, twine and a plate in shot -
not sketchable at all. Metadata cannot judge a composition. The heuristics
order the queue; the person decides.

**Open.**

1. **No references are curated yet.** `catalog/approved/` is empty and the app
   still ships the twelve placeholders. Curation is a judgement call and is the
   user's to make: `npm run catalog:review -- --source=pexels` is ready, with
   30 candidates already harvested in `catalog/candidates/`.
2. `catalog.generated.ts` is not yet imported by the app. Phase C wires it in
   and retires the placeholders.
3. The Met is served locally, so it needs the derive-images step (`sharp`)
   before any Met entry can build. `toImageSet` throws clearly until then.
4. Unsplash's download-tracking endpoint is still unimplemented and deferred.
5. `npm audit` reports a moderate advisory in `react-router` 6.30.0, fixable
   only by a major upgrade to 7. Pre-existing, not introduced here.
6. ~~`collectionSearch` has no URL for a list-backed collection.~~ **Closed
   20/09/2026**, ahead of phase C, because a Pexels theme is exactly this
   shape. A curated collection now travels as `?collection=<id>`; Browse
   narrows to its list, the filters narrow within it, and "Show everything"
   leaves. An id that matches nothing, or a collection whose pieces have all
   gone because a source was switched off, falls back to the whole catalogue
   rather than a blank screen. 15 tests across `src/lib/collections.test.ts`
   and `src/screens/BrowseCollection.test.tsx`.

**Next.** Phase C: curate roughly 120 references, wire `catalog.generated.ts`
into the app, retire the placeholder SVGs, and update the tests that hard-code
catalogue facts.

---

## Checkpoint - 20/09/2026: curation assistance in the review tool

**Why.** Curating by hand was too slow to be practical, and the palette in
particular is not something anyone can eyeball reliably.

**Constraint that shaped it.** `PRODUCT.md:64` rules out runtime AI, so nothing
here calls a model. Every suggestion is computed from the actual pixels, which
for colour is better than a guess anyway.

**Changed.**

- `pigments.ts` - 31 named watercolour pigments, sRGB to CIE L\*a\*b\*, and
  nearest-pigment matching. **Lightness is weighted down to 0.45** in the
  distance function, because dilution is how value is controlled in
  watercolour: a pale wash of ultramarine is still ultramarine, and matching on
  lightness would call it a grey.
- `imageAnalysis.ts` - dominant colour clusters, border variance, value range,
  chroma, warmth. Pure, over a plain RGBA array.
- `suggest.ts` - two prompts, two tips, a palette, and a starting difficulty
  and duration.
- `learned.ts` - the growing approve/reject vocabulary, wired into
  `shortlist.ts`.
- `review.ts` - an image proxy (canvas pixel reads are blocked cross-origin,
  and the Met sends no CORS at all, so the bytes are served same-origin),
  a `/api/suggest` endpoint, and "Set aside" now asks why.

**Alt text is a scaffold, never a sentence.** The prompt and tip come out
finished because they are about *how to paint*, which follows from value range,
chroma and background. Alt text is about *what the thing is*, and nothing here
can see that, so it comes out as "A [what it is], [its shape or posture], in
naples yellow and warm grey, against a plain background." A complete-looking
description would be the plausible lie the build's alt gate exists to catch.
There is a test asserting every scaffold still contains a `[blank]`.

**A flaw the first real run exposed.** The palette for a bowl of lemons came
back "Chinese White, Warm Grey" - the pale tabletop outweighed the fruit by
area. Two fixes, both tested: the palette is built from the **central 60%** of
the image, and anything reading as bare paper (L\* > 86, chroma < 10) is
excluded, because white is the paper's job and not a pigment. The same photo
now gives Naples Yellow, Warm Grey, Burnt Umber, Burnt Sienna.

**The learned vocabulary is deliberately timid.** A phrase needs three
decisions and three-quarters agreement before it counts, and the signal is
capped at +/-2, well below the hard rules - a test asserts a panorama stays out
however often its phrasing was approved.

**Verified.** Lint, typecheck, build exit 0. `npm run test:coverage` 354/354
pass, 94.78 statements / 90.38 branches, `scripts/catalog` at 98.25 / 91.31 /
98.21 (was 283 tests before this). `npx playwright test` 111/111. Driven in a
real browser against a live Pexels photograph: pixel readings, palette, prompt,
alt scaffolds and tips all rendered, clicking a suggestion filled its field,
no console errors. The rejection endpoint was exercised and confirmed to record
into the vocabulary and to stay silent below its three-decision floor.

**Cleaned up.** The test rejection written during that check was deleted:
`catalog/curation-vocabulary.json` should start from real judgements, not mine.

**Open, unchanged.** No references curated yet; `catalog.generated.ts` not yet
imported by the app; the Met needs the derive-images step; Unsplash download
tracking deferred; react-router advisory pre-existing.

---

## Checkpoint - 20/09/2026: catalogue variety, and a shortlist that reads pixels

**What prompted it.** The first curation session produced 8 references, all
fruit. Of the app's 54 filter combinations, 4 had anything in them, and the
"Under 10 min" band was empty outright. The cause was mine: I harvested one
themed Pexels collection as a pipeline smoke test and left it as the review
queue. It was never a catalogue plan.

**Two honest negative results, recorded in `scripts/catalog/thresholds.ts`.**

1. **No measurement separated the first 30 decisions.** `catalog:calibrate`
   measured 8 approvals against 22 rejections; every separation score landed
   between 0.36 and 0.61, where 0.5 is a coin toss. So **no hard threshold was
   defined**. Filtering on any of them would have been a guess dressed up as a
   measurement, and a candidate dropped by a threshold is never seen again.
   The reason is the sample: all 30 came from one citrus collection shot
   similarly, so there was almost no variance to find. The measurements are
   used for ranking instead, and `MEASUREMENTS_MAY_FILTER` is false until a
   varied harvest says otherwise.
2. **The perceptual hash does not catch "we already have a similar one".** The
   five candidates flagged that way sat 25-32 bits from their nearest approved
   neighbour, against a median of 32 across all 435 pairs. Their words explain
   it - "No more too many cross sectional slices of fruits" is a judgement
   about the catalogue's balance, not about two files being the same image.
   dHash is kept at a tight 8 bits for the case it *is* right for, and earned
   its keep immediately: the broad harvest dropped 8 near-identical images,
   including consecutive Pexels ids from the same shoot.

**Changed.**

- `focus.ts` - subject area, centrality, region count, sharpness, detail load.
  Each traces to something the curator actually said.
- `similarity.ts` - 64-bit dHash, Hamming distance, hue signature, dedupe.
- `measure.ts` - the only file that decodes an image (sharp), cached by image
  URL so re-running a harvest re-downloads nothing.
- `plan.ts` + `catalog/harvest-plan.json` - 30 queries across all six subjects,
  every one checked against the live API first.
- `coverage.ts` + `catalog:coverage` - the matrix, the floor for going live,
  and which planned queries fill each gap.
- `catalog:calibrate` - measures decided candidates and reports how well each
  measurement separates them. It changes nothing; its output is evidence.
- `shortlist.ts` now scores on measurements where they exist, captions only as
  a fallback.
- The review tool takes `--subject`, shows progress against that subject's
  target, prefills the subject from the harvest plan, and serves a 1200px
  display image rather than the original (the first botanical candidate is
  5272x5272, and the plate stayed blank while it downloaded).

**A regression the broad harvest exposed and fixed.** The learned vocabulary
was scoped globally, so a run of citrus rejections had "white" at 3-of-4 and
"vibrant" at 10-of-13 - and started pushing white peonies and yellow daffodils,
which are ideal subjects, down the botanical queue. Phrases are now recorded
and applied **per subject**. A test carries the exact case.

**Verified.** Lint, typecheck, build exit 0. `npm run test:coverage` 409/409
pass, 91.79 statements / 89.94 branches, `scripts/catalog` at 90.91 / 90.14 /
96.55 (354 tests before this). `npx playwright test` 111/111.

Real run: `catalog:harvest --plan` fetched and measured **444 candidates across
all six subjects**, dropped 8 near-identical, and left 436. Every measurement
now has real spread - subjectRegions 0-13, borderVariance 0-23.5, detailLoad
0-0.74 - where the citrus-only set had almost none. The top of the ranked queue
is now a snail on mushrooms, three pears on blue, a white peony, budding fern
fronds; the botanical queue's top candidate scores 14 and reads "one clear
subject in the frame, subject sits well in the frame, plain quiet backdrop".
Driven in a browser end to end, no console errors.

**Coverage now:** 8 approved, all fruit; 436 candidates waiting, spread
botanical 90, objects 86, creatures 75, still-life 71, landscape 70, fruit 44.

**Next.** Curate by subject - `npm run catalog:review -- --source=pexels
--subject=botanical` - and watch `catalog:coverage`. Once the floor is met
(8 per subject, 12 per band, 12 per difficulty), wire
`src/data/catalog.generated.ts` into `AppShell`, retire the placeholder SVGs,
and re-run `catalog:calibrate` on the varied data to see whether the
measurements separate decisions now that there is variance for them to find.

---

## Checkpoint - 20/09/2026: plates shaped like their reference

Done alongside a curation session, so deliberately confined to `src/` - nothing
in `catalog/` was touched.

**The defect.** Every plate carried a fixed ratio: `aspect-[4/3]` on Today,
`aspect-square` on Detail, `aspect-[5/4]` on cards. Correct when every
reference was a 400x400 SVG. The first broad harvest is **53% square-ish, 22%
tall portraits, 14% wide**, so this was about to become visible the moment the
real catalogue went live.

**Measured before and after**, in a browser, at real harvest ratios:

| ratio | phone, artwork fills | desktop, artwork fills |
| --- | --- | --- |
| 0.6 tall portrait | 45% -> 100% (x1.44 area) | 17% -> 100% |
| 0.8 portrait | 60% -> 100% (x1.44 area) | 23% -> 100% |
| 1.0 square | 75% -> 100% (x1.45 area) | 29% -> 100% |
| 1.33 landscape | already 100% | 39% -> 100% |
| 1.78 wide | 75% -> 100% | 52% -> 100% |

On a phone tall and square references gain about 45% more artwork area. On
desktop the artwork does not get bigger - the height cap already bound - but
the plate stops being a 1424px expanse of empty mat with the image marooned in
the middle.

**Changed.** `RefArt` gains `ownAspect`, used by Today and Detail. `.art-ratio`
in `index.css`, with `--plate-cap` and `--detail-cap` so `max-width` can be
`cap * ratio`. Cards keep their fixed ratio on purpose: a grid of differently
shaped cards reads as broken rather than as varied. DESIGN.md records both.

**Two traps worth recording.**

1. Tailwind's `aspect-[4/3]` is a *utility*, and utilities beat the components
   layer whatever the specificity - so `.art-ratio` could not simply override
   it. `RefArt` strips the fallback utility when a real ratio applies, which is
   also the clearer statement: exactly one thing decides the plate's shape. A
   test carries the case.
2. My first before/after measurement was wrong and read 0% waste for
   everything. `object-fit: contain` letterboxes the image *inside* its
   element, so the element's bounding box says nothing about how large the
   artwork actually is - the rendered size has to be derived from the natural
   size and the box. The numbers above are from the corrected measurement.

**Verified.** Lint, typecheck, build exit 0. `npm run test:coverage` 418/418
pass, 91.82 statements / 90.00 branches (409 before). `npx playwright test`
111/111, including the colour-fidelity posture check and the propped-phone
checks that constrain these exact plates. Geometry measured in Chromium at
390x844 and 1440x900; harness and screenshots in the session scratchpad.

**Not yet verified in the app itself**, because the catalogue still holds the
twelve square placeholders, for which the change is a no-op. The full visual
pass at 390 / 768 / 1440 belongs with the switchover.

---

## Checkpoint - 20/09/2026: tests decoupled from the catalogue

**Why.** Every spec pinned facts about twelve placeholder SVGs: `toHaveCount(12)`,
a 4/5/3 time-band split, and literal ids like `ripe-pear`. All of it would have
broken at once on the day the curated catalogue goes live, which is the worst
possible moment to be rewriting tests.

**The better framing.** The magic numbers were standing in for properties
nobody had written down. "4, 5 and 3" really meant *the bands partition the
catalogue and none of them returns all of it* - which is the defect that was
actually being guarded, and which holds at any catalogue size. Asserting the
property is both catalogue-independent and a stronger test than the number was.

**Changed.**

- `src/data/catalogue.ts` - one seam. Everything that needs "all the
  references" imports `CATALOGUE` from here, so the switchover is a single
  line in this file and nothing downstream names `references.ts` or
  `catalog.generated.ts`.
- `e2e/support.ts` - `catalogue`, `readPieces`, `pieceIds`, `pieceIdsFrom`,
  `smallestSubject`, `TIME_BANDS`. Everything is read through the same DOM a
  painter sees; nothing is exported from the app for testing.
- Specs assert properties: the bands partition the catalogue; Browse shows more
  than one piece; a saved piece is the one that was seeded; a collection
  delivers the count its card advertised.
- Component tests that are about a *screen's behaviour* now supply their own
  small catalogue via the test factory, rather than depending on what the real
  one happens to hold. Browse cannot demonstrate that a subject filter narrows
  if every reference shares a subject - true of the real catalogue today.

**Verified against both catalogues.** This is the part worth recording: after
the first pass, switching the seam to the real curated catalogue still broke
**five** tests, and after fixing those, **three** more. "One line" was only
true once it had actually been run. Final state, with `catalogue.ts` pointed at
each in turn:

- placeholders: 418/418 pass
- the curated catalogue (8 approved at the time of writing): 418/418 pass

Lint, typecheck, coverage thresholds, build all exit 0. `npx playwright test`
111/111.

**A trap worth recording.** `pieceIds(page)` navigates to Browse to read real
ids, and `context.addInitScript` only applies from the *next* navigation - so
looking up an id before seeding meant the seed never landed, and the studio
came up empty. `pieceIdsFrom(context)` reads on a scratch page and leaves the
page under test alone.

**What the switchover now costs.** One line in `src/data/catalogue.ts`, once
`npm run catalog:coverage` says the floor is met.

---

## Checkpoint - 20/09/2026: mark as painted

**What this closes.** `PRODUCT.md:58` lists practice history as a capability
and it was the one still missing. `docs/work-status.md` recorded two reasons it
was held back: a "coming soon" placeholder would be an entry point ahead of a
capability, and a panel of counts risked reading as a scoreboard against "No
pressure, ever". Building it answers the first. The second is answered by
rules, not by restraint.

**Shape**, from three decisions taken with the user: a **set**, not a log - a
piece is painted or it is not; a **flat grid, newest first**, with the date on
each card; and **independent of Saved** - marking something painted never
removes what someone chose to keep.

**Changed.**

- `src/lib/painted.ts` - the store, mirroring `favorites.ts`. Holds `{ id, on }`
  at local-calendar-day precision.
- `paintedReferences` in `src/lib/catalog.ts`, beside `savedReferences`, with
  the same choice to drop unknown ids rather than render holes.
- `src/hooks/usePainted.ts`, spread into the context alongside favourites and
  sources. It shares the clock `AppProvider` already threads through for the
  daily pick, so a recorded date is deterministic under test.
- `src/components/PaintedButton.tsx` - on the detail view's action row and in
  the enlarged view's title bar. Not on cards or Today.
- A `Painted` section in the studio, and `PieceCard` gains an optional `note`
  so the date sits inside the card.
- `AppShell` opens the studio for *either* list - counting only saved pieces
  would strand someone who has painted things but set none aside.

**The register, which is the actual requirement.** Six rules, recorded in
`DESIGN.md` and enforced by tests rather than trusted:

1. Absolute dates only - "14 September", never "six days ago".
2. Nothing reads across the dates. `painted.ts` exports a store and no summary,
   and a test asserts its exported surface stays that way, so a streak cannot
   be computed without someone deliberately adding code.
3. A count framed as Saved's is - a bare number beside the heading.
4. No achievement vocabulary.
5. The empty state invites rather than corrects.
6. Nothing in the app chrome.

**Contrast, measured rather than assumed.** Ink on the sage-tinted active fill
is **10.23:1**. The plan's guess that sage could not carry the glyph was right:
a sage glyph on `--surface-raised` is **1.96:1** and fails 3:1, so the glyph is
ink and sage is fill only - the same reason rose carries the heart but never
the word.

**Verified.** Lint, typecheck, build exit 0. `npm run test:coverage` 453/453
pass, 92.03 statements / 90.20 branches, `src/lib` at 98.45 (418 tests before
this). `npx playwright test` 129/129 across three device projects, including
six new painted journeys. Screenshots at 390 and 1440 with both sections
populated.

**A gap in my own verification, found and closed.** The axe routes seeded
favourites but not painted, so accessibility was only ever being checked
against the *empty* record. `seedPainted` now seeds it, and axe passes against
the populated section including the 44px target check.

**Two copy changes worth noting.** The studio's live region said "3 pieces in
your studio", which is ambiguous once there are two lists; it now says "3
pieces set aside. 2 pieces painted." And `EnlargeDialog`'s tests needed an
`AppProvider`, because the dialog now carries a control that reads context.

**Open.** A set records nothing when a piece is painted a second time, which is
a real loss for a practice app where repetition is the point. The stored shape
(`{ id, on }[]`) allows a log later without migrating what is already stored.

---

## Where this stands - 20/09/2026, handed back for curation

Everything the catalogue needs is built and green. The one remaining step is
curation, which is a human judgement and the user's to make.

**The state.** 8 approved of a 72 target, all fruit. 428 candidates harvested,
measured and ranked across all six subjects, waiting in
`catalog/shortlist/pexels.json`.

```bash
npm run catalog:coverage                                        # where the gaps are
npm run catalog:review -- --source=pexels --subject=botanical   # then localhost:4321
npm run catalog:build                                           # gates, then generate
```

`docs/curating.md` is the working reference: the six subject names, the command
sequence, the targets and the known rough edges.

**When coverage is met**, `catalog:coverage` says so, and the switchover is one
line in `src/data/catalogue.ts`:

```ts
export { CATALOG as CATALOGUE } from "./catalog.generated";
```

That is verified, not assumed: the suite passes 418/418 against both the
placeholders and the curated catalogue with the seam pointed either way.

**Queued for the next session**, in the order I would take them:

1. **Make curating cheaper.** Landscape ranks at 6% (4 of 69 candidates score
   8+, against 25-42% everywhere else) because `subjectArea` and
   `subjectRegions` assume figure-ground separation and a misty hillside has
   none - so roughly 65 usable candidates sit buried. Per-subject thresholds
   fix it. Alongside: keyboard shortcuts in the review tool, one button to
   accept every suggestion, and draft persistence.
2. **Re-run `catalog:calibrate`.** The first run found no measurement separated
   approvals from rejections, but that was 30 candidates from one citrus
   collection with almost no variance. With decisions spread across six
   subjects there is something real to calibrate against, and `thresholds.ts`
   records what has to change for measurements to be allowed to filter.
3. **The museums.** Only the Met adapter exists and is tested
   (`scripts/catalog/providers/met.ts`). Smithsonian, the Art Institute and
   the Rijksmuseum are registry entries in `src/lib/sources/registry.ts`
   with no adapter; corrected 28/09/2026, this line used to say all three
   existed. Every museum needs the `sharp` derive-images step because their
   images are self-hosted. `toImageSet` throws clearly until then.
4. **Production readiness.** Fonts still load from Google (`index.html:22-27`),
   flagged in the README as a must-fix. A moderate `react-router` advisory
   needs a v7 major upgrade. Branch protection needs repository settings.
5. **PWA/offline** (`docs/plans/pwa-offline.md`), which should wait for the
   real catalogue: precaching twelve placeholder SVGs proves nothing, and the
   budget is now known to be small because the photo sources are hotlinked.

**A correction to the record.** An earlier note in this file said the curated
catalogue held 16 entries. It holds 8. `"id":` appears twice per reference in
the generated file - once for the reference, once for its licence - and I
counted occurrences rather than references.

## Session checkpoint - 21/09/2026

**Objective.** Three things the curator hit during a real `catalog:review` run
on `--subject=botanical` then `--subject=creatures`: plates that would not
load, a prompt and a tip that were required when neither was wanted, and the
same two suggested sentences on candidate after candidate.

**What was wrong with the plates.** The page pointed its `<img>` straight at
the Pexels resize URL (`?auto=compress&cs=tinysrgb&w=1200`). Measured against
the live CDN at 19:44 on 21/09/2026 across 40 shortlisted candidates, 30
returned HTTP 500, or 503 with "upstream connect error ... reset reason:
overflow" - and all 30 of those returned 200 for the untouched original.
Immediate retries and a different requested width failed identically. By 20:20
the service had recovered on its own, so it was a provider-side outage, not a
property of those images.

**Decisions taken.**

| Decision | Choice | Why |
| --- | --- | --- |
| Plate delivery | Always through `/api/image`, never hotlinked from the page | One place to fall back from, and the canvas needs same-origin bytes anyway |
| Proxy addressing | `?id=<externalId>`, resolved against the queue | Keeps the exact original to fall back to, and an unauthenticated local server can no longer be asked to fetch arbitrary URLs |
| On a resize failure | Fall back to the original, downscale with sharp | The original never failed; 29 of 428 candidates are over 40MP, so the browser must not decode them raw |
| Retry policy | None automatic; a "Try again" button | Retrying inside the outage was measured and changed nothing |
| Prompt and tip | Optional on `ApprovedEntry` and `PaintReference`, omitted rather than stored empty | Requiring them bought invented filler; the app tests the field to decide whether to render the line at all |
| Suggestion variety | Condition-tagged pools, most specific tier first, rotated by candidate id | Only ever offers lines that are true of the image, and stable per candidate so reopening the tool does not reshuffle |

**Changed areas.** New `scripts/catalog/imageProxy.ts` (fallback logic, fetch
injected) and `scripts/catalog/imageResize.ts` (the one sharp call in the
review path), both with tests. `cli/review.ts`: id-based proxy, plate failure
state with Try again, optional prompt/tip fields, seed sent to
`/api/suggest`.
`suggest.ts` rewritten around line pools. Optional fields threaded through
`scripts/catalog/types.ts`, `src/lib/types.ts`, `build.ts`, `Detail.tsx`,
`Today.tsx`, `src/test/factory.ts`.

**Commands and results.** `npm run lint` clean; `npm run typecheck` clean;
`npm run test:unit` 486/486 across 31 files; `npm run test:coverage` exit 0 at
93.15 statements / 92.09 branches / 89.8 functions; `npm run build` clean.
Live: 8 previously-failing creature candidates all served 200 image/* through
the tool. Fallback proven end to end against a stub that 500s exactly as
Pexels did - a 5406x5406, 1.51MB original delivered as 1400x1400, 165KB.
Browser-driven checks at 1440 and 390 covered the loaded plate, the failure
panel and recovery via Try again. `npm run test:e2e` 129/129 passed.

**Not done / next.** The review tool is not covered by an automated browser
test; the checks above were driven by hand through Playwright and are not
committed, so a regression in the plate failure state would not be caught by
CI. It still has no keyboard shortcuts, no accept-all button and no draft
persistence (item 1 in the queue above). The queue above is otherwise
unchanged.

## Session checkpoint - 28/09/2026: proposed decisions

**Objective.** The curator asked whether curation could be done automatically
from their past decisions, then asked for a subject done in full: every field
filled and a decision on each, for them to approve or change.

**State found.** 80 approved (landscape 47, botanical 20, fruit 8, creatures
4, objects 1, still life 0). Coverage floor not met: still life empty,
creatures 4, objects 1, the short band 5 of 12, stretch 10 of 12.

**The decision history is mostly not decisions.** Counted by candidate (the
vocabulary has 257 notes for 224 candidates, so note counts overstate it),
102 candidates were set aside without being judged: 90 read "Image did not
load" (52 creatures, 38 botanical: the Pexels outage of 21/09) and 12 read
"Cute Tabby Kitten" against candidates that are mostly feathers, snails, a
butterfly and a leaf. Neither describes the image. They still counted as
rejections in the phrase vocabulary, and they took those candidates out of
the queue: creatures shows as fully reviewed with 4 approved, but only 10 of
its 74 were actually judged. **Not changed**; it is the curator's data and
the curator's call. Taste decisions left: 80 approvals, 80 set-asides.

**Can it be automated? Measured, not assumed.** A blind test: 30 decided
candidates (15 approved, 15 set aside by taste), judged at 500px without
seeing the answers. Agreement **16 of 30 (53%)**, a coin toss. 7 of the 14
misses were the curator rejecting for soft focus that was not visible at
that size; the rest were catalogue-balance calls ("we already have this
misty forest") that a blind sample cannot see. So: not automatic. Drafting
for confirmation, at review size and with focus judged strictly, is what was
built.

**Decisions taken.**

| Decision | Choice | Why |
| --- | --- | --- |
| Who decides | The curator, always. Proposals never write to `catalog/approved/` | The blind test says a proposal is a draft, not a decision |
| Runtime AI | None. Proposals are made at authoring time and the app ships only what was approved | `PRODUCT.md:64` |
| Queue order | Approvals, unsure set-asides, confident set-asides, then unproposed | Confirm what goes in while fresh; the unsure ones are likeliest to be overruled |
| Set-aside fields | Optional | Nobody should write alt text for something expected to be set aside |
| Where a field came from | `notes` on each proposal, shown and never saved | The curator should know which parts are measured and which are judgement |
| Agreement | Measured: each decision records `proposed`, and the header counts matches | Whether proposals are good is evidence, not opinion |

**Changed areas.** New `scripts/catalog/proposals.ts` (+ tests):
`checkProposals` runs every proposed approval through the build's own
`validateEntry`; `proposalQueue`; `agreement`. `learned.ts`: `record` takes
the proposed decision and keeps the note even with no reason typed.
`cli/review.ts`: `--proposals[=file]`, banner, pre-filled form, decision
buttons that make agreeing one press, and the agreement count. `suggest.ts`:
"A arrangement" / "A object" fixed. `docs/curating.md`: how to review
proposals, and the palette limitation. New `catalog/proposals/pexels.json`:
71 still-life proposals, 25 approve and 46 set aside.

**If all 25 are accepted**, still life has 25, the short band reaches 12
(7 new) and stretch reaches 12 (2 new). Creatures and objects stay short.

**Bugs found and fixed, with evidence.**

1. `suggest.ts` offered "A arrangement and almost nothing else" for still
   life (and "A object" for objects). A regression test failed on the
   unfixed code with exactly that string, then passed after the fix.
2. The proposal banner rendered white on pale green (1.48:1) because it
   carried the `approve` class the buttons use. No automated check caught
   it; the screenshot did. A contrast check in the browser driver failed
   against the old styles (1.48:1), then passed on the fix (12.61:1). The
   same check then found the banner's helper line at 3.56:1 on `--faint`;
   now `--soft`, 6.13:1.

**Found and not fixed.** The palette reader misses small coloured subjects
(documented in `docs/curating.md`). 14 of the 25 proposed palettes had a
pigment added by eye, and each proposal says so.

**Commands and results.** `npm run lint` exit 0. `npm run typecheck` exit 0,
and confirmed to cover `scripts/` with a deliberately wrong probe file.
`npm run test:coverage` 510/510 across 32 files, 93.61 statements / 92.46
branches (486 tests before). `npm run build` exit 0. `npm run test:e2e` NOT
RUN: nothing under `src/` changed. Review tool driven in Chromium against a
sandbox copy of `catalog/` (real files fingerprinted before and after,
unchanged): approve path 18/18 checks, set-aside path 11/11, no-proposals
mode unchanged, bad and missing proposal files refused with exit 1. Those
drivers live in the session scratchpad and are **not committed**, so CI
would not catch a regression in the review page.

**Also true, and worth deciding.** `catalog/` and `scripts/` are both
untracked. The 80 approvals, the vocabulary and the whole curation pipeline
exist only on this disk.

**Next.** The curator reviews still life:
`npm run catalog:review -- --source=pexels --subject=still-life --proposals`,
then `npm run catalog:build` and `npm run catalog:coverage`. Then read the
agreement count. If it is high, objects next. If it is low, the overruled
reasons say what to change.

## Session checkpoint - 28/09/2026: still life done, approvals-only review

**Still life result.** The curator agreed with **71 of 71** proposals (25
approve, 46 set aside) and changed fields on 7 approvals: minutes up on 6,
two raised to stretch (the food bowl and the cool-cast dried bloom), one
lowered to gentle, one prompt rewritten. Read back from
`catalog/curation-vocabulary.json`, not from memory. `catalog:build`
re-run: 105 references, 25 still life, output byte-identical to the
curator's own run. Coverage floor now short only on creatures (4 of 8) and
objects.

**Process change, at the curator's request.** "Just dont show me the set
aside... from now on I will just review what you already curated."

| Decision | Choice | Why |
| --- | --- | --- |
| Set-asides | Recorded without review by `catalog:proposals --apply-set-asides`, marked `decidedBy: "Claude"` | The curator agreed with all 46 on still life and asked not to see them |
| Agreement count | Excludes anything with `decidedBy` | A decision nobody reviewed is the proposal agreeing with itself |
| Review queue | Proposed approvals only, confident first | What goes into the catalogue is the part that still needs the curator |
| A doubtful but promising plate | Proposed as a low-confidence approval, not a set-aside | Set-asides no longer reach the curator, so doubt has to go to the reviewed side |
| Minutes | Steady around 20-25, stretch 30-35 | The curator's edits on still life raised them |

**Changed areas.** `proposals.ts`: `proposalQueue` now approvals only,
`applySetAsides`, agreement excludes `decidedBy`. `learned.ts`: `record`
takes `{ proposed, decidedBy }`; `decisionText` moved here from the review
tool so both paths learn from the same words. `cli/review.ts`: set-aside
banner and buttons removed, and it says how many set-asides are unrecorded.
New `cli/proposals.ts` and `npm run catalog:proposals`. `docs/curating.md`
updated.

**Objects proposed.** 85 plates viewed at 1200px: 18 approve (16 objects, 2
filed as still life, 7 marked unsure), 67 set aside and recorded. If all 18
are accepted, objects reaches 17 across all three time bands. Doors, chairs
and windows were thinned to 3-6 each, the way the curator's "we already
have a similar one" rejections did.

**Commands and results.** `npm run lint` exit 0. `npm run typecheck` exit 0.
`npm run test:coverage` 517/517 across 32 files, 93.71 statements / 92.53
branches (510 before). `npm run build` exit 0. `catalog:proposals` run
twice in a sandbox copy: 67 recorded, then 0, file unchanged. Review page
driven in Chromium against the sandbox: 18/18 checks, including the queue
holding only the 18 approvals and the header excluding the 67 recorded
set-asides ("72 of 72", not 139). Two checks failed first on my own wrong
expectation of the count; the tool was right. The vocabulary before the
real apply is backed up in the session scratchpad. `npm run test:e2e` NOT
RUN: nothing under `src/` changed.

**Next.** The curator reviews objects:
`npm run catalog:review -- --source=pexels --subject=objects --proposals`,
then `catalog:build` and `catalog:coverage`. After that, creatures, which
needs its 64 unjudged set-asides (52 "Image did not load", 12 "Cute Tabby
Kitten") cleared first (the curator's call) or a fresh harvest.

## Session checkpoint - 28/09/2026: objects done, creatures proposed

**Objects result.** 17 of 18 approved; the curator overruled one ("Carved
Door": "Too busy with intricate details") and edited minutes or difficulty
on 8. Agreement on reviewed decisions is now 88 of 89. `catalog:build` run
by the curator: 122 references. Coverage floor short only on creatures (4
of 8).

**Clearing the unjudged creatures set-asides.** The curator said "Next",
which I took as the go-ahead offered in the previous reply. New `forget` in
`learned.ts` removes notes and reverses exactly the phrase counts `record`
added for them, so the shortlist stops being pushed by decisions nobody
made. Tested: 8 cases in the new `learned.test.ts`, including one showing
the learned penalty on "snail on a leaf" going from negative to zero.
Applied to the real file after a backup: 96 notes removed (73 candidates),
4835 phrases down to 4141, and 64 of 74 creatures undecided again. The 3
already-approved candidates and the 10 real judgements were kept.

**Creatures proposed.** 64 plates viewed at 1200px: 17 approve (16
creatures, 1 leaf filed as botanical; 3 marked unsure), 47 set aside and
recorded. Thinned by kind as the curator's "we already have a similar one"
rejections did: 5 butterflies, 6 birds, 2 cats, 2 snails, 1 feather. Every
palette note is generated from the difference to the measured palette.

**Commands and results.** `npm run lint` exit 0. `npm run typecheck` exit 0.
`npm run test:coverage` 525/525 across 33 files, 93.82 statements / 92.65
branches (517 before). `npm run build` exit 0. Vocabulary backups before
each write are in the session scratchpad. `npm run test:e2e` NOT RUN:
nothing under `src/` changed.

**Next.** The curator reviews creatures:
`npm run catalog:review -- --source=pexels --subject=creatures --proposals`,
then `catalog:build` and `catalog:coverage`. If creatures reaches 8, the
coverage floor is met and the switchover in `src/data/catalogue.ts` is the
next step, with its visual pass at 390, 768 and 1440. `catalog/` and
`scripts/` are still untracked in git.

## Session checkpoint - 28/09/2026: creatures done, coverage floor met, fruit proposed

**Creatures result.** 17 of 17 approved, 12 with minutes or difficulty
raised (7 to stretch). Agreement on reviewed decisions: 105 of 106.
`catalog:build` run by the curator: 139 references. `catalog:coverage`
now reports **"Ready to replace the placeholders in the app: yes"**. Only
gap left: fruit has 8 of its 12 target and nothing under 10 minutes.

**Order agreed with the curator.** Fruit top-up, then Unsplash, then the
Met. The switchover in `src/data/catalogue.ts` waits until the curator
asks for it.

**Fruit proposed.** No harvest was needed: 40 fruit candidates had never
been reviewed. Viewed at 1200px: 12 approve (11 fruit, 1 garlic bulb filed
as still life; 5 unsure), 28 set aside and recorded. All whole fruit, none
cut, as the curator asked. 3 proposed under 10 minutes for the empty short
band. Proposals and vocabulary backed up in the session scratchpad before
each write.

**Unsplash, next.** Adapter built and tested, key set, images hotlinked.
One loose end before it ships: its API guidelines ask for
`links.download_location` to be called when a photo is used, recorded but
not called in `scripts/catalog/providers/unsplash.ts`.

**Next.** Curator reviews fruit:
`npm run catalog:review -- --source=pexels --subject=fruit --proposals`,
then `catalog:build`.

## Session checkpoint - 28/09/2026: fruit done, Unsplash wired and proposed

**Fruit result.** 11 of 12 approved; "Pear in Palm Shadow" set aside for a
blurred frond at the edge. Minutes raised on 5. Reviewed agreement across
all subjects: 116 of 118. 150 approved references from Pexels.

**Unsplash, three changes, each test-first (red on the unchanged code,
then green).**

1. The download report its API guidelines require. `downloadLocation` is
   now kept at harvest; `trackUnsplashDownload` calls it once, on a photo's
   first approval in the review tool, and reports a miss in the terminal
   rather than undoing the approval. 7 tests.
2. Orientation. The harvest plan says "square", Pexels' word; Unsplash
   answered **400 Bad Request** on the first live harvest. Now mapped to
   "squarish". 3 tests.
3. Measuring downloads a 640px copy for hotlinked sources, falling back to
   the original, instead of always fetching the original (Unsplash
   originals run to tens of megabytes). Museums still fetch their file as
   is. New `measure.test.ts`, 5 tests, using an injectable cache directory.
   Its first red run wrote two entries into the real
   `catalog/.measurements/`; both were identified by hash and deleted, and
   the cache count checked back at 465.

**Harvest.** `catalog:harvest -- --plan --source=unsplash --per-page=6`:
144 fetched, 4 near-duplicates dropped (2 of them of Pexels photos already
approved), 140 kept, shortlisted.

**Proposed.** 140 plates viewed at 1200px (converted from AVIF to JPEG for
viewing only): 15 approve (fruit 2, botanical 4, still life 5, creatures 1,
objects 3; 7 unsure), 125 set aside and recorded. Nothing from landscape
(already 47). Thinned against the whole catalogue: second daisies, callas,
ferns, lone trees, calm seas, single pears and misty forests went.

**Commands and results.** `npm run lint` exit 0. `npm run typecheck`
exit 0. `npm run test:coverage` 540/540 across 34 files, 95.91 statements
/ 92.54 branches (525 before). `npm run build` exit 0.
`catalog:proposals` validated the file (no problems) and recorded the 125
set-asides after a vocabulary backup in the session scratchpad.

**Next.** Curator reviews Unsplash on port 4322 (4321 held by the curator's
own fruit session): `npm run catalog:review -- --source=unsplash --proposals
--port=4322`, then `catalog:build`. First real approval will make the first
live `download_location` call; watch the terminal for "told Unsplash".
Then the Met.

## Session checkpoint - 28/09/2026: Unsplash done, the Met wired and proposed

**Unsplash result.** 15 of 15 approved; all 15 download reports reached
Unsplash ("told Unsplash ... was used" in the server log, once each). One
moved from creatures to objects, minutes raised on 10. 165 approved.

**The Met, five changes, each test-first (red on the unchanged code, then
green).**

1. **Derive step** (`derive.ts`, 16 tests). Each approved museum piece is
   downloaded once and written as 400/800/1600px WebP to
   `public/references/<source>/`, recorded in `catalog/derived.json`.
   Never enlarges. The review tool does it on approval; `catalog:derive`
   repairs anything missing; `catalog:build` reads the manifest and stays
   offline, naming any museum entry not yet derived instead of failing
   inside `toImageSet`.
2. **Image size.** The adapter took `primaryImageSmall`, measured live at
   **600px**, under the 1200px the enlarged view needs; the original was
   4000px. It now keeps the original as the image and web-large as
   `previewUrl`, which harvest measures from.
3. **Politeness.** ~130 unpaced requests earned a 403 from the Met's
   Imperva firewall for every request after. Now 350ms between object
   requests, and a 403/429 stops the harvest instead of being skipped. The
   firewall still cut in after ~110 paced requests, so harvest one subject
   at a time.
4. **A refused harvest kept nothing.** Now it keeps what it fetched and
   names the queries not run.
5. **A planned harvest replaced the whole candidates file**, so
   `--plan --subject=X` would have wiped every other subject (and, on
   Pexels, the candidates 220+ recorded proposals refer to). It now merges
   (`mergeCandidates`, 4 tests).

Also: `--plan=<file>` for a source-specific plan, and
`catalog/harvest-plan-met.json` (no landscape).

**Harvest.** Five subjects, one at a time with pauses, no refusals: 62
public-domain candidates, all measured.

**Proposed.** All 62 viewed at the Met's preview size: 4 approve (two
painted vases, a French botanical watercolour, a Chinese fan painting; 2
unsure), 58 set aside and recorded. Most were figure paintings, altarpieces,
manuscripts and dark crowded Old Master still lifes. Two more vases went for
intricate detail, as the curator did with the Carved Door. Originals of the
4 checked at 2417-4000px.

**End-to-end check in a sandbox copy** (real `catalog/` fingerprinted,
unchanged): approving the first proposal in the browser wrote 3 WebP files
(400x498, 800x996, 1600x1991; 317 KB) and the manifest entry;
`catalog:derive` then reported "1 already derived" and changed nothing;
`catalog:build` produced 166 references with `delivery: "local"` widths and
a CC0 credit line.

**Commands and results.** `npm run lint` exit 0. `npm run typecheck` exit 0.
`npm run test:coverage` 565/565 across 36 files, 96.12 statements / 92.9
branches (540 before). `npm run build` exit 0. `catalog:build` on the real
files byte-identical before and after these changes.

**Not verified.** The app still ships the placeholders, so no Met image has
been rendered in the app itself; `references/...` paths are relative and
Vite copies `public/`, which should resolve under HashRouter, but that is
for the switchover's visual pass to prove.

**Next.** Curator reviews the Met on port 4322:
`npm run catalog:review -- --source=met --proposals --port=4322`, then
`catalog:build`. The Met images add a few hundred KB each to the site.

## Session checkpoint - 28/09/2026: Met round two (objects, animals, paintings)

**Round one result.** 3 of 4 approved and derived (9 WebP files); the fan
painting set aside, "focus is not clear with the dark background". 168
references built.

**Why round one was mostly people: a search bug.** The Met ignores the
search words unless `q` is the last query parameter; the adapter put it
first, so every Met search returned unrelated works (measured:
"hippopotamus" gave a stela, a bust, an altarpiece; with `q` last, 77
hippopotamuses). Fixed test-first, keeping `isPublicDomain=true` and its
existing test. Also added `department` to plan queries (Met
`departmentId`), test-first. New plan `catalog/harvest-plan-met-
collections.json`: Egyptian, Greek and Roman, Ancient West Asian and Asian
Art, Drawings and Prints, European Paintings. `test:coverage` 569/569.

**Harvest.** 166 new candidates across five subjects, one subject at a
time; one network drop mid-creatures, whose four missing queries were
re-run afterwards.

**Proposed.** 168 undecided plates judged from 3x3 contact sheets at the
Met's preview resolution (600px a cell): 23 approve (10 creatures, 9
objects, 3 botanical, 1 still life; 13 unsure), 145 set aside and
recorded. Thinned hard against each other and the catalogue: one of five
bottle vases in each colour family, one hippo pose, one bronze cat, one
horse, two of three botanical studies from one 1820s series. A celadon
bowl was set aside because its original is 1183px, under the 1200px the
enlarged view needs; every other original was checked at 1096px on the
short side or more. Creator fields read before writing: the pheasant is by
Hakusanjin Hokui, not Hokusai as first said to the curator.

**Next.** Curator reviews on port 4322, then `catalog:build`.

## Session checkpoint - 29/09/2026: committed, Netlify-ready

**Round two result.** 22 of 24 approved (a plant study "subject is too
small", the orchid scroll "subject leaves are too thin"); all 24 Met
approvals derived. 189 references: Pexels 150, Unsplash 15, Met 24.

**Committed** on `feat/curated-catalogue`, at the curator's request, in
three commits: the code (pipeline, app features, tests, configs,
fixtures), the curated data (`catalog/`, `public/references/`, the
generated catalogue and credits), and Netlify settings with this note.
`catalog/.measurements/` is now gitignored. The real API keys in `.env`
were scanned for across every file committed: no hits.

**Netlify.** New `netlify.toml`: `npm run build`, publish `dist`. Node
from `.nvmrc` (22). No redirects, because the app uses HashRouter and
relative asset paths. `dist/` is 4.7 MB, the Met images 3.9 MB of it.
Connecting the site in the Netlify UI is the curator's step; it needs
their account.

**Before a public deploy.** The app still shows the twelve placeholder
illustrations: the switchover is one line in `src/data/catalogue.ts` plus
its visual pass at 390, 768 and 1440. Fonts still load from Google, which
the README lists as a must-fix. The Met images ship in `dist/` already,
unreferenced until the switchover.

**Commands and results.** `npm run lint` exit 0. `npm run typecheck` exit
0. `npm run test:coverage` 569/569, 96.14 statements / 92.94 branches.
`catalog:build` byte-identical to the committed output. `npm run build`
exit 0. `npm run test:e2e` 129/129.

## Session checkpoint - 29/09/2026: real references live, fonts self-hosted

**Objective.** The curator asked to switch the app to the curated catalogue
and self-host the fonts. Branch `feat/real-catalogue-and-fonts` off `main`
at `cfd3957`. **Not pushed and no PR, at the curator's request:** they have
a change to add first.

**Switchover.** `src/data/catalogue.ts` now re-exports the generated
catalogue: 189 references in the app, the twelve placeholders kept only as
unit-test fixtures. The footer no longer claims placeholder art or "no
network"; Pexels and Unsplash images load from their own servers.

**A real bug the placeholders hid.** Detail's plate cap reads `--ar` on
`.detail-art`, but the ratio was set on the mat inside it, and custom
properties inherit downward only, so every Detail plate was sized as a
square. Test first: `Detail.test.tsx` failed with `expected '' to be
'0.5625'`, then passed once `Detail` set `--ar` on the plate from a shared
`plateRatio` (`src/lib/sources/images.ts`).

**First screen, measured across all 189 pieces** at 412x839, 863x360,
667x375 and 1440x900 (scratchpad sweep, not a committed test). Real prompts
and credits pushed the Detail title and Today's actions off screen. Fixes,
all in `src/index.css` and recorded in DESIGN.md: an upright-phone Detail
cap that leaves room for the title; in short landscape Today hides the
duplicate full Save (the plate heart stays), steps the title and prompt down
one size, and under 740px wide keeps "Today's wash" as a screen-reader-only
h1. Result: 0 failures on all four screens. **The curator may veto any of
these trades.**

**Titles.** Eleven Pexels titles were truncated captions; renamed in
`catalog/approved/pexels.json`, ids unchanged: Lemon, Lime and Orange;
Grapefruit and Lemon Half; Lemons and Mandarins; Citrus and Kiwi Slices;
Citrus Halves; Grapefruit and Orange Slices; Orange Slices on Green; Orange
Slices and Leaves; White Peony; Gazania with Dew; Yellow Daffodil.

**Fonts.** Fontsource packages (`@fontsource/libre-baskerville`,
`@fontsource/source-sans-3`, 5.3.0, OFL-1.1, no dependencies) imported in
`src/fonts.ts`; the Google links are gone from `index.html`. This settles
the parked PWA plan's two font questions: Caveat and Source Sans 3 italic
have no job, so they are not bundled; `font-medium` Libre Baskerville
headings stay at 400, as the approved screens always drew them. A first
visit to Today downloads five Latin files, 87 KB. `e2e/fonts.spec.ts`
fails on any Google Fonts request (red on the old code: 6 per project) and
on any face the page falls back from (red when the 600 import was removed:
the browser used 700). `src/fonts.ts` joins `main.tsx` in the coverage
exclusions as bootstrap.

**Test infrastructure.** `enlargedFill` in `e2e/support.ts` measures the
enlarged image along the viewport's short axis; the old formula only held
for square images. Playwright traces no longer record screencast frames,
which had pushed the filtering journey from 7.7s to 37s.

**Commands and results**, on the final working tree. `npm run lint` exit 0.
`npm run typecheck` exit 0. `npm run test:coverage` 571/571 in 36 files,
96.31 statements / 92.90 branches. `catalog:build` output unchanged (no
drift). `npm run test:e2e` (build included) 135/135 in 1.7m. Visual pass at
390, 768 and 1440 on eight screens: no horizontal overflow, no broken
images, no console errors.

**Known, not changed here.** `npm audit` reports the same 8 findings as
`main`; the only production one is `react-router` (2 moderate). Netlify still
needs the curator to connect the repository in its UI.

**Next action.** Committed locally on the branch, not pushed. The curator
adds their change; then push and open the PR when they say so.
