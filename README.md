# little wash

_a little colour, every day._

little wash removes the decision that stops people painting. It offers one
simple, sketchable subject a day, with gentle filters for the time and energy
you actually have, so you can go from opening the app to brush on paper in under
a minute. No streaks, no pressure, ever.

> Working name. This repository is the design-exploration prototype, not the
> production app. All data is local mock data; nothing talks to a backend.

## Quick start

Node 22 (see `.nvmrc`; `engines` allows >=20.11 <23).

```bash
npm ci
npm run dev        # opens straight onto Today (#/)
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run test:unit` | Unit and component tests once (Vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:coverage` | Tests with V8 coverage and enforced thresholds |
| `npm run test:e2e` | Builds, then runs the Playwright journeys |
| `npm run test:e2e:ui` | The same suite in Playwright's UI mode |
| `npm run test:e2e:report` | Open the last Playwright report |
| `npm run lint` | Lint |
| `npm run typecheck` | TypeScript checks, no emit |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build |

`npm run lint` is clean across the repository. Vendored tooling under
`.claude/`, `.agents/`, `.codex/` and `.impeccable/` is ignored: it ships its
own bundled JavaScript, and linting it produced ~1,300 errors that had nothing
to do with this app - enough noise to make the gate useless.

There is no `test:integration`: no backend exists to integrate against yet. It
is deliberately absent rather than stubbed, because an empty green job is worse
than an honest gap.

## CI

`.github/workflows/ci.yml` runs on pull requests and on pushes to `main`, in
two jobs:

- **verify** - `npm ci`, lint, typecheck, unit/component tests with coverage
  thresholds, production build. Uploads the coverage report and the build.
- **e2e** - installs Chromium, runs the Playwright journeys against the
  production build at phone, propped-phone and desktop viewports. Uploads the
  HTML report always and failure traces on red.

Actions are pinned to commit SHAs, permissions are `contents: read`, no secrets
are used, and superseded runs are cancelled except on `main`.

**Branch protection is not configured.** Workflow YAML cannot require its own
checks - that is a repository setting, and it needs doing by hand: require
`Lint, types, unit tests, build` and `End-to-end journeys` to pass before
merging to `main`.

## What is built

The app opens on **Today** at `#/`; pieces are `#/piece/<id>`, plus `#/browse`
`#/exercises` and `#/studio`. The direction chooser, the second exploratory treatment and
the `/a` URL segment that carried them were all removed once the direction was
approved. Exploration-era links (`#/a/piece/ripe-pear`) redirect onto the flat
route with their tail and query intact; anything unrecognised goes to Today.

- **Today** - one piece for the day, then the controls that change it. The order
  is fixed and load-bearing: artwork, identity, primary action, time and energy,
  subject, palette. Time and energy are the primary control; subject demotes to
  a `<dialog>` bottom sheet below `lg` and to the sticky rail at `lg+`. The
  catalogue deliberately is not on this screen - "deal me another" is the
  one-tap alternative and Browse owns the library.
- **Browse** - the full catalogue (12 references) with the same control
  hierarchy, plus curated collections.
- **Detail** - the reference uncropped on a fixed neutral mat, its prompt,
  palette and an enlarged view for use beside a physical sketchbook.
- **Exercises** - 6 brushwork and colour warm-ups.
- **Save** - favourites persist on-device via `localStorage` behind a versioned
  schema, degrading to in-memory when storage is unavailable. A dedicated saved
  list screen is still backlog.

The daily piece is seeded on the date *and* the active filter combination, so
changing a filter genuinely reshuffles the pool rather than re-picking from the
whole catalogue.

## Stack

React 18, TypeScript (strict), Vite and Tailwind CSS, routed with `HashRouter`
so deep links survive a static host with no rewrite rules. Vitest and React
Testing Library cover the logic, the screens and the routing (108 tests),
and Playwright covers the journeys end to end (31 tests in 4 spec files,
93 checks across phone, propped-phone and desktop).
Filtering, saving and "deal me another" are all simulated on-device.

Piece changes are animated with the View Transitions API under one rule - the
paper is never cut, only moved or re-wet. Navigating morphs the artwork between
screens; dealing dissolves it through an animated turbulence field. Both degrade
to an ordinary update where the API is missing or motion is reduced. The rules
are in [`DESIGN.md`](./DESIGN.md#motion-one-material-two-moments).

## Layout

```
src/
  routes.tsx     One route tree, shared by the app and the tests
  screens/       Today, Browse, Detail, Exercises, AppShell
  components/    Reusable UI (plus studio/ ornaments)
  lib/           Pure logic: filtering, daily pick, seeded shuffle, favourites, types, wash (motion)
  data/          Mock catalogue, collections, exercises
  assets/refs/   Original placeholder watercolour SVGs
  assets/brand/  Generated in-app brand mark
e2e/             Playwright journeys (discovery, filtering, posture, accessibility)
public/          Favicons, app icons, site.webmanifest
assets/          Brand originals (keep intact)
```

The approved visual direction - "The Studio Table" - and its full colour, type,
component and accessibility rules live in [`DESIGN.md`](./DESIGN.md). Current
status, decisions and the roadmap are in
[`docs/work-status.md`](./docs/work-status.md). Product scope is in
[`PRODUCT.md`](./PRODUCT.md).

## Brand

The official little wash brand is the visual source of truth.

| | |
| --- | --- |
| Wordmark | lowercase "little wash", Libre Baskerville, never Title Case |
| Mark | watercolour "w" of three overlapping petals |
| Palette | Paper `#F5F1E8`, Ink `#2E2D29`, Deep teal `#25616A`, Rose `#D96986`, Sage `#A8B99B` |
| Type | Libre Baskerville (display), Source Sans 3 (body), Caveat (hand) |

Contrast rules that constrain use: Ink and Deep teal pass AA on Paper; Rose is a
graphic accent only (it fails AA for small text); Sage is for fills, never text.
Colour is only ever applied through the tokens on `:root` in `src/index.css`.
Fonts currently load from Google Fonts and must be self-hosted before
production.

## Assets

Brand originals live in `assets/` and are never edited; everything in
`src/assets/brand/` and `public/` is a regenerable derivative. Reference artwork
is original CC0 placeholder watercolour SVG, labelled as placeholder.
Production imagery will be original or appropriately licensed, with provenance
recorded per item. Full asset mapping is in `DESIGN.md`.
