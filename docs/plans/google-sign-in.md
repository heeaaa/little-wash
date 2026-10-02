# Plan and record: optional Google sign-in, with Saved and Painted kept per account

_Planned 02/10/2026 on `feat/google-sign-in`, cut from `main` at `067d7c8`.
PRODUCT.md already fixes the shape: "local-first. The app works fully with no
account... Supabase sign-in is optional and additive, for syncing across
devices. No sign-up wall before the first painting." This file is the plan,
the decisions, the test plan and, as it is built, the evidence. The steps only
the owner can do (Google Cloud, Supabase dashboard, Netlify) are in
[`docs/deploying-accounts.md`](../deploying-accounts.md)._

## Goal

When little wash is next deployed, anyone can sign in with Google if they want
to, and the pieces they save and mark painted are kept with their account, on
every device they sign in on. Anyone who does not sign in keeps today's app,
unchanged, with nothing sent anywhere. A small, quiet line offers sign-in to
people who want to keep track of what they have painted.

## Acceptance criteria

1. **Guests are unchanged.** With no account, every screen behaves as it does
   on `main`, data stays in this browser, and the browser makes **no request**
   to Supabase and downloads no sign-in code until someone chooses to sign in.
2. **Sign-in is Google only, by redirect, with PKCE.** Signing in starts from
   an explicit tap, returns to where it started, and handles cancel, failure,
   an expired attempt and an in-app browser that Google blocks.
3. **Per-account data.** Saved and painted pieces of a signed-in person are
   stored against their account and shown on any device they sign in on.
4. **Nothing is lost on the first sign-in.** Pieces already saved or painted in
   this browser move into the account; a later date wins for a piece painted
   in both places.
5. **Works with patchy signal.** Changes while signed in show at once, are kept
   on the device, and reach the account when the connection returns.
6. **Signing out leaves nothing behind.** It signs out this device only and
   removes the account's pieces, the session and the painted tree's seen
   record from this browser. Unsent changes are not discarded silently.
7. **Per-user access is enforced in the database.** Row level security means a
   person can read and change only their own rows; nobody signed out can read
   anything; nobody can write rows for someone else.
8. **People can delete their account**, which removes their rows too.
9. **The register holds.** The sign-in copy is small and unpressured: no nag,
   no prompts on Today or Detail, nothing in the header or nav, no "unlock".
10. **Accessible.** WCAG 2.2 AA: axe clean, keyboard and screen reader paths,
    visible focus, 44px targets, at 390, 768 and 1440 wide.
11. **Free tier only.** Supabase free plan, Netlify as today, Google sign-in at
    no cost. No secret reaches the browser bundle.

## What exists today

Measured on `main` at `067d7c8`:

| Store | Key | Shape |
| --- | --- | --- |
| Saved | `little-wash:favorites:v1` | `{ ids: string[] }`, in the order saved |
| Painted | `little-wash:painted:v1` | `{ entries: [{ id, on: "YYYY-MM-DD" }] }`, one per piece, local day |
| Painted tree, leaves already seen | `little-wash:leaves-seen:v1` | `{ ids: string[] }` |
| Sources switched off | `little-wash:sources:v1` | `{ disabled: string[] }` |

Read once at start-up by `useFavorites`, `usePainted`, `useSources`, written on
every change, in memory when storage is unavailable. There is no backend, no
service worker and no Content-Security-Policy. The app uses `HashRouter`, so
every route is a fragment (`#/studio`), which matters for the OAuth return.

## Decisions

The user's standing workflow is a thorough plan, then building straight away,
so these were made here and are recorded so they can be revisited.

| Decision | Choice | Why |
| --- | --- | --- |
| Auth service | Supabase Auth (open source, MIT client), on the free plan | Named in CLAUDE.md and PRODUCT.md; Postgres with RLS for per-user data; no server of our own to run |
| Sign-in method | Google only, `signInWithOAuth` redirect | What was asked for; no password handling, no email sending |
| Flow | PKCE, set explicitly (`flowType: "pkce"`) | supabase-js 2.117 defaults to implicit, which returns tokens in the URL fragment. With `HashRouter` that fragment is the route |
| Not Google's one-tap script | Redirect only | One Tap loads `accounts.google.com/gsi/client`, a third-party script, where the app loads nothing from a third party today (DESIGN.md: fonts are self-hosted for this reason) |
| Data that follows the account | Saved and Painted | The two things asked for. Sources stay a device preference; the tree's seen record is presentation state |
| First sign-in | Pieces in this browser move into the account automatically; a later painted date wins; a notice says how many came across | The person asked to keep track; asking "merge?" is a question nobody can answer wrongly |
| Order | Saved by when saved; Painted by day painted, then when marked | Matches today's append order; pieces painted elsewhere interleave by day |
| Offline | Each change is kept on the device and sent when online. Between two devices, the last change to *arrive* at the account wins, not the last one made: sends carry no condition and an unsave leaves no record. A phone that was offline all afternoon can undo, when it reconnects, a change made since on another device | PRODUCT.md principle 5, "works where painting happens". Tracking when each change was made would need tombstones and conditional writes, for two lists of at most 189 pieces; the review agreed it is a rule to state, not a defect (independent review, 02/10/2026) |
| Sign out | This device only (`scope: "local"`) | supabase-js defaults to `global`, which would sign out every device |
| After sign-out | The account's pieces, session and seen record leave this browser; the studio is empty | CLAUDE.md: never retain another user's data after logout |
| Unsent changes at sign-out | Try to send; if they cannot go, ask before discarding | Never lose a painting silently |
| Account deletion | In the studio, confirmed, via a `delete_my_account()` function that deletes the auth user; rows cascade | People should be able to leave; no Edge Function to deploy |
| Where the offer lives | One quiet line in the studio, and one in the footer | "A small copy text somewhere"; the studio is the person's own space. Not in the header, nav, Today or Detail (register rule 6) |
| Sign-in sheet | A small sheet explains what signing in does before Google is opened | The Google screen will name the Supabase host (below); saying so first keeps trust |
| Google's consent screen | Will read "to continue to dbbjvtbaljprmfhmxdmr.supabase.co" | Google shows the redirect domain until brand verification, which needs every authorised domain verified, and `supabase.co` cannot be verified by us. The fix is a paid custom domain. Recorded as a follow-up |
| Google button | Custom button to Google's branding rules: the official "G" from Google's asset pack, Google Sans Medium self-hosted from Fontsource (OFL), light theme | The rules require both; self-hosting keeps "nothing from a third party" |
| Client library loading | supabase-js is loaded only when needed (a stored session, a sign-in return, or the sheet opening) | Measured: 59.0 KB gzip (224 KB minified) for supabase-js, against a main chunk of about 133 KB gzip |
| Keys | `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` set in Netlify, not committed; the build fails if a secret key is ever put in a `VITE_` variable | Browser variables are public; a new project (after November 2025) has only publishable and secret keys |
| Grants | Explicit grants to `authenticated` only, nothing to `anon` | Since 30/05/2026 new Supabase projects no longer expose new tables automatically |
| Abuse limits | Piece ids must look like catalogue ids; at most 1,000 rows per person per table | A signed-in person could otherwise fill the 500 MB free database |
| `npm run test:integration` | Becomes the backend suite against a local Supabase stack; the live provider checks it ran move to `npm run test:providers` | CLAUDE.md's command contract reserves `test:integration` for "isolated backend/integration checks once introduced" |
| Local SQL tests | PGlite (Postgres 18 in WebAssembly, Apache-2.0) runs the real migration with a small Supabase auth stand-in, in the ordinary unit suite | Docker is not available on this machine, so `supabase start` cannot run here; the real stack runs in CI |

## How it works

### Two paths

```
Guest (no account)                       Signed in
------------------                       ---------
useFavorites / usePainted                AccountService (src/lib/account)
  localStorage, as today                   device record: little-wash:account:v1
  no network                                 { record, pending, pulledAt }
                                           AccountBackend (lazy supabase-js)
                                             GoTrue: PKCE sign-in, session
                                             PostgREST: saved_pieces, painted_pieces (RLS)
```

`AppProvider` keeps the same `favorites / isSaved / toggleSave` and
`painted / isPainted / togglePainted` API for every screen. When an account is
signed in those come from the account record; otherwise from the guest hooks.
No screen needs to know which.

### Sign-in

1. The person taps "Sign in" in the studio or the footer. A sheet explains what
   signing in does; opening it starts loading the client in the background.
2. "Sign in with Google" stores where they were (`little-wash:sign-in:v1`) and
   calls `signInWithOAuth({ provider: "google", options: { redirectTo } })`.
   `redirectTo` is the page's origin and path with no fragment, so the route
   cannot be mangled. supabase-js stores the PKCE verifier and navigates to
   `https://<ref>.supabase.co/auth/v1/authorize`.
3. Google, then Supabase, send the browser back to `https://<site>/?code=...`.
4. On load, a `code` (or an `error`) in the query string, or a stored session,
   is what makes the app load supabase-js at all. It exchanges the code,
   removes it from the address, and the app returns to where the person was.
5. Errors come back as `?error=...&error_description=...`; they become one of
   four plain messages: cancelled, took too long or opened elsewhere,
   unavailable, or did not work.

### The account record on the device

One key, `little-wash:account:v1`, holds the signed-in person's record, the
pieces whose latest change has not yet reached the account (`pending`), and
when it last heard from the account. The screen always shows this record, so
it renders at once on return and keeps working offline.

- **A change** updates the record, marks that piece pending, and schedules a
  send a moment later (several quick taps go together).
- **Sending** upserts or deletes exactly the pending pieces. A piece is cleared
  from pending only if it has not changed again while the send was in flight.
- **Hearing back** fetches the person's rows and lays the pending pieces over
  them, so an unsent change is never overwritten by older account data.
- **When**: after sign-in, on start, after a change, when the connection
  returns, and when the app comes back into view (at most once a minute), so a
  piece painted on the phone appears on the laptop when it is next looked at.
- **Failures**: offline waits for the `online` event; other failures retry with
  backoff (5 s up to 10 min); a change the account permanently refuses is
  dropped and reported; an ended session signs the device out.
- **Other tabs** read the record from storage before writing it and listen for
  `storage` events, so two open tabs do not overwrite each other.

### The database

`supabase/migrations/<timestamp>_saved_and_painted.sql`:

- `public.saved_pieces (user_id, piece_id, saved_at)`, primary key
  `(user_id, piece_id)`.
- `public.painted_pieces (user_id, piece_id, painted_on date, marked_at)`,
  primary key `(user_id, piece_id)`. `painted_on` is the person's own calendar
  day, never converted to UTC, as on the device.
- `user_id` references `auth.users` with `on delete cascade`.
- Checks: piece ids match `^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$` (the catalogue's
  longest is 53 characters and includes capitals); `painted_on` between
  2000-01-01 and 2100-12-31.
- A trigger refuses a 1,001st row per person per table (re-saving an existing
  piece at the limit still works).
- RLS on both tables; one policy each for select, insert, update and delete,
  all `to authenticated` and `(select auth.uid()) = user_id`.
- Grants: `select, insert, update, delete` to `authenticated`, nothing to
  `anon`, all to `service_role`.
- `public.delete_my_account()`: `security definer`, empty `search_path`,
  deletes `auth.users` where `id = auth.uid()`; executable by `authenticated`
  only.

## The words

All of it in the studio's register: quiet, practical, no pressure.

| Where | Signed out | Signed in |
| --- | --- | --- |
| Studio, under the lede | "Your studio is kept in this browser. Sign in with Google to keep it with you on your other devices too." + "Sign in to keep your studio" | "Signed in as name@example.com." + "Sign out", and a status only when something is waiting to be sent |
| Studio, last section | (none) | "Your account": what is kept, and "Delete my account" |
| Footer | "What you save and paint stays in this browser unless you sign in." + "Sign in" | "Signed in. What you save and paint is kept with your account." |
| Sheet | "Keep your studio with you", what is kept, that nothing is needed to keep using the app, that pieces in this browser move across, the Supabase host Google will name, and a privacy link | (not shown) |

The privacy page (`#/privacy`) says what is stored (email, the pieces saved and
painted, the dates), where (Supabase), why, how to delete it, and that nothing
is shared or sold. It is a draft for the owner to review before it goes live.

## Phases

### Phase 0 - prerequisites and decisions (owner)

Done by the owner in parallel with phases 1-6, following
`docs/deploying-accounts.md`: the Supabase project (created 02/10/2026,
`dbbjvtbaljprmfhmxdmr`), the Google Cloud project, consent screen and OAuth
client, Supabase's Google provider and URL settings, and the two Netlify
variables. Nothing in phases 1-6 needs them; phase 7 does.

### Phase 1 - the database and its rules

- `supabase/config.toml` (local stack only, CLI 2.119.0), with
  `auto_expose_new_tables = false` to match the hosted project, email sign-up
  without confirmation for test users, and unused services off.
- The migration above.
- **Tests:** `supabase/tests/policies.test.ts` runs the real migration on
  PGlite with a stand-in for Supabase's `auth` schema and roles: each person
  sees only their own rows; signed-out access is refused; inserting, updating
  or deleting someone else's rows does nothing or is refused; the checks and
  the cap; cascade on account deletion; `delete_my_account` deletes only the
  caller, refuses a signed-out caller, and is not executable by `anon`. Each
  policy test is shown red against a migration with that policy removed.
- **Real stack (CI):** `integration/account.integration.test.ts` against a
  local Supabase started by the CLI: the same isolation rules through the HTTP
  API as the browser uses it, the upsert and delete requests the app makes,
  ordering, and deletion through `rpc("delete_my_account")`.

### Phase 2 - the account client

- `src/lib/account/config.ts`: read and validate the two variables; refuse a
  secret key. Missing variables mean accounts are simply unavailable (local
  development, CI unit runs, a fork).
- `vite.config.ts`: fail the build if a `VITE_` value is a secret key or a
  `service_role` token.
- `src/lib/account/callback.ts`: read a `code` or `error` from the address;
  plain-language reasons; clean the address; recognise in-app browsers Google
  blocks (Instagram, Facebook, Messenger, LinkedIn, TikTok, WeChat, Line).
- `src/lib/account/backend.ts` (interface) and `supabaseBackend.ts` (the
  lazily imported implementation): `start`, `signIn`, `signOut`,
  `onSignedOut`, `fetchRecord`, `push`, `deleteAccount`.
- **Tests:** unit tests for config, callback and the build guard. The backend
  is tested by giving supabase-js a recording `fetch`: the exact requests
  (`/authorize` parameters including `code_challenge_method=s256`,
  `on_conflict=user_id,piece_id`, the delete filters, the RPC) and how
  responses and failures are classified.

### Phase 3 - the account record and sync

- `src/lib/account/record.ts` (pure): toggles, ordering, pending, the overlay,
  the send plan, settling after a send, the first-sign-in merge, validation.
- `src/lib/account/device.ts`: the versioned device record, the sign-in intent,
  the session hint, clearing every trace on sign-out.
- `src/lib/account/service.ts`: the state machine (unavailable, signed out,
  starting, signed in), sending and hearing back, retries, notices.
- `src/state/AccountContext.tsx`, and `AppProvider` choosing the account record
  or the guest hooks. Guest hooks gain a reset so cleared guest storage cannot
  reappear from memory.
- **Tests:** `record.test.ts` (every rule above, including a change made while
  a send is in flight, a later date winning, ordering, junk data);
  `device.test.ts` (unreadable and unwritable storage, another user's record);
  `service.test.ts` with an in-memory fake backend and fake timers: start with
  and without a session, a fresh sign-in and its merge, offline then online,
  retry and backoff, a refused change, an ended session, sign-out with and
  without unsent changes, deletion, two tabs.

### Phase 4 - what people see

- `AccountLine` (studio, under the lede), `AccountSection` (studio, last),
  `SignInSheet`, `GoogleSignInButton`, `AccountNotice` (under the header, any
  route), `ConfirmDialog` (sign out with unsent changes, delete), the footer
  line, `#/privacy`.
- States: unavailable (nothing shown), signed out, opening Google (busy),
  returning, signed in, waiting to send, offline, could not send, signing out,
  deleting, and every notice.
- **Tests:** component tests for each state and its words; the sheet's focus,
  Escape and "Not now"; the register (no prompts on Today or Detail, nothing in
  the header or nav, no achievement words); the in-app browser note.
- **Visual review** at 390, 768 and 1440, light, with text zoom, using the
  Impeccable and Web Design Guidelines references; screenshots in
  `Claude outputs/google-sign-in/`.

### Phase 5 - end-to-end journeys

- **Mocked backend, local and CI** (`e2e/account.spec.ts`): the build is made
  with `--mode e2e`, pointing at `https://supabase.e2e.test`, a host that never
  resolves, and Playwright answers it with a small fake of the Auth and REST
  endpoints. Measured 02/10/2026: Playwright routes cross-origin fetches with
  custom headers without a separate preflight, and a fulfilled 302 for a
  navigation fails, so the fake `authorize` answers with a page that
  redirects. Journeys: a guest makes no Supabase request at all; sign in from
  the studio and come back to it; first sign-in moves pieces across; save and
  mark painted on "device A", see them on "device B"; offline then online;
  sign out clears the browser; cancel and failure messages; delete.
- **Real stack, CI** (`e2e-live/`, `npm run test:e2e:live`): the same build
  pointed at the local Supabase, with real users created through the admin API
  and real sessions: device A to device B, user B sees nothing of user A's,
  the first-sign-in move, sign-out, deletion.
- **CI:** a third job, "Accounts against a local Supabase", runs
  `supabase start`, `npm run test:integration` and `npm run test:e2e:live`,
  with the CLI pinned and actions pinned to commit SHAs, no secrets (the local
  stack's keys are public demo values).

### Phase 6 - hardening and review

- Bundle: the main chunk's growth and the lazy chunk's size, before and after.
- No Supabase request and no account chunk for a guest, asserted in the
  browser.
- Accessibility pass (axe on the new states, keyboard walk, 44px, 320px).
- An independent read-only review of correctness, security and missing tests;
  every finding fixed with a test shown red first, or recorded.
- Docs: README (commands, variables), DESIGN.md (accounts: placement, words,
  the Google button), PRODUCT.md, `docs/work-status.md`.

### Phase 7 - deploy and real-world checks (owner, with help)

Following `docs/deploying-accounts.md`: apply the migration, set the Netlify
variables, test on the pull request's deploy preview with a real Google
account (desktop, Android, iPhone in Safari and from the home screen), publish
the Google app, merge, and repeat the smoke test on production.

## Test plan, by layer

| Layer | What | Where it runs | Evidence |
| --- | --- | --- | --- |
| SQL | RLS, grants, checks, cap, cascade, delete function | PGlite in `npm run test:unit` (local and CI) | Pass counts; red against a migration with each policy removed |
| Backend contract | The HTTP requests supabase-js makes for our calls; failure classification | `npm run test:unit` | Pass counts |
| Domain logic | Record, merge, overlay, settle, config, callback, device storage | `npm run test:unit`, 95/88/95/95 coverage gate on `src/lib` | Coverage report |
| Service | Sign-in, sync, retries, offline, sign-out, deletion, two tabs | `npm run test:unit` with a fake backend and fake timers | Pass counts |
| Components | Every account state and its words; the sheet; register rules | `npm run test:unit` | Pass counts |
| Real backend | Isolation and requests through the real API | `npm run test:integration` in CI | CI job log |
| Journeys, mocked | Guest silence, sign-in and return, merge, two devices, offline, sign-out, errors, delete | `npm run test:e2e`, three device profiles | Report, screenshots |
| Journeys, real stack | Two devices, two users, merge, sign-out, deletion | `npm run test:e2e:live` in CI | CI job log |
| Real Google, real devices | Consent, return, sessions that last, iPhone home screen | Manual, on the deploy preview, then production | Checklist in the deploy guide |

Mocked results are reported as mocked. Real Google sign-in and real devices
cannot be automated here and stay **not run** until phase 7.

## Risks

| Risk | Mitigation |
| --- | --- |
| iPhone home-screen app: iOS can finish an OAuth redirect in Safari, whose storage the home-screen app does not share, so the app is not signed in | Must be checked on a real iPhone in phase 7. If it fails, a follow-up opens sign-in in a window that stays inside the home-screen app (Apple's guidance since iOS 17), with a hand-off back. Until checked, it is not claimed to work |
| Google blocks sign-in inside some apps' built-in browsers (`disallowed_useragent`) | The sheet recognises the common ones and says to open little wash in Safari or Chrome |
| Free Supabase projects pause after a week with no database activity; guests make no requests, so a quiet week pauses it | Guests are unaffected; signed-in people keep their pieces on the device and see "Can't reach your account"; the owner restores it from the dashboard (and is emailed). Recorded in the deploy guide |
| The consent screen names `dbbjvtbaljprmfhmxdmr.supabase.co` | Said in the sheet before Google opens; custom domain is the paid fix |
| A deploy preview that is not on the redirect allow list returns to production, where its PKCE verifier does not exist | The preview pattern goes on the list; the app recognises an orphaned `code` and says to try again |
| Session tokens live in `localStorage`, readable by any script on the page | No third-party scripts; React escaping; a Content-Security-Policy is a recorded follow-up (it needs testing on Netlify, which `vite preview` cannot do) |
| A future service worker caching account responses | Recorded for the parked PWA plan: never cache the Supabase host or a URL with `code` |

## Free-tier limits that apply

Supabase free plan: 500 MB database, 50,000 monthly active users, 5 GB egress,
two active projects, paused after a week without database activity. One saved
or painted row is about 100 bytes, so the cap keeps a person under 0.2 MB.
Netlify: unchanged; the site stays static and account traffic goes straight to
Supabase. Google sign-in: free. No paid service is introduced.

## Out of scope, recorded

- Syncing source preferences and the painted tree's seen record.
- Reminders (PRODUCT.md: backend scheduling, signed-in only), which this makes
  possible later.
- A custom domain so Google names little wash; Google brand verification.
- A Content-Security-Policy and other security headers.
- The iPhone home-screen hand-off, unless phase 7 shows it is needed.
- Other providers (Apple, email links).

Planned as out of scope, then made necessary by the review (finding 8): guest
tabs now follow each other. The saved and painted lists re-read storage when
another tab changes them, so a tab cannot write back lists another tab has
emptied; with two tabs open, each now shows the other's saves and marks. It is
the one change on `main`'s behaviour a guest can notice.

## Evidence

Measured 02/10/2026 on this machine (Windows, Node 24.13; CI uses 22, from
`.nvmrc`), and again on 03/10/2026 after the review's fixes. Phases 1-6 are
built; phase 0 is under way (the Supabase project exists); phase 7 needs the
owner.

**Database rules (PGlite, every unit run).** 70 tests, 35 under each kind of
project default. Each rule was broken on purpose to see a test go red: 12 of
13 breakages failed tests. The 13th, dropping an update policy's `with check`,
is not a breakage - Postgres uses the `using` expression as the check when
there is none. Found on the way: a delete policy of `using (true)` passed every
test that filtered or returned rows, because Postgres then applies the select
policy too. Two unfiltered tests were added, and catch it.

**Bugs found by the tests and the review of screenshots, each red, then green:**

1. Two pieces saved in the same millisecond fell into alphabetical order
   instead of the order they were saved (a service test on a frozen clock;
   Firefox can round the clock to 100ms). New rows now land after the latest.
2. Both confirmation dialogs used one title id, so "Delete your account?" was
   named after the sign-out question (a component test). Ids now come from
   `useId`.
3. A batch upsert the database refused (one bad row refuses the statement)
   dropped every piece in it (found writing the real-backend test; a contract
   test now pins it). A refused batch is now sent row by row, so only the bad
   piece is dropped.
4. The delete question sat at the top of the screen, not the foot of a phone or
   the middle of a wide screen: it was inside a `space-y` block whose margin
   utility outranked the sheet's (screenshot review). The placement test failed
   against the old build - off by 308px on desktop, 38px in short landscape,
   failing on the phone - and passes after.

**Independent review, 02/10/2026.** A read-only review of the whole branch,
with experiments against the real supabase-js 2.117.2: 1 high, 3 medium and 8
low findings. Each was reproduced here before it was fixed, and each fix has a
test that failed against the code before it (03/10/2026):

1. **High.** An expired session whose refresh failed for a moment (Auth
   answering 503, or no connection) was taken for no session: start-up wiped
   the device, its unsent changes and the stored session, and requests made in
   that state went out anonymously, came back 401 and ended it the same way.
   The access token lives an hour, so for a daily app it has always expired
   when the app opens. Now start-up says "unavailable" or "offline" and carries
   on from the device's copy; no request goes out without a session; only a
   session Auth has refused ends it.
2. **Medium.** The first sign-in emptied this browser's lists before the
   account had their pieces, so a session ending then lost them. They are now
   kept with the device's record until the account confirms them, and put back
   if the session ends first. The notice says the pieces "will move" until
   they have.
3. **Medium.** A request that failed while the browser said it was online was
   called "offline" and never tried again. It is now tried again, with the
   growing pause.
4. **Medium.** A sign-in that could not start, or a delete that failed, was
   said only behind the open sheet or question, where nobody could reach it.
   Each dialog now says it in its own status line.
5. **Low-medium.** Nothing timed out: one stalled request could hold sign-out
   on "Signing out…". Every request now gives up after 15 seconds, and sign-out
   waits at most 8 seconds for a send and 5 for the server to hear it.
6. **Low.** Sign-out asked about changes that were about to be sent. It waits
   for the send; the question closes itself once nothing is unsent.
7. **Low.** Focus fell to the page after deleting the account or signing out.
   It now moves to the notice saying what happened, for those two only, and
   only when it was lost.
8. **Low.** A guest tab kept its old lists in memory after another tab signed
   in, and could write them back. The lists follow storage, and a guest tab now
   follows a sign-in made in another tab, as it already followed a sign-out.
9. **Low.** A tab could write one person's record while another person's
   session was stored. Every write checks the stored session first, and a page
   restored from the browser's cache checks again.
10. **Low.** Parallel requests could together pass the 1,000-row ceiling, each
    counting only committed rows. The trigger now holds the person's list for
    one request at a time (an advisory lock until commit). PGlite checks the
    lock is taken and let go; the CI integration suite races four requests and
    expects exactly two to fit.
11. **Low.** Coming back into the app shell made a second account service and a
    second supabase-js client. There is now one per page.
12. **Low.** The preview redirect pattern trusts every deploy preview, and the
    repository is public. The deploy guide now says to set Netlify's sensitive
    variable policy to "Require approval" first, or to keep the pattern only
    for testing.

The review also asked for the offline rule to be stated (decisions, "Offline").
Found while fixing these: the backend tests leaked supabase-js clients from
test to test, and one refreshed a later test's session with its own answers.
Every client is now disposed after each test.

**The real client's requests (supabase-js 2.117.2), pinned by 24 tests:** the
authorize URL (`provider=google`, `redirect_to`, a 43-character
`code_challenge`, `code_challenge_method=s256`), the exchange
(`grant_type=pkce`, `auth_code` and the stored verifier), the code removed from
the address, the reads (`user_id=eq.`, ordering, `offset=0&limit=1000`), the
upserts (`on_conflict=user_id,piece_id`, `resolution=merge-duplicates`), the
deletes (`piece_id=in.(...)`, 50 to a request), the RPC, sign-out with
`scope=local` that still forgets the session offline, and how each failure is
classified.

**Guests.** In the browser, across Today, Browse, Detail (saving and marking
painted) and the studio, a guest makes no request to the account host and never
downloads the sign-in chunk, which the test first checks exists in the build.
One difference from `main`, deliberate: open guest tabs now follow each other's
lists (see "Out of scope, recorded"), tested in `src/hooks/guestLists.test.tsx`.

**Bundle** (production build, against `main` at `067d7c8`, with the review's
fixes): main JavaScript 136.80 to 148.80 KB gzip (+12.00 KB, the account code
and its words); CSS 10.99 to 11.48 KB gzip; the sign-in chunk 60.34 KB gzip,
loaded only when needed. No supabase-js code is in the main chunk (searched for
`GoTrueClient`, `PostgrestClient`, `RealtimeClient`).

**Final local runs, 03/10/2026, on the final code.** `npm run lint` and
`npm run typecheck` exit 0. `npm run test:coverage`: 1,120 of 1,120 in 63
files; 97.47 statements, 93.23 branches, 93.77 functions, 97.47 lines,
thresholds met (`src/lib/account`: 98.08 lines, 90.14 branches). Playwright
with CI's 2 workers: 264 of 264 on phone, propped phone and desktop; after one
last class on the dismiss button's focus ring, the account journeys again, 39
of 39.

**Build isolation.** With a developer's `.env.local` pointing at another host,
the e2e build still uses only `supabase.e2e.test`; an ordinary build picks the
`.env.local` up, as intended for `npm run dev`. The unit suite reads no `.env`.

**Visual and accessibility.** Screenshots of every state at 390, 768 and 1440
wide, and at 200% text zoom on a phone (no sideways scroll; the sheet scrolls
within itself; the Google button fits), in `Claude outputs/google-sign-in/`.
axe: no violations signed out, with the sheet open, signed in, and with the
delete question open, on all three device profiles. Web Interface Guidelines
review: three findings (overscroll and the iPhone safe area on the sheet, a
hover state), all fixed. Impeccable audit: 18/20; its one new finding (a
hairline border with a 44px shadow on the centred sheet) fixed by using the
panels' own `--shadow-lift`; its other findings are on `main` too. The
review's fixes added three states, shot at the same three widths in
`Claude outputs/google-sign-in/review-fixes/`: the sheet when sign-in cannot
start, the delete question when deleting fails, and focus on the notice after
signing out from the keyboard. The last showed the dismiss button's focus ring
crossing the card's edge, 4px away; the ring now hugs the button (still 3px of
teal, DESIGN.md's rule).

**Not run here.** The real Supabase stack (`test:integration`,
`test:e2e:live`): this machine has no Docker, so they run in CI's accounts job.
Real Google sign-in and real phones: phase 7, by the owner.
