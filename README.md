# Little Wash

_A little inspiration. A little paint. Everyday._

Little Wash removes the decision that stops people painting. It offers one
simple, sketchable subject a day, with gentle filters for the time and energy
you actually have, so you can go from opening the app to brush on paper in under
a minute. No streaks, no pressure, ever.

> This repository is the design-exploration prototype, not the
> production app.

## Quick start

```bash
npm ci
npm run dev        # open the app, starting at the direction chooser (#/)
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run test:unit` | Unit and component tests (Vitest) |
| `npm run lint` | Lint |
| `npm run typecheck` | TypeScript checks |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build |

## Stack

React, TypeScript (strict), Vite and Tailwind CSS, with Vitest and React
Testing Library for tests. Everything runs on local mock data - there is no
backend or network yet, and all filtering, saving and Surprise me are simulated
on-device.

## Layout

```
src/
  screens/      Today, Detail, Browse, Exercises, Chooser, shell
  components/   Reusable UI (plus studio/ ornaments)
  lib/          Pure logic: filtering, seeded shuffle, favourites, types
  data/         Mock catalogue, collections, exercises
  assets/refs/  Original placeholder watercolour SVGs
```

The approved visual direction - "The Studio Table" - and its full colour,
type and component rules live in [`DESIGN.md`](./DESIGN.md). Current status and
the roadmap are in [`docs/work-status.md`](./docs/work-status.md).

## Assets

Reference artwork is original CC0 placeholder illustration, labelled as
placeholder. Production imagery will be original or appropriately licensed, with
provenance recorded per item.
