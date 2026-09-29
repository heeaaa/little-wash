# Plan - bringing the review tool into the web app

_Status: **PROPOSED** 21/09/2026. Not started. Written in response to: "can we
include this review tool as part of the webapp, at something like
`/adminCurateReviewTool`, gated by a key from `.env` that I type into an input
field."_

Short answer: yes, and it is worth doing, but the key-in-an-input-field part
has to change or it protects nothing. This sets out what is really being
asked, the three shapes it could take, and which one to build first.

## What the tool is today

`scripts/catalog/cli/review.ts` is a Node HTTP server bound to `127.0.0.1`
that serves one hand-written HTML page and five endpoints. It has no
authentication because it is never reachable from anywhere else, and the file
says so at the top.

It does four things the browser cannot do on its own:

| It does | Using |
| --- | --- |
| Fetches provider images past CORS, with a resize fallback | `imageProxy.ts`, Node `fetch` |
| Downscales a fallback original | `imageResize.ts`, `sharp` |
| Reads the shortlist and writes approvals | the file system, into the git working tree |
| Records what you set aside, and re-ranks the queue from it | `learned.ts`, `shortlist.ts`, writing `catalog/curation-vocabulary.json` |

Approvals land in `catalog/approved/pexels.json`, `catalog:build` turns that
into `src/data/catalog.generated.ts`, and the app imports it. That chain is
worth naming explicitly, because every option below either keeps it or breaks
it:

```
review tool -> catalog/approved/*.json -> catalog:build -> catalog.generated.ts -> bundle
                    (in git, diffable,        (validates licence,
                     reviewable in a PR)       provenance, alt text)
```

The catalogue is version controlled, every approval is a reviewable diff, the
build refuses anything missing a licence or real alt text, and the running app
costs nothing at runtime because the catalogue is just a module.

## The part that has to change

**A key checked in the browser is not a lock.** If the app compares what you
type against `import.meta.env.VITE_ADMIN_KEY`, that key is a plain string
inside `dist/assets/index-*.js`. Anyone can open the deployed site, search the
bundle and read it. `.env.example` in this repo already says exactly this, and
it is the reason the provider keys are deliberately not `VITE_` prefixed.

That would be tolerable for hiding a harmless page. It is not tolerable here,
because the review tool **writes**: it approves references, and it teaches the
shortlist. A hidden UI is not access control, and CLAUDE.md already rules it
out: enforce admin access on the backend, not just hidden UI.

So there are only two honest positions:

1. **The tool never ships.** No key needed, because there is nothing to guard.
2. **The tool ships behind real authentication.** A session, or at minimum a
   secret that is only ever compared server side.

Both are reasonable. They are Options A and B below.

## Option A - a dev-only route inside the app (recommended first)

Move the review tool from a hand-written HTML string into a real React route
that exists only when you run `npm run dev`.

**Route.** `/#/curate` (the app uses `HashRouter`). `src/routes.tsx` is a JSX
tree, not a config array, so the branch goes inside it:

```tsx
// src/routes.tsx - lazy, so the screen is never in the main graph
const Curate = lazy(() => import("@/screens/Curate"));

<Route path="/" element={<AppShell />}>
  {/* ...the six real routes... */}
  {import.meta.env.DEV ? <Route path="curate" element={<Curate />} /> : null}
</Route>
```

Vite replaces `import.meta.env.DEV` with `false` in a production build, so the
branch becomes dead code and goes. Worth being precise about what that buys:
dead-code elimination reliably removes the `<Route>` and the `Curate`
reference, and Rollup then drops the module if nothing else imports it and it
is free of side effects. That is a condition, not a guarantee, which is why
the route is `lazy` as well: a dynamic import in a dead branch leaves nothing
in the entry chunk even if the module is kept, and the bundle test below is
what actually enforces it.

The intent is that the screen and its endpoints are not in `dist` at all.
There is then nothing to guard, because there is nothing there.

**Endpoints.** The five handlers move out of the CLI into a Vite plugin using
`configureServer`, so `npm run dev` serves `/api/curate/*` alongside the app.
`imageProxy.ts`, `imageResize.ts`, `suggest.ts`, `shortlist.ts` and
`learned.ts` are already separate and tested, so this is wiring, not rewriting.
`npm run build` never loads the plugin, so `sharp` and the provider keys stay
out of the browser graph.

**What you gain, beyond tidiness:**

- The app's own design system. `RefArt`, `SubjectTag`, `PaletteRow`,
  `WashiTag`, `Icon`, `SaveButton` instead of a 50-line inline stylesheet. The
  curation screen starts looking like the product it feeds.
- The app's accessibility work comes for free: focus styles, 44px targets,
  reduced motion, semantic controls. The current tool has none of that
  deliberately, it just inherited the browser defaults.
- **Testable.** This is the real prize. Right now the review page has no
  committed test at all, which I flagged after the last change: a regression
  in the plate failure state would reach you, not CI. As a React route it gets
  Vitest component tests and a Playwright spec, in the suites that already run
  on every PR.
- Hot reload while curating, and the piece renders exactly as it will in the
  app, so "does this read as a reference" is answered on the screen rather
  than after a build.
- Approvals still land in git. Nothing about the provenance chain changes.

**What you do not gain:** it still only runs on your machine, from a checkout,
with `npm run dev`. If that is the real complaint, skip to Option B.

**Keeping it honest.** Add a test that greps the built bundle:

```ts
it("ships no curation code to production", async () => {
  const bundle = await readFile("dist/assets/...js", "utf-8");
  expect(bundle).not.toContain("CURATION_ROUTE_MARKER");
});
```

A gate, not a promise. Without it, one accidental static import pulls the whole
tool into the public bundle and nobody notices.

**Rough size.** Six to eight commits. The route and screen, the Vite plugin,
porting each panel to real components, the component tests, one Playwright
journey (open queue, approve, appears in `approved.json`), the bundle-exclusion
test, and retiring `catalog:review` or leaving it as a thin alias.

## Option B - deployed, behind real authentication

This is what you actually described, done so that it holds.

**Why the typed key still cannot be checked in the browser.** The shape that
works is: you type the secret, the app POSTs it to a serverless function, the
function compares it against a **non-`VITE_`** environment variable that only
Netlify holds, and hands back a short-lived signed token. Every write endpoint
demands that token. The secret never enters the bundle. That is real, if basic,
shared-secret auth, and it keeps the interaction you wanted.

Better still once the Supabase phase lands: Supabase Auth with a magic link to
your address, a `curator` role, and RLS policies that let only that role insert
into the approvals table. Then there is no shared secret to leak or rotate, and
the enforcement is in the database rather than in a function you have to
remember to check.

**The real cost is not the auth, it is where approvals go.** A deployed tool
cannot write to your working tree. The catalogue has to move from
`catalog/approved/*.json` into a Supabase table, and that changes things the
current design gets for free:

| Today | After |
| --- | --- |
| Approvals are a git diff | Approvals are rows; history needs designing |
| `catalog:build` gates licence, provenance, alt text | The same rules have to run somewhere with teeth, as a DB constraint or an edge function |
| Catalogue is a bundled module, zero runtime cost | Either fetched at runtime, or pulled at deploy time to keep it a module |
| Reproducible from the repo alone | Needs a database export to reproduce |

None of that is a blocker. It is just the actual work, and it is most of a
phase. It also brings the obligations CLAUDE.md sets for backend work:
migrations tested from a clean database, and RLS tests proving an ordinary
user cannot curate.

**Free-tier note.** A Supabase free project pauses after a week of inactivity.
Curation is bursty by nature, so expect a cold start when you come back to it.

**When Option B is right:** when you genuinely want to curate from your phone
on the sofa, or from a machine without a checkout. Not before.

## Option C - deployed, commits back to GitHub

A Netlify Function holds a fine-grained GitHub token, and approving opens or
updates a PR against `catalog/approved/*.json`. You keep git as the source of
truth and get a deployed tool.

I would not build this. It means a public endpoint holding a token with write
access to the repository, which is a much worse thing to leak than a catalogue
row, and it buys you a deployed tool with more moving parts than Option B for
less capability. Recorded so it is a decision rather than an oversight.

## Recommendation

**Build Option A next; grow into Option B when the Supabase phase arrives.**

Option A is largely a refactor of code that already exists and is already
tested, it closes the review tool's test gap, and it makes the curation screen
inherit the design system instead of drifting from it. It does not spend the
backend phase early, and it does not put a fake lock on a real write.

Then, when Supabase lands for accounts and reminders, the same React screen
points at authenticated endpoints instead of dev-server ones. The screen is
written once either way, which is the main argument for doing A first rather
than waiting for B.

## What would change this recommendation

- **You want to curate away from your machine now.** Then A is a detour; go
  straight to B and accept that it pulls the backend phase forward.
- **Someone else starts curating.** Shared curation needs real identity, per
  curator attribution and an audit trail. That is B, and the role checks stop
  being theoretical.
- **The catalogue outgrows a JSON file.** Several hundred approvals with
  revisions and retirement is a database. Nowhere near that yet.

## Open questions for you

1. Is the itch "curating feels bolted on" (A fixes it) or "I can only curate at
   my desk" (only B fixes it)?
2. Should `/#/curate` keep writing to `catalog/approved/*.json` under Option A?
   I think yes: a reviewable diff per approval is a real safeguard, and it is
   free.
3. Path naming. `/#/curate` reads better than `/adminCurateReviewTool`, and
   under Option A obscurity buys nothing because the route does not exist in
   production. Under Option B the path is public information regardless; the
   auth is what matters.
