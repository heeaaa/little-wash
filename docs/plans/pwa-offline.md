# Parked plan - PWA and offline

_Status: **PARKED** 20/09/2026. Approved in principle, deferred. The reference
imagery pipeline goes first, at the user's direction._

Three decisions were taken when this was planned and still hold:

| Decision | Choice |
| --- | --- |
| Next phase | PWA and offline |
| Brand fonts | Self-host in this phase, not CDN-cached, not deferred |
| Install affordance | Browser-native only, no in-app "Add to home screen" |

## Baseline when parked

`main`, clean tree, commit `76273c8`, measured 20/09/2026.

| Gate | Result |
| --- | --- |
| `npm run lint` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm run test:coverage` | 108/108 pass, 11 files, 94.22 stmts / 89.25 branches |
| `dist/` | 785 KB total |

The numbers match the checkpoint in `work-status.md`, so that document is
trustworthy as a starting point.

## What is actually missing

Grep across `src`, `index.html`, `e2e`, `vite.config.ts` and `package.json` for
`serviceWorker|workbox|vite-plugin-pwa|registerSW|navigator.onLine|offline`
returns nothing. The manifest and the full icon set ship; there is no runtime
PWA capability at all. The install surface is entirely ahead of the capability.

Four findings from measurement that change how this should be built:

1. **Caveat is downloaded and never used.** `--font-hand` is defined at
   `src/index.css:55` and no component applies `font-hand`. Two weights of a
   whole family, for nothing.
2. **Source Sans 3 italic is downloaded and never used.** Both `italic` call
   sites (`Today.tsx:154`, `Detail.tsx:98`) are on `font-display`.
3. **`font-display font-medium` silently renders at 400.** 15 call sites ask
   for weight 500; Libre Baskerville ships 400 and 700 only, so CSS font
   matching resolves 500 down to 400. Libre Baskerville 700 is reached exactly
   once, by the single `font-display font-semibold`.
4. **The header mark is 186 KB for a 32 px slot.** `src/assets/brand/mark.png`
   is 512x512 / 185,903 bytes, rendered at `h-8 w-8` (`AppShell.tsx:58`) on
   every route, above the fold. Second-largest file in the build after the JS.

## Scope

Install and offline. **Not push.** CLAUDE.md requires these be treated as
distinct capabilities; reminders need the backend and a user timezone. Nothing
in this phase requests notification permission.

### Acceptance criteria

- A second visit with the network off loads Today, Browse, Exercises, Studio
  and any piece detail, with artwork, correct brand type and no console errors.
- A first visit online, then offline, needs no reload to keep working.
- The app is installable by the browser's own path, with no in-app affordance.
- Offline is visible where it matters and silent where it does not.
- An update reaches the user without interrupting a painting session.
- Lint, typecheck, coverage thresholds, build and the full Playwright suite
  stay green, with new coverage for the new code.

## Workstream 1: self-host the fonts

First, because it decides what the service worker precaches.

- Vendor Libre Baskerville, Source Sans 3 and the Caveat decision into
  `src/assets/fonts/` as woff2. All three are SIL OFL 1.1.
- Drop Caveat and Source Sans 3 italic unless `font-hand` is given a job.
- Resolve finding 3 before choosing weights. If `font-display font-medium` is
  meant to read heavier than regular, Libre Baskerville cannot deliver it.
- Replace the four `<link>` tags in `index.html` with `@font-face` in
  `src/index.css`, `font-display: swap`, Latin subset, preload only the two
  faces above the fold.
- Record licence and provenance in DESIGN.md's "Assets and provenance".

Evidence: byte counts before and after, rendered check at 390 / 768 / 1440.

## Workstream 2: payload before precache

Precaching a build means its weight is paid up front on a phone.

- Generate a correctly sized mark derivative (96 px for dpr 3; keep the 512
  original intact in `assets/`). Expect 186 KB to single-digit KB.
- **Open tension, not resolved:** 85% of every reference SVG is an embedded
  C2PA provenance manifest. `pear.svg` is 9,108 bytes, 1,372 without it;
  stripping all 12 saves about 93 KB. That manifest is the honest marker that
  these are AI-generated placeholders. **Default is to keep it**, because
  provenance beats payload and these SVGs are replaced wholesale by the
  licensed-imagery phase anyway.

## Workstream 3: the service worker

- `vite-plugin-pwa` 1.3.0 (verified current on the registry 20/09/2026),
  wrapping Workbox 7. It generates the precache manifest against Vite's hashed
  filenames, which a hand-rolled worker cannot do without reimplementing that
  machinery.
- **Propose changing the main build's `base` from `"./"` to `"/"`.** A service
  worker needs an origin-rooted scope and a secure context, so it can never
  work from a `file://` or arbitrary-sub-path build. The "open the prototype
  from anywhere" need is already served by `vite.singlefile.config.ts`.
- **HashRouter makes offline routing trivial.** Every route is `/#/...`, so
  every navigation request is literally for `/`. No navigation-fallback matrix,
  no Netlify rewrite interaction.
- Precache the whole build. At 785 KB, less after Workstream 2, generateSW
  precaching everything is correct; no runtime-cache strategy needed.
- Fix the manifest: `start_url` and icon `src` values are absolute `/` paths
  inside a relatively-built app, so they only work on a root deploy. Add
  `scope` and `id`.
- **Update flow: quiet.** No `skipWaiting`, no modal. A new version activates
  on next launch. The app is used propped beside wet paper mid-painting; a
  refresh prompt is the interruption "no pressure, ever" rules out. A DESIGN.md
  entry, not just a config flag.
- Registration lives in a small testable module, not inline in `main.tsx`, so
  it can be unit-tested against a mocked `navigator.serviceWorker` and does not
  drag the 90/85/85/90 coverage gate down.

## Workstream 4: offline as a visible state

- Everything the app does is local, so almost nothing needs an offline state.
  Saving, filtering, dealing and history all work with no network.
- The one honest case is the first visit offline, before anything is cached,
  which the browser handles.
- A quiet, non-blocking offline indicator only where a user could otherwise be
  confused. `online`/`offline` events, `role="status"`, reduced-motion
  respected, no layout shift when it appears.
- No spinner, no retry button, no error page: there is nothing to retry.

## Workstream 5: tests

- **Unit:** the registration module across supported, unsupported,
  registration-failed and update-found paths; the indicator's transitions.
- **Playwright, new `e2e/offline.spec.ts`:** load online, `setOffline(true)`,
  reload, then Today to detail to enlarge to save to studio with the network
  off, asserting artwork renders and zero console errors. Plus the correct
  brand font family resolving offline.
- **Risk to check early:** a service worker can destabilise the existing 31
  journeys. `ready()` in `e2e/support.ts` waits on `networkidle`, which a
  controlling worker changes, and a worker persists within a context. If the
  suite goes flaky the fix is a proper activation-wait helper, not a retry;
  `retries: 0` is a deliberate decision and stays.
- **axe** on the offline state, added to the accessibility spec's route list.
- CI needs no new job. The e2e job already runs `vite preview` on `127.0.0.1`,
  a secure context, so the worker registers there.

## Workstream 6: documentation

- DESIGN.md: offline state, quiet-update rule, self-hosted font stack with
  licences, updated asset provenance and sizes.
- README: install and offline described honestly, including what is not there.
- `docs/work-status.md`: a fresh checkpoint.

## Sequencing

Branch `feat/pwa-offline`, PR into `main`.

1. Fonts self-hosted, Caveat and italic resolved, measured.
2. Mark derivative, payload measured.
3. `base` change plus manifest correctness, build verified.
4. Service worker registered, offline verified in the browser.
5. Offline indicator with its states.
6. Tests, including the existing-suite stability check.
7. Docs and checkpoint.

## Out of scope

Push and reminders, Supabase and sync, the licensed-imagery pipeline,
background sync, and an in-app install affordance.

## Cannot be verified here

- **Real-device install and offline.** CLAUDE.md is explicit that emulation
  does not prove installability. Everything Chromium and Playwright can show
  will be verified; real-device install is a user action with written steps.
- **Branch protection**, still outstanding. Workflow YAML cannot self-require.
  Require *Lint, types, unit tests, build* and *End-to-end journeys* on `main`
  in repository settings.

## Two answers needed at Workstream 1

1. Does `font-hand` get a real job, or does the token go?
2. Is `font-display font-medium` meant to read heavier than regular?

## Interaction with the imagery pipeline, now running first

Real reference imagery lands before this plan resumes, which changes two of its
numbers and one of its assumptions:

- The precache budget is set by the catalogue, not by the current 785 KB. Twelve
  placeholder SVGs are about 110 KB; real raster references are not.
- Workstream 2's C2PA tension disappears with the placeholder SVGs it concerns.
- "Precache the whole build" may no longer be correct if references become large
  or numerous. That decision must be re-taken against the real catalogue, not
  carried over from here.
