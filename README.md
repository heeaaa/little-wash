# little wash

[![CI (main)](https://github.com/heeaaa/little-wash/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/heeaaa/little-wash/actions/workflows/ci.yml?query=branch%3Amain)
[![React 18](https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white)](package.json)
[![TypeScript 5.9](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](package-lock.json)

_a little colour, every day._

little wash removes the decision that stops people painting. It offers one
simple, sketchable subject a day, with gentle filters for the time and energy
you actually have, so you can go from opening the app to brush on paper in under
a minute. No streaks, no pressure, ever.

> Working name. This repository is the design-exploration prototype. The
> catalogue is real; accounts are optional Google sign-in on Supabase (see
> **Accounts** below). A build without the account variables talks to no
> backend at all.

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
| `npm run test:e2e` | Builds (`build:e2e`, against a fake account host), then runs the Playwright journeys |
| `npm run test:e2e:ui` | The same suite in Playwright's UI mode |
| `npm run test:integration` | Backend checks against a local Supabase stack (needs Docker; CI runs it) |
| `npm run test:e2e:live` | Account journeys against a local Supabase stack (needs Docker; CI runs it) |
| `npm run test:providers` | Live catalogue-provider API checks (needs keys; not in CI) |
| `npm run test:e2e:report` | Open the last Playwright report |
| `npm run lint` | Lint |
| `npm run typecheck` | TypeScript checks, no emit |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build |

`npm run lint` is clean across the repository. Vendored tooling under
`.claude/`, `.agents/`, `.codex/` and `.impeccable/` is ignored: it ships its
own bundled JavaScript, and linting it produced ~1,300 errors that had nothing
to do with this app - enough noise to make the gate useless.

`test:integration` checks the backend: the migrations in `supabase/`, Supabase
Auth and the REST API of a local stack, reached through the app's own requests
(`integration/`). It needs that stack - `npx supabase@2.119.0 start`, which
needs Docker - and its address and keys in the environment
(`integration/env.ts`); without them it fails and says why. The database rules
are also checked on every unit run, without Docker, by running the real
migrations on PGlite (`supabase/pglite/`).

`test:providers` (called `test:integration` until 02/10/2026) checks the live
catalogue-provider APIs for schema drift - the unit suite runs each adapter
against payloads captured in `catalog/fixtures/`, which is deterministic but
cannot notice a provider changing its response since. It needs keys, is not
part of CI, and skips any provider whose key is absent with the reason printed.
A skip is not a pass.

## CI

`.github/workflows/ci.yml` runs on pull requests and on pushes to `main`, in
three jobs:

- **verify** - `npm ci`, lint, typecheck, unit/component tests with coverage
  thresholds, production build. Uploads the coverage report and the build.
- **e2e** - installs Chromium, runs the Playwright journeys against the
  production build at phone, propped-phone and desktop viewports. Uploads the
  HTML report always and failure traces on red. The account journeys here run
  against a fake backend (`e2e/fakeSupabase.ts`) and are reported as mocked.
- **accounts** - starts a local Supabase stack with the CLI (pinned, 2.119.0),
  applies the migrations to a clean database, lints the database functions,
  then runs `test:integration` and `test:e2e:live` against it. The stack's keys
  are the CLI's public demo values, so this job holds no secrets either.

Actions are pinned to commit SHAs, permissions are `contents: read`, no secrets
are used, and superseded runs are cancelled except on `main`.

**Branch protection is not configured.** Workflow YAML cannot require its own
checks - that is a repository setting, and it needs doing by hand: require
`Lint, types, unit tests, build`, `End-to-end journeys` and `Accounts against a
local Supabase` to pass before merging to `main`.

## What is built

The app opens on **Today** at `#/`; pieces are `#/piece/<id>`, series are
`#/series/<id>`, plus `#/browse`, `#/exercises` and `#/studio`. The direction chooser, the second exploratory treatment and
the `/a` URL segment that carried them were all removed once the direction was
approved. Exploration-era links (`#/a/piece/ripe-pear`) redirect onto the flat
route with their tail and query intact; anything unrecognised goes to Today.

- **Today** - one piece for the day, then the controls that change it. The order
  is fixed and load-bearing: artwork, identity, primary action, time and energy,
  subject, palette. Time and energy are the primary control; subject demotes to
  a `<dialog>` bottom sheet below `lg` and to the sticky rail at `lg+`. The
  catalogue deliberately is not on this screen - "deal me another" is the
  one-tap alternative and Browse owns the library.
- **Browse** - the full catalogue (189 curated references) with the same control
  hierarchy, plus series and curated collections. Results arrive 24 at a time,
  with "Show 24 more" for the rest; how many are showing lives in the URL, so
  Back returns to the same place.
- **Series** (`#/series/<id>`) - small themed runs to paint in order: "Seven
  tiny skies", "A week of leaves", "Six fruit cross-sections". A numbered
  contents page per series, and Previous / Next on Detail when a piece is opened
  from one. Offered only when every piece's source is switched on. Numbered,
  never counted - see "Small series" in `DESIGN.md`.
- **Detail** - the reference uncropped on a fixed neutral mat, its prompt and
  tip where it has them, its palette, and an enlarged view for use beside a
  physical sketchbook.
- **Exercises** (the Warm-ups page) - five brushwork and colour warm-ups, each
  with three to five variations (20 in all) that teach the same technique
  through a different composition. Opening one expands it in place into a
  practice sheet: an illustrated example, suggested colours and materials with
  substitutions, three to five steps and one thing to notice, plus a credited
  inspiration photo on the five scenic variations. The example and the steps
  stay in view together, and an optional "Keep screen on" switch uses the
  Screen Wake Lock API where the browser has it. Filter, warm-up and variation
  live in the URL.
- **Your studio** (`#/studio`) - two sections: pieces you set aside, and a
  record of what you have painted. The record is dated and deliberately plain:
  no streaks, no totals framed as progress, no relative dates. See "The painted
  mark, and the register it must keep" in `DESIGN.md`.
- **The painted tree** - heading the studio's Painted section, a leaf for every
  piece marked painted, washed in that piece's own colours. It grows only when
  something is painted and never changes with time; a new leaf arrives once, in
  front of you, the way watercolour dries. Tap a leaf to see which piece it
  was. See "The painted tree" in `DESIGN.md`.
- **Sources** (`#/sources`) - which collections ideas are drawn from, with each
  source's licence and a link to it. A standing preference, not a filter:
  it shapes the catalogue before filtering, and saved pieces ignore it.
- **Save** - favourites persist on-device via `localStorage` behind a versioned
  schema, degrading to in-memory when storage is unavailable. A dedicated saved
  list screen is still backlog.
- **Accounts** - optional Google sign-in, so saved and painted pieces follow a
  person across devices. Offered once in the studio and in the footer's small
  print, nowhere else; a guest's app is unchanged and makes no request to the
  account service. Signing in moves this browser's pieces into the account;
  changes are kept on the device and sent when there is a connection; signing
  out removes the account's pieces from the browser; `#/privacy` says what is
  kept. See "Accounts" in `DESIGN.md` and `docs/plans/google-sign-in.md`.

The daily piece is seeded on the date *and* the active filter combination, so
changing a filter genuinely reshuffles the pool rather than re-picking from the
whole catalogue.

## Stack

React 18, TypeScript (strict), Vite and Tailwind CSS, routed with `HashRouter`
so deep links survive a static host with no rewrite rules. Vitest and React
Testing Library cover the logic, the screens, the routing and the catalogue
pipeline (642 tests in 41 files), and Playwright covers the journeys end to end
(53 tests in 8 spec files, 159 checks across phone, propped-phone and desktop).
Counts as of 29/09/2026.
Filtering and "deal me another" run on-device; saving and painting do too,
unless someone signs in.

Motion follows one rule - the paper is never cut, only moved, re-wet or painted
on. Navigating morphs the artwork between screens and dealing dissolves it
through an animated turbulence field, both with the View Transitions API; a new
leaf on the painted tree is painted on, once. All of it degrades to an ordinary
update where an API is missing or motion is reduced. The rules are in
[`DESIGN.md`](./DESIGN.md#motion-one-material-three-moments).

## Layout

```
src/
  routes.tsx     One route tree, shared by the app and the tests
  screens/       Today, Browse, Series, Detail, Exercises, Studio, Sources, AppShell
  components/    Reusable UI (plus studio/ ornaments)
  lib/           Pure logic: filtering, daily pick, seeded shuffle, favourites, series, paging, warm-up selection, types, wash (motion), the painted tree's growth and colours
  lib/account/   Accounts: config, the device's record and its sync, sign-in returns, and the lazily loaded Supabase backend
  hooks/         Favourites, painted record, sources, the screen wake lock, and a new page opening at its top
  data/          The generated catalogue, collections, series, warm-ups and their inspiration photos
  assets/refs/   The retired placeholder SVGs, now unit-test fixtures only
  fonts.ts       The self-hosted brand faces
  assets/brand/  Generated in-app brand mark
e2e/             Playwright journeys (discovery, filtering, series, posture, accessibility, warm-ups, the painted tree, accounts against a fake backend)
e2e-live/        Account journeys against a real local Supabase stack (CI)
integration/     Backend checks against a real local Supabase stack (CI)
supabase/        The migration, the local stack's config, and the PGlite policy tests
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
Fonts are self-hosted from the Fontsource packages (SIL OFL 1.1) and bundled
by Vite, so nothing loads from a third party; see `src/fonts.ts`. Caveat is
part of the brand but not bundled until something uses it.

## Assets

Brand originals live in `assets/` and are never edited; everything in
`src/assets/brand/` and `public/` is a regenerable derivative. Reference artwork
is the curated catalogue of 189 photographs and museum works from Pexels,
Unsplash and The Met, listed with their credits in `docs/CREDITS.md`. Pexels
and Unsplash images load from those services' own image servers; The Met's are
downloaded at build and served from `public/references/met/`. Full asset
mapping is in `DESIGN.md`.

Every reference carries a structured `credit` - maker, institution, object URL,
licence, capture date - and **every surface that shows a reference shows who
made it**, whether or not the licence requires it. See "Assets and provenance"
in `DESIGN.md`.

### Building the catalogue

The catalogue is ingested by build-time scripts in `scripts/catalog/`, never by
the app. Nothing in `scripts/` is imported from `src/`, so no provider code and
no API key can reach the browser bundle.

```bash
npm run catalog:coverage                                      # where the catalogue is thin
npm run catalog:harvest -- --plan                             # the whole harvest plan
npm run catalog:harvest -- --plan --subject=botanical         # one subject
npm run catalog:shortlist -- --source=pexels                  # rank by sketchability
npm run catalog:review -- --source=pexels --subject=botanical # approve, one subject at a time
npm run catalog:build                                         # gates, then generate
```

`docs/curating.md` is the working reference for a curation session: the six
subject names, the command sequence, the targets, and the known rough edges.

`catalog:coverage` is the command that answers "what next": it prints the 6
subjects x 3 time bands matrix against the target, says whether the catalogue
is ready to replace the placeholders in the app, and names the planned queries
that would fill each gap.

`catalog:harvest --plan` works through `catalog/harvest-plan.json`, which
exists because the first session harvested a single themed collection and
produced a catalogue that was 100% fruit with nothing under ten minutes.
Coverage has to be planned; it does not fall out of one search.

Each candidate is **measured as it arrives** - subject area, how many separate
things are in the frame, border variance, sharpness and detail load - so the
queue is ordered by what the images look like rather than by their captions.
Near-identical images are dropped outright: the same stock photograph turning
up from three different searches is common in a broad harvest.

`catalog:build` reads only `catalog/approved/` and writes
`src/data/catalog.generated.ts` and `docs/CREDITS.md`. It needs no keys and is
deterministic, so CI re-runs it and fails if the generated files have drifted
from their inputs.

The build refuses an entry that has no licence from the allowlist, no link back
to the work, no capture date, or alt text that is missing, too short, a repeat
of the title, or the provider's own caption. Sketchability itself is a human
judgement: the heuristics only decide what a curator sees first.

**The review tool suggests as you go.** It samples the image in a canvas and
reads its pixels, then offers three prompts, three tips and a palette matched
to named watercolour pigments, plus a starting difficulty and duration. Each
suggested line carries the measurement that makes it true of that image, and
which of the eligible lines are offered is rotated by the candidate's own id,
so a session is not handed the same four sentences over and over. A prompt and
a tip are both optional - plenty of references say all they need to by being
the image. The
palette is read from the centre of the image, with anything that reads as bare
paper removed - a photograph's biggest colour by area is usually its backdrop,
and white is the paper's job, not a pigment's.

Alt text is offered only as a **scaffold with [blanks]**, never as a finished
sentence. Nothing in the pipeline can see the subject, so a complete-looking
description would be a guess - exactly what the build's alt gate exists to
catch. The blanks are what make a curator look at the image.

**Rejections teach it.** "Set aside" asks why, and both approvals and
rejections record the phrasing of the candidate they were about in
`catalog/curation-vocabulary.json`. Phrases that keep landing on one side start
to carry weight in future shortlists. It is deliberately conservative: a phrase
needs at least three decisions, at least three quarters agreeing, and the
learned signal is capped well below the hard proportion and resolution rules,
so it can reorder a queue but never override a fact about the file.

`npm run test:providers` checks the live APIs for schema drift. It needs keys,
is not part of CI, and skips any provider whose key is absent with its reason
printed - a skip is not a pass.

### Ingestion credentials

Copy `.env.example` to `.env` and fill in keys for the sources you ingest from.
They are read by build-time scripts only and are deliberately **not** `VITE_`
prefixed, so Vite cannot put them in the browser bundle. `.env` is gitignored,
and the app itself makes no authenticated request to any provider.

## Accounts

Optional Google sign-in through Supabase Auth (open source), with saved and
painted pieces in two Postgres tables guarded by row level security. Two
build-time variables turn it on; without them the app has no sign-in at all:

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | The project's address, e.g. `https://<ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Its publishable key (`sb_publishable_...`). Public by design |
| `VITE_SUPPORT_EMAIL` | Optional: an address for privacy questions |

Never put a secret key in a `VITE_` variable: everything `VITE_` is written into
the site's JavaScript, and `vite.config.ts` refuses to build if one is there.
The deployment steps, from the Google Cloud console to production, are in
[`docs/deploying-accounts.md`](./docs/deploying-accounts.md); the plan,
decisions and evidence are in
[`docs/plans/google-sign-in.md`](./docs/plans/google-sign-in.md).
