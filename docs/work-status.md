# Work status - Little Wash

_Last updated: 18/09/2026_

## Decision (this phase)

The user approved **Direction A - "Organised Chaos"** as the visual direction,
with one change: **remove the scattered background pigment dabs** (they competed
with the artwork and the suggested palette). Everything else in A is kept - the
washi-tape colour-coded subject tags, the sticky-note prompt, the subject
pigment ring on plates, colour-coded collections and cards, and the strict
editorial grid.

The approved design system is now recorded in `DESIGN.md`.

## Done this phase

- Removed the background dabs (`ScatterMarks` component deleted and unwired from
  `Today`). Colour now lives only on real elements.
- Wrote `DESIGN.md`: palette + subject-pigment system, typography, spacing/shape,
  components, the ornament-restraint rules, states, accessibility, motion,
  provenance, and the future roadmap.

## Verified

- `tsc -b`, `eslint --max-warnings=0`, `vite build`, single-file build: PASS.
- `vitest run`: 41/41 PASS. Rendered inspection of Today (Organised Chaos)
  confirmed the dabs are gone and the layout is intact at 390 / 1440 px.
- Hosted prototype (artifact) re-published with the change; folder updated.

## Next actions (build-out of the approved design)

- Remove the exploration scaffolding: the `data-direction="b"` ("Scattered
  Accents") treatment, the Bold/Calm switch, and fold the Chooser into a direct
  entry to Today. (Left in place for now; not requested to remove yet.)
- Delete the superseded round-1 `src/directions/` folder (dead code; this
  session cannot delete on the device - do it in File Explorer).
- Build remaining screens as they are scheduled: saved list, then the roadmap
  items below.

## Roadmap (agreed future phases - detail in DESIGN.md)

Decided: **no gamification.** Conventional progress rewards, points and streaks
are ruled out to uphold PRODUCT.md's "No pressure, ever" principle. The only
progress feature is the celebratory visual (item 3), which never punishes a
missed day.

1. Small themed series: "Seven tiny skies", "Five cafe treats", "A week of
   leaves" - finite, ordered collections.
2. Gentle continuity: optional reminders + private painting history, no public
   sharing required.
3. Artistic progress tracking (celebratory, never punishing): an artsy/cute
   progress visual (a tree colouring in leaf by leaf, hexagons filling with
   honey, or similar) - a quiet record to enjoy, with no streaks, no targets and
   no achievement language.

Plus the standing backlog: PWA/offline, Supabase, backend reminder scheduling,
real curated licensed imagery + provenance pipeline, CI.
