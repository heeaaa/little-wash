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
npm run dev        # opens straight onto Today (#/a)
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run test:unit` | Unit and component tests once (Vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:coverage` | Tests with V8 coverage |
| `npm run lint` | Lint |
| `npm run typecheck` | TypeScript checks, no emit |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build |

There is no `test:integration`, `test:e2e` or CI workflow yet - no backend
exists to integrate against. Both are in the backlog.

Known baseline failure: `npm run lint` exits 1 on vendored JavaScript bundled
inside `.claude/skills/` and `.agents/skills/`. It is unrelated to `src/`;
`npx eslint src` is clean.

## What is built

The app opens on **Today** and every other route lives under `#/a`. `#/` and any
unknown path redirect there - the direction chooser and the second exploratory
treatment were removed once the direction was approved.

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
Testing Library cover the logic and the screens (52 tests). Filtering, saving
and "deal me another" are all simulated on-device.

## Layout

```
src/
  screens/       Today, Browse, Detail, Exercises, DirectionShell
  components/    Reusable UI (plus studio/ ornaments)
  lib/           Pure logic: filtering, daily pick, seeded shuffle, favourites, types
  data/          Mock catalogue, collections, exercises
  assets/refs/   Original placeholder watercolour SVGs
  assets/brand/  Generated in-app brand mark
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
