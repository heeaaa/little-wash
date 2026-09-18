# Work status - little wash

_Last updated: 19/09/2026_

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
  second "Scattered Accents" treatment and the chooser; the app now opens
  straight onto Today (`/` and any unknown path redirect to `/a`).
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

**Next.** `/impeccable adapt` for the enlarge dialog (smaller than the page it
enlarges; clips in landscape), then `/impeccable audit` for the `--ink-faint`
contrast token and the 40px nav targets, then `/impeccable polish` for the
`.sticky` class collision and the vestigial `chaos`/`scattered` branching.

## Housekeeping (manual - this session cannot delete on the device)

Dead files safe to delete in File Explorer: `src/directions/`,
`src/components/studio/ScatterMarks.tsx`, `src/screens/Chooser.tsx`.

## Roadmap

No gamification (decided). Future: small themed series; gentle continuity
(optional reminders + private history); celebratory, never-punishing artistic
progress visual. Plus backlog: saved-list screen, PWA/offline, Supabase,
reminder scheduling, licensed imagery pipeline, CI. Detail in DESIGN.md.
