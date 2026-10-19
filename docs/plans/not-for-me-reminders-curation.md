# Plan - Not for me, daily reminders, and curation from anywhere

_Status: **Phase 1 BUILT** 19/10/2026 on `feat/not-for-me` (pull request, not
merged); Phases 2-4 not started. See "Phase 1 - as built" at the end.
Written at the user's request
after the Supabase project was paused for inactivity and restored the same
day: "make a plan for the items above ... for every step/phase and feature,
make use of impeccable skill ... includes adding test coverage and tests
thoroughly."_

Three features, four phases, one pull request each. The plan says what each
phase changes for people, what it stores, how Impeccable shapes and reviews
it, and how it is tested. Every decision taken here is listed so it can be
revisited.

## Why these three, and what they do for pausing

A free Supabase project pauses after a week without "sufficient user database
activity" (https://supabase.com/docs/guides/platform/free-project-pausing).
Little wash already queries the database: a signed-in open reads
`saved_pieces` and `painted_pieces` (`src/lib/account/service.ts:425`, then
`fetchRecord` at `src/lib/account/supabaseBackend.ts:203`), and again on
returning to the app after a minute (`service.ts:654`). One person's handful
of reads a day was not enough.

| Feature | Value to people | Database activity |
| --- | --- | --- |
| Not for me | Choosing is quicker: what you will never paint stops being offered | One more table read on every signed-in open |
| Daily reminders | A gentle nudge at a time you choose, on the devices you choose | A sender that queries the database every 15 minutes, whether or not anyone opens the app |
| Curation from anywhere | The curator reviews proposals on a phone, not only at a desk | Bursts while curating |

**Honest limit.** Supabase does not publish its threshold, and its page does
not say whether scheduled jobs or Edge Function calls count (research,
19/10/2026). The reminder sender reaches the database through the same API
gateway as the app, which is what the page says counts, but that is an
inference. The acceptance check is measured, not assumed: 14 days in
production with the sender running and no pause warning email.

**No stop gap (user, 19/10/2026).** The temporary daily GitHub Actions query
was declined. The project may pause again before reminders ship; restoring it
from the dashboard keeps all data.

## Decisions

### From the user, 19/10/2026

| Question | Answer |
| --- | --- |
| Where to curate from | **Anywhere, on the live site.** `/#/curate`, a curator role enforced by the database, approvals saved to Supabase and pulled into git |
| Where "Not for me" lives | **Today and Detail.** On Today, beside "Deal me another" |
| iPhone home-screen sign-in | **Unknown.** Treated as unchecked: Phase 2 starts with a real-iPhone check |
| Temporary keep-awake job | **No** |

### Taken in this plan, to revisit

1. **Today skips pieces already painted, not "recently painted".** My summary
   earlier today said "recently". DESIGN.md's register rule 2 ("Nothing reads
   across the dates ... no last-painted") rules out measuring recency, so the
   rule is: prefer pieces never marked painted before today; when every match
   is painted, offer painted ones. Nothing reads a date range.
2. **Today's pick stays put when other pieces are excluded.** Today ranks the
   matching pieces by a per-day hash and shows the first one that is allowed.
   Hiding or painting some other piece cannot move Today's piece; only hiding
   Today's own piece does. Everyone's Today changes once, on the release day,
   because the algorithm changes.
3. **A piece painted today stays on Today.** Marking it painted must not swap
   it away under the person who just painted it.
4. **Hidden is independent of Saved, Painted and the series.** Saving and
   painting are deliberate and stay as they are. Series are finite curated runs
   ("Seven tiny skies"); hiding a step would break the run, so series still
   show it.
5. **Reminder words are general, not the name of today's piece.** Today
   depends on source preferences, which stay on the device, so a server could
   name a different piece from the one the app shows.
6. **No reminder on a day something is already marked painted.** It would be
   a nudge to do what was already done.
7. **The service worker does push only, with no fetch handler.** It caches
   nothing, so it cannot serve stale content or cache a private response.
   Offline remains the parked plan (`docs/plans/pwa-offline.md`), which adds
   caching to the same worker later. Chrome has not needed a fetch handler to
   install from the menu since version 108 on mobile.
8. **`vite-plugin-pwa` 1.3.0, `injectManifest`, `injectionPoint: undefined`.**
   2.0.0 is 16 days old and needs Node 20.19+, which `engines` does not yet
   say. 1.3.0 supports Vite 5. With no injection point, nothing is precached.
9. **Reminder times are in 15-minute steps, sent within 2 hours, and never
   across midnight.** The sender runs every 15 minutes. A late reminder is
   worse than none, so a missed window is skipped, not sent at 3pm.
10. **Curation stays reviewed in git.** Decisions land in Supabase; a pull
    command turns them into `catalog/approved/*.json` and `catalog:build`
    still checks licence, provenance and alt text before anything ships.
11. **Order:** Phase 1 Not for me, Phase 2 push groundwork, Phase 3 reminders,
    Phase 4 curation. Each phase is a branch and a PR; the user merges.
12. **Migrations reach production before the code that uses them.**
    Additive tables are safe for the current code. Merging first would make
    every signed-in open fail with "Can't reach your account". This goes in
    each phase's owner checklist.

## How Impeccable is used

`impeccable context` runs once per session (done 19/10/2026: PRODUCT.md and
DESIGN.md loaded, no stale context reported). Every UI phase then runs the
same sequence, inside the approved "Studio Table" world. This is refinement,
not a redesign: DESIGN.md governs.

| Step | Impeccable | What it produces | Evidence kept |
| --- | --- | --- | --- |
| 1 | `shape <feature>` | A short brief from the decisions below, confirmed with the user in one compact round | The confirmed brief, in the phase's PR |
| 2 | `reference/craft-floor.md`, read before any UI edit (the skill requires it) | The quality floor and bans applied while building | - |
| 3 | `clarify` | Every string, against the register rules (no streak, guilt or achievement words) | Before/after copy table |
| 4 | `onboard` | First-run and empty states | Screenshots of each |
| 5 | `harden` | Errors, offline, permissions, long text, 1,000 items, slow network | A state matrix with a screenshot or test for each cell |
| 6 | `adapt` | 390x844, 844x390 (propped phone), 768x1024, 1440x900, text at 200% | Screenshots in `Claude outputs/<phase>/` |
| 7 | `animate` | Only inside DESIGN.md's motion system, with a reduced-motion path | Frame captures where motion changes |
| 8 | `critique` | Two isolated subagents: design review, then detector and browser evidence (the skill forbids running these inline) | The scored snapshot |
| 9 | `audit` | Scored accessibility, performance, theming and responsive report | P0 and P1 fixed, P2/P3 listed |
| 10 | `polish` | One bounded finishing pass: one inspection round, at most one confirming round | Final screenshots |

Alongside, as CLAUDE.md asks: Vercel **web-design-guidelines** reviews each
phase's UI files, and **vercel-react-best-practices** guides the React code
(lazy chunks, stable callbacks, no waterfalls). `live` is optional while the
dev server runs, to compare variants of the "Not for me" control on Today.

Backend-only steps (migrations, the sender, the pull command) have no
Impeccable step. What they show people does: notification words go through
`clarify`, and permission and failure states through `harden`.

## Testing rules for every phase

- **Red first.** Each rule gets a test that fails without it. For the
  load-bearing rules, a deliberate break (mutation) is shown red and recorded,
  as the painted tree did.
- **Layers:** unit for pure rules (selection, scheduling, payloads,
  conversion); component tests for interactions and every state; PGlite for
  migrations and row level security under both grant defaults, with
  `SET timezone = 'UTC'` explicitly (PGlite's default zone is a fixed
  `Etc/GMT-12`); CI's real local Supabase stack for the same rules on real
  Postgres 17 (PGlite is 18.3) and for the sender; Playwright on the phone,
  propped-phone and desktop projects; axe on every new state.
- **Coverage gates hold or rise:** whole app 90/85/85/90, `src/lib/**`
  95/88/95/95. New pure modules outside `src/lib` (the sender's shared code,
  the curation CLI) join the coverage `include`. Nothing is excluded to pass.
- **Deterministic:** injected clocks and randomness; condition waits, never
  sleeps; `retries: 0` stays.
- **Locally:** Playwright at 2 workers with `E2E_PORT` set. No Docker on this
  machine, so `test:integration` and `test:e2e:live` run in CI's accounts job,
  and the PR's first run is their first evidence. WebKit only through the
  single-file build.
- **Each phase ends with** lint, typecheck, `test:coverage`, the full e2e
  suite, build, and the bundle size against `main`.

---

## Phase 1 - "Not for me", and a Today that skips it

Branch `feat/not-for-me`. Smallest phase. It reuses the sync built for saved
and painted pieces.

### What people get

Hide a piece you will never paint, from Today or its page. Today, "Deal me
another" and Browse stop offering it. Today also prefers pieces you have not
painted yet. You can always see what you hid and show it again.

### Acceptance criteria

1. **Today:** a quiet "Not for me" beside "Deal me another". Pressing it hides
   the piece and deals the next with the existing re-wet. A status line under
   the actions says "Hidden <title>." with an **Undo** button. It stays until
   the next deal, filter change or navigation, with no timer.
2. **Detail:** "Not for me" in the action row with Save and Mark as painted.
   When hidden, it reads as a hidden state with "Show it again". The piece
   still opens from any link.
3. **Today's pick** is never hidden. It prefers pieces not painted before
   today, and keeps a piece painted today. It is stable when other pieces are
   hidden or painted (decision 2).
4. **Deal me another** skips hidden pieces and prefers unpainted ones. It is
   disabled, with its existing note, when nothing else is left.
5. **Everything matching is hidden:** Today shows an empty state that says so
   and offers "Show hidden pieces" and "Change filters". It never just says
   "No pieces match".
6. **Browse and its collections** leave hidden pieces out. Under the results,
   one quiet line reads "3 hidden pieces match these filters" with a button to
   show them. Shown hidden cards say "Hidden".
7. **Unchanged:** Saved, Painted, the painted tree and series steps. Hidden
   pieces get no count in the header or the chrome.
8. **A list to manage them:** "Pieces you've hidden", each with "Show it
   again". Default home: the Sources screen (`#/sources`), which already holds
   standing choices about what the catalogue is made of. `shape` confirms it,
   or the studio.
9. **Guests:** stored in this browser (`little-wash:hidden:v1`), versioned,
   in memory when storage fails, and followed across open tabs, as Saved is.
10. **Signed in:** follows the account. Signing in moves this browser's hidden
    pieces in, signing out removes them from the browser, and deleting the
    account deletes them. An offline hide is queued and sent later.
11. **Devices that already hold an account record** (`little-wash:account:v1`
    without a hidden list) load as "nothing hidden", with no reset and no lost
    changes.
12. **Accessible:** real buttons with a description ("Hides <title> from
    Today and Browse. You can show it again from Sources."). The change is
    announced ("Hidden <title>. Now showing <next title>"), focus stays on the
    control, everything works by keyboard, and targets are at least 44px.

### Data

Migration `supabase/migrations/<timestamp>_hidden_pieces.sql`:

- `public.hidden_pieces (user_id uuid references auth.users on delete cascade,
  piece_id text, hidden_at timestamptz default now(), primary key (user_id,
  piece_id))`, with the same piece-id check as the other tables.
- `private.keep_pieces_within_limit()` attached as a trigger (1,000 per
  person).
- Row level security: four own-row policies, as `saved_pieces` has.
  Revoke-then-grant: `select, insert, update, delete` to `authenticated`
  only, nothing to `anon`, no `truncate`.
- `delete_my_account()` already removes these rows by cascade.

### Code

- `src/lib/hidden.ts` and `src/hooks/useHidden.ts`: the guest store, shaped
  like `favorites.ts`.
- `src/lib/catalog.ts`:
  - `rankForDay(pool, filters, date)` (a hash per piece and day).
  - `pickDaily` gains `{ hidden, paintedBefore }`.
  - `surpriseMe` skips hidden and prefers unpainted.
  - A `hiddenMatching` count for Browse.
- `src/lib/account/`:
  - `PieceList` gains `"hidden"`.
  - `record.ts` merges and overlays it.
  - `service.ts` absorbs the guest list.
  - `supabaseBackend.ts` fetches and pushes `hidden_pieces`.
  - `device.ts` loads older records without the list.
- `useAccountLists` and `AppContext` expose the same hidden API to signed-in
  and guest screens alike.
- Components: `NotForMeButton` (a quiet variant for Today, a full one for
  Detail), the Browse hidden line, and the Sources list.

### Impeccable for this phase

- `shape not-for-me`: how much weight the control carries on Today without
  disturbing DESIGN.md's fixed order (artwork, identity, primary action, time
  and energy, subject, palette). Also where the list lives.
- `live` (optional): two or three variants of the Today control side by side.
- `clarify`:
  - the label;
  - the undo line;
  - the "everything is hidden" empty state;
  - the Browse line.
  
  It must not sound like a rejection or a judgement of the piece.
- `onboard`: the empty hidden list ("Nothing hidden. Anything you mark Not for
  me waits here, in case you change your mind.").
- `harden`:
  - one piece left;
  - all hidden;
  - hiding the pinned `?piece=`;
  - offline while signed in;
  - 1,000 hidden;
  - a long title in the status line.
- `adapt`: the action row wrapping at 390 and at 844x390.
- `animate`: reuse the deal's re-wet. Undo is the same motion back.
- Then `critique`, `audit` and `polish` on Today, Detail, Browse and Sources.

### Tests

**Unit**

- `catalog.test.ts`:
  - The featured piece never moves when a different piece is hidden or
    painted. Checked as a property over 365 days, every filter combination and
    the real catalogue.
  - Hidden is never picked. Painted before today is skipped while unpainted
    ones remain. Painted today is kept. All hidden returns null. All painted
    falls back.
  - Deterministic in date, filters, hidden and painted.
- `hidden.test.ts`: load and persist; a version mismatch; corrupt JSON;
  storage that throws; storage that reads but will not write; cross-tab
  replace.
- `record.test.ts`, `service.test.ts` (the existing fake backend):
  - The hidden list merges, stays pending and settles like the others.
  - Sign-in absorbs the guest list and counts it.
  - A hide while offline is queued.
  - Sign-out clears it.
  - A refused change is dropped and said.
- `supabaseBackend.test.ts`: the exact requests for `hidden_pieces` (select
  order and range, upsert conflict target, delete batches of 50).
- `device.test.ts`: a v1 record without `hidden` loads, and its pending
  changes survive.

**Component**

- Today:
  - Not for me deals the next piece.
  - The announcement reads both titles.
  - Undo restores the piece.
  - The empty state when everything is hidden.
- Detail: hide and show again.
- Browse: the hidden line, then showing and re-hiding.
- Sources: the list and its empty state.
- The deal button's disabled note.

**Database (PGlite, both grant defaults)**

- User A cannot read, add, change or remove user B's hidden rows.
- `anon` gets nothing.
- `truncate` is refused.
- The 1,000 limit holds under parallel inserts.
- The piece-id check holds.
- Account deletion cascades.

**Integration (CI, real stack):** a hidden round trip, and the same row level
security checks on Postgres 17.

**End-to-end**

- `e2e/not-for-me.spec.ts` as a guest:
  - Hide on Today; the next piece is shown.
  - Reload: still hidden.
  - Browse leaves it out, and "show them" brings it back.
  - Show it again from Sources; it can be offered again.
- With `fakeSupabase`: signed in, the hide is sent and survives a reload.
- `e2e-live` in CI: a hide in one browser context appears in a second one.

**Accessibility:** axe on Today, Detail, Browse and Sources in their hidden
states, plus a keyboard-only run of the whole journey.

**Mutation checks, each shown red**

- Drop the hidden filter from `pickDaily`.
- Replace the rank with the old index pick (the stability property fails).
- Remove the select policy.
- Drop the device-record fallback.

**Visual:** before and after of Today at all four sizes.

### Owner steps before merging

`npx supabase@2.119.0 db push` (dry run first), check the table shows RLS
enabled with four policies, then merge.

---

## Phase 2 - Push groundwork: the iPhone check and a service worker

Branch `feat/push-groundwork`. Nothing user-visible arrives except an iPhone
sign-in fix, if one is needed.

### 2a. iPhone home-screen sign-in (real device, the owner's step)

Web Push on iPhone only reaches web apps added to the Home Screen
(iOS 16.4+, https://webkit.org/blog/13878/). Declarative Web Push (iOS 18.4+)
does not change that. The sign-in plan flagged that the home-screen app may
finish Google's redirect in Safari and stay signed out
(`docs/plans/google-sign-in.md:333`), and it was never checked.

- **Check:**
  1. On the iPhone, add little wash to the Home Screen.
  2. Open it from there and sign in from the studio.
  3. Close and reopen it.
  4. See whether the studio shows the email.
- **If it fails:** build the follow-up that plan recorded: sign-in in a window
  that stays inside the home-screen app, with a hand-off back. That is its
  own plan, tests and PR before Phase 3. iPhone reminders depend on it;
  Android and desktop do not.

### 2b. The service worker

- `vite-plugin-pwa` 1.3.0 with `strategies: "injectManifest"`,
  `srcDir: "src"`, `filename: "sw.ts"` and
  `injectManifest.injectionPoint: undefined`. The plugin's documentation
  confirms that last option means no precache.
- `src/sw.ts` has three handlers:
  - `push` always shows a notification. Safari revokes permission for any
    push that shows none, so a malformed payload still shows a plain one.
  - `notificationclick` focuses an open little wash window or opens `/#/`.
  - `pushsubscriptionchange` re-subscribes where a browser fires it (not iOS,
    and not reliably anywhere).
- `src/lib/push/registration.ts`: registers the worker after load in
  supported, secure contexts only. It never registers in the single-file
  build or in tests that do not ask for it.
- Manifest: add `id` and `scope`. `base: "./"` stays, because Netlify serves
  production and previews at the root.
- `netlify.toml`: `sw.js` gets `Cache-Control: no-cache`, so updates arrive.

### 2c. Keys

- VAPID keys are generated once, locally.
- The private key goes only into Supabase secrets.
- `VITE_VAPID_PUBLIC_KEY` goes to Netlify (it is public by design).
- `secrets.ts` learns to refuse a VAPID private key in any `VITE_` variable,
  as it refuses `sb_secret_`.

### Impeccable for this phase

No new screen. If 2a needs the sign-in fix, its sheet states go through:
- `shape`;
- `clarify` ("Signing in opens a window inside little wash");
- `harden` (closed window, timeout, cancelled);
- `critique`, `audit` and `polish`.

### Tests

- **Unit, registration:** supported; unsupported (no `serviceWorker`); not a
  secure context; registration fails (quiet, logged once); already
  registered.
- **Unit, the worker's logic** (pure functions, imported by `sw.ts`):
  - Payload to notification options, including malformed and empty payloads.
  - Every push path calls `showNotification`.
  - The click target is always same-origin `/#/`, never a URL from the
    payload.
- **End-to-end:**
  - The worker registers on the preview server.
  - A synthetic `PushEvent` dispatched inside the worker
    (`context.serviceWorkers()`) produces one notification with the
    expected tag, and a second push replaces it.
- **Stability:** the whole existing suite at 2 workers, twice. `ready()`
  waits on `networkidle`, which a controlling worker can change. If it goes
  flaky, the fix is a proper activation wait, not retries.
- **Build guard:** a VAPID private key in `VITE_` fails the build.
- **Manual, real devices:** Android Chrome and desktop Chrome show the worker
  active in DevTools. The iPhone check in 2a.

---

## Phase 3 - Daily reminders

Branch `feat/reminders`. The largest phase. Signed-in people only (PRODUCT.md).

### What people get

In the studio, a section about a daily reminder:
- choose a time;
- choose the days (every day by default);
- turn it on for this device.

At that time, a notification with a few gentle words arrives. Tapping it
opens Today. It is never sent on a day you have already marked something
painted, never twice in a day, and never hours late.

### Step 0: prove real push from Supabase's runtime (a spike, first)

The research could not confirm that `npm:web-push` encrypts correctly in
today's Edge Runtime. Under Deno it once produced payloads browsers could not
decrypt; that was fixed in Deno 1.46.2, and the runtime is now Deno 2.1.

- **Spike:** deploy a throwaway function to the project and send one real
  encrypted push to the owner's own subscription, on Android or desktop Chrome
  and on the iPhone home-screen app.
- **Decision recorded from the result:**
  - `npm:web-push` if it works;
  - else `jsr:@negrel/webpush`, which carries its own "not reviewed by
    crypto experts" warning;
  - else a sender outside Supabase. A Netlify scheduled function on Node
    would need Netlify's current free-plan terms checked first.
- Deploying to the real project is outward-facing, so it waits for the
  owner's go-ahead.

### Data

Migration `<timestamp>_reminders.sql`.

**`public.reminder_settings`**, one row per person:
- `user_id` (primary key);
- `enabled`;
- `local_time` (time, a multiple of 15 minutes);
- `timezone` (checked against `pg_timezone_names`);
- `days` (a 7-bit weekday mask, not empty);
- `updated_at`.

Own-row policies.

**`public.push_subscriptions`:**
- `id`, `user_id`;
- `endpoint` (unique, `https://` only);
- `p256dh`, `auth`;
- `device_label`, coarse: "iPhone", "Android phone", "Mac", "Windows
  computer". Never the full user agent.
- `created_at`, `last_sent_at`, `failures`.

Own-row select, insert and delete, and at most 10 per person.

**`public.reminder_sends (user_id, local_date)`**, the primary key that makes
a second reminder in one day impossible:
- `claimed_at`, `attempts`;
- `outcome`: sent, no device, painted, or retry, then failed.

No grants to `authenticated` or `anon`: people never read it, so it can never
become a history of reminders.

**`public.claim_due_reminders(at timestamptz)`** is granted to `service_role`
only. In one statement it:
1. finds enabled settings whose local time (`at at time zone timezone`) is
   inside today's window, on an allowed weekday;
2. records "painted" for anyone with a `painted_pieces` row for that local
   date;
3. inserts claims with `on conflict do nothing`, re-claiming only a `retry`
   older than 10 minutes with fewer than 3 attempts;
4. returns the claimed people's subscriptions.

**`public.settle_reminder(...)`** records the outcome, deletes subscriptions
the push service called gone, and counts failures.

A second migration schedules the sender:
- Supabase Cron, `*/15 * * * *`, calls the function through `pg_net`.
- The project URL and the secret key are read from Vault at run time, so
  nothing secret is in the migration.
- PGlite's `platform.sql` stubs `cron.schedule` and `net.http_post`, so the
  schedule itself is asserted locally.

### The sender

`supabase/functions/send-reminders/index.ts`:
- `verify_jwt = false`, then `withSupabase({ auth: "secret" })` from
  `npm:@supabase/server@1`. This is Supabase's documented pattern for cron
  callers using the new keys. Without it, the publishable key would pass the
  platform check.
- It calls `claim_due_reminders(now())`.
- It sends one push per subscription with `TTL` of a few hours,
  `Urgency: normal` and a `Topic` per day.
- It settles each person with this mapping:

  | Push service answer | Meaning |
  | --- | --- |
  | 201 | Sent |
  | 404 or 410 | Gone: delete the subscription |
  | 429 | Retry, honouring `Retry-After` |
  | 5xx | Retry |
  | 400 or 413 | Our bug: log it, do not retry |

The rules live in pure modules under `supabase/functions/_shared/reminders/`:
- the due window (mirrored for tests);
- response classification;
- the payload, in the Declarative Web Push shape (`web_push: 8030`, a
  title, a body, `navigate: "/#/"`) that the service worker also reads, so
  iOS 18.4+ shows it even if the worker fails;
- the reminder words.

Only `index.ts` imports `npm:` or `jsr:` modules, so Vitest runs everything
else.

**Free-plan budget:** about 2,900 invocations a month against 500,000; 2s of
CPU per run; 150s wall clock. Cron jobs must stay under 10 minutes each, and
pg_net stops waiting after 2s, which is fine because the function carries
on.

### In the app

`src/lib/reminders/`:
- `support.ts`: supported, iPhone not on the Home Screen, unsupported,
  insecure.
- `subscribe.ts`: request permission only from the button press, subscribe,
  save the subscription, reconcile with `getSubscription()` on every open
  (`pushsubscriptionchange` is unreliable), unsubscribe.
- `deviceLabel.ts`.

Settings are online-only, because permission and subscription belong to the
device; they are not queued like pieces. Signing out on this device
unsubscribes it in the browser first (that works offline), then deletes its
row. A row left behind is removed by the next send's 410.

Studio section "A daily reminder", signed in only. The states, each designed
and tested:

| State | What it shows |
| --- | --- |
| Off | A time (15-minute steps) and days, and "Turn on reminders" |
| Asking | The browser's own prompt, opened only by that press |
| On, this device | "Reminders at 7:30 am, Auckland time, every day. On this iPhone." Change time or days; turn off here; turn off everywhere |
| On elsewhere, not here | "Reminders go to 1 other device." and "Also send them here" |
| Blocked | Notifications are blocked for little wash in this browser's settings, with plain directions; no button that cannot work |
| Prompt dismissed | Back to Off, with a neutral line; never nagging |
| iPhone in a Safari tab | Add little wash to your Home Screen, open it from there and sign in |
| Unsupported browser | Says this browser cannot show reminders |
| Time zone differs | "This device is on Sydney time. Use Sydney time?" |
| Offline / saving / failed | Plain status and "Try again"; the form keeps what was chosen |

Guests see no reminder section. Whether the sign-in sheet mentions reminders
in one clause is a `shape` question. Never on Today, Detail or the chrome
(DESIGN.md, Accounts).

**The words:** a few short lines, chosen by date, for example "A little colour
today? Today's piece is ready when you are." `clarify` writes the final set,
and a test forbids streak, goal, miss, don't forget, again, and the achievement
words in register rule 4.

### Impeccable for this phase

- `shape reminders`, in Operate mode:
  - the section's place in the studio;
  - time and day controls that work with wet hands;
  - how each state reads.
- `clarify`:
  - the notification lines;
  - every state's words;
  - permission directions per platform.
- `onboard`: the first turn-on, from Off to the first reminder arriving.
- `harden`:
  - every row of the state table;
  - revoked permission;
  - an expired subscription;
  - 10 devices;
  - a long time zone name;
  - 24-hour clocks.
- `adapt`: the time picker and day chips at 390, at 844x390 and with text at
  200%.
- Then `critique`, `audit` and `polish` on the studio with each state.
- Release notes and the Privacy page (`src/screens/Privacy.tsx`) also go
  through `clarify`. They must say:
  - what is kept (time, time zone, the push address of each device);
  - when it is deleted (turning off, signing out on that device, deleting the
    account).

### Tests

**Scheduling rules** (unit, pure, every case with a fixed clock):
- NZ spring forward, 27/09/2026: a 02:30 reminder goes at 03:00 local, once.
- NZ fall back, 05/04/2026: 02:30 happens twice, and it is sent once.
- Other zones:
  - Chatham (+12:45/+13:45);
  - Kolkata (+5:30);
  - Adelaide (half-hour DST);
  - a US and a European DST date;
  - Kiritimati (+14) and Pago Pago (-11) across the date line.
- The weekday at local midnight.
- A 23:30 time (window cut at midnight).
- The sender down for 3 hours: nothing late.
- Same-day changes:
  - the time changed after today's reminder: no second one;
  - turned off and on again: no second one;
  - the time zone changed: the new zone applies from the next due time.

**Database** (PGlite with `SET timezone='UTC'`, then the real stack in CI):
- `claim_due_reminders` against the cases above.
- Two overlapping runs claim each person once.
- Painted today is skipped.
- Retry is limited to 3 attempts.
- `settle_reminder` deletes gone subscriptions.
- Row level security:
  - A cannot see B's settings or subscriptions.
  - `authenticated` cannot read `reminder_sends` or call either function.
  - `anon` gets nothing.
  - The 10-device limit holds.
  - Invalid time zones and times are refused.
  - Deleting the account cascades.
- The cron schedule string and command (through the stub).

**The sender** (unit, injected fetch and push sender):
- No or wrong key: 401, and nothing claimed.
- Two devices with one gone: one sent, one deleted.
- 429 is a retry.
- 400 is logged and not retried.
- The payload shape.
- TTL, Urgency and Topic headers.
- The words list.

**Integration (CI)**
- Enable the edge runtime in `supabase/config.toml` and serve the function.
- A local fake push service receives the request.
- The test checks the headers, that a second run sends nothing, and that a
  410 removes the row.
- If Docker networking to the fake service proves fiddly on the runner, the
  same test runs the handler under Deno against the stack's REST API. That is
  recorded as the decision.

**Component:** every row of the state table, with `Notification` and
`PushManager` mocked; the permission request only on press; reconcile on
open; the time zone prompt; offline.

**End-to-end**
- Chromium with notifications granted and `pushManager.subscribe` stubbed:
  - turn on, and the fake backend receives the subscription;
  - change the time;
  - turn off here, and turn off everywhere.
- Denied, through a stubbed `Notification.permission`.
- Unsupported, with `PushManager` removed.
- An iPhone Safari tab (iPhone profile, not standalone).
- Signing out unsubscribes the device.
- axe on each state.

**Mutation checks, each shown red**
- Drop the conflict guard (duplicates).
- Drop the window's upper bound (late sends).
- Drop the painted skip.
- Make the worker skip `showNotification` on a bad payload.

**Real devices (manual, NOT RUN until the owner does them)**

On Android Chrome (installed), the iPhone home-screen app (iOS 16.4+) and
desktop Chrome, Firefox and Safari:
- a reminder arrives at the chosen time;
- tapping it opens Today;
- block, then unblock, notifications;
- remove the app, and its row is gone after the next send.

Daylight saving is covered only by the unit and database tests.

**Activity:** Supabase's reports show the function every 15 minutes, and no
pause warning arrives in 14 days.

### Owner steps

`docs/deploying-reminders.md`, written in this phase:
1. Generate the keys.
2. Run `supabase secrets set` for the private key, subject and secret key.
3. Store the Vault secrets.
4. Run `db push`.
5. Run `supabase functions deploy send-reminders`.
6. Add `VITE_VAPID_PUBLIC_KEY` in Netlify.
7. Test on the deploy preview.
8. Merge.

---

## Phase 4 - Curation from anywhere

Branch `feat/curate-anywhere`. It answers PRODUCT.md's open decision, "how
the curated catalogue is administered", for now. It follows
`docs/plans/curation-in-app.md` Option B, with git kept as the record.

### The flow

1. Locally, as today, Claude writes proposals
   (`catalog/proposals/<source>.json`) and records set-asides. The curator
   only reviews proposed approvals (agreed 28/09/2026).
2. `npm run catalog:queue -- --source=<s> --subject=<subject>` uploads those
   approvals with every field filled.
   - It uses the secret key from `.env` (never `VITE_`).
   - Pexels and Unsplash plates hotlink, as their terms require.
   - Museum plates, whose hosts refuse hotlinking, are downscaled locally and
     uploaded to a private Storage bucket, then deleted after the pull.
3. The curator opens `/#/curate` on a phone or anywhere, signed in with
   Google. For each plate:
   - approve as proposed (one press);
   - edit any field, then approve;
   - set aside, with an optional reason.
4. At the desk, `npm run catalog:pull`:
   - writes decisions into `catalog/approved/<source>.json`;
   - derives museum images and reports Unsplash downloads, as the review tool
     does now;
   - records set-asides in the learned vocabulary;
   - marks them pulled and removes their previews.

   Then `catalog:build`, and a PR.

### Data

Migration `<timestamp>_curation.sql`:

- **`private.curators (user_id)`**: not exposed to the API. The owner adds
  their own account once in the SQL editor. There is no API path to become a
  curator.
- **`private.is_curator()`**: `security definer`, stable, used by every
  policy. **`public.am_i_curator()`**, a boolean, lets the screen choose what
  to show.
- **`public.curation_queue`**:
  - `id`, `source`, `external_id`, `subject`;
  - `candidate` (jsonb);
  - `proposal` (jsonb, the fields);
  - `suggestions` (jsonb);
  - `preview_path`, `queued_at`.
- **`public.curation_decisions`**:
  - `queue_id` (primary key, so two devices cannot both decide);
  - `decision` (approve or set aside);
  - `fields` (jsonb);
  - `note`, `decided_by`, `decided_at`, `pulled_at`.
- **Checks mirroring `catalog:build`** where SQL can hold them:
  - difficulty in its set;
  - minutes 1 to 120;
  - title and alt length;
  - palette of 1 to 6 swatches with hex.

  `catalog:build` stays the final gate.
- **Policies:** curators select the queue, and insert and update decisions.
  Everyone else, signed in or not, gets nothing. Writes to the queue and
  storage go through the secret key only.
- **Storage:** bucket `curation-previews`, private, readable by curators
  only.

### The screen

- `/#/curate` is a lazy route, so nobody else downloads it. A bundle test
  checks the entry chunk carries none of it.
- For anyone who is not a curator, it says the page is for little wash's
  curator, and shows no data. Row level security returns none anyway.
- **Operate mode, phone first:**
  - the plate large, with the Enlarge view for judging at review size
    (1200px+);
  - the proposed fields as they will appear in the app;
  - "Approve as proposed" as the primary action;
  - edit and set aside as secondary actions;
  - "12 left in still life" (a tool's progress, not practice history).
- **Online only:** a failed save keeps the form. "Already decided on another
  device" for a conflict.
- **Desktop shortcuts** only when focus is not in a field, with a way to turn
  them off (WCAG 2.1.4).

### Impeccable for this phase

- `shape curate`: Operate mode; what makes judging "is this sketchable?" fast
  and sure on a phone.
- `clarify`: actions, conflicts, errors, and the not-a-curator page.
- `onboard`: an empty queue ("Nothing waiting. Queue a subject from your
  desk.").
- `harden`:
  - long alt text;
  - six-swatch palettes;
  - a slow network;
  - an expired session mid-review;
  - two tabs on one plate;
  - a failed preview.
- `adapt`: 390, 844x390, 768 and 1440.
- `optimize`: the lazy chunk's size and plate loading.
- Then `critique`, `audit` and `polish`.

### Tests

**Database (PGlite, then CI)**
- A curator reads the queue and writes decisions.
- An ordinary signed-in person and `anon` can do neither, and cannot read
  `am_i_curator` for anyone else.
- Nobody can add themselves to `curators`.
- A second decision on one plate is refused.
- Every field check.
- Storage policies.

**The CLI** (unit, injected fetch and file system):
- `catalog:queue` sends approvals only.
- Museum previews are uploaded, and provider plates are not.
- `catalog:pull` converts decisions into `ApprovedEntry` exactly.
- It is idempotent: two pulls make no duplicate.
- A field `catalog:build` refuses stops the pull, with the reason.
- Set-asides reach the vocabulary.
- Previews are deleted.

**Component:**
- approve as proposed;
- edit, validate, then approve;
- set aside with a reason;
- a network failure keeps the form;
- a conflict;
- an empty queue;
- not a curator;
- keyboard shortcuts on and off.

**End-to-end with `fakeSupabase`:** a curator reviews three plates (one
approved as proposed, one edited, one set aside). An ordinary account sees
the not-a-curator page.

**Integration (CI):** the same journey against the real stack's policies.

**Bundle:** no curation marker in the entry chunk.

**Mutation checks, each shown red**
- Drop the curator check from the queue policy.
- Drop the decision primary key.
- Drop the pull's dedupe.

---

## Documentation in each phase

- **DESIGN.md**:
  - "Not for me" (Components, plus the Today hierarchy note);
  - "A daily reminder" (its states and the words rules);
  - "The curation screen";
  - the service worker's push-only rule.
- **PRODUCT.md**: reminders built; the curation decision answered.
- **README**: features, scripts (`catalog:queue`, `catalog:pull`), and the
  service worker.
- **Owner checklists**:
  - `docs/deploying-accounts.md`: the migrations-first rule;
  - `docs/deploying-reminders.md` (new);
  - `docs/curating.md`: the queue and pull.
- **Privacy page**: hidden pieces, reminder settings, push addresses.
- **`docs/work-status.md`**: a checkpoint per phase.

## Risks

| Risk | Plan |
| --- | --- |
| Web Push libraries in Supabase's Deno runtime | Step 0 spike with a real device before building on it; two fallbacks named |
| iPhone home-screen sign-in fails | Phase 2a checks it first; the in-app sign-in window becomes a prerequisite for iPhone reminders only |
| Scheduled calls may not count as activity | Measured over 14 days; if a warning still comes, raise it with the user (paid plan or an external trigger) rather than adding one silently |
| A service worker destabilises the e2e suite | Phase 2 alone in its PR; the suite run twice; an activation wait, never retries |
| Code merged before its migration | Owner checklist order; called out in each PR |
| Push addresses are personal data | Coarse labels only; deleted on turn-off, sign-out and account deletion; stated on the Privacy page |
| Curator role leaks | Only in a private schema, only set by SQL; tested that nobody can add themselves |
| Previews fill the 1 GB of storage | Museum plates only, about 250 KB each, deleted on pull; a CLI warning above 200 MB |
| Cron is in beta on Supabase | Reminders are best-effort by definition; failures are visible in function logs |

## Not in this plan

- Offline caching (the parked PWA plan).
- Reminders for guests.
- The name of today's piece in a reminder (decision 5).
- Your own collections, paint box, the painting journal and photo uploads
  (ideas from the same conversation, not chosen).
- A deployed curation tool that writes to git directly
  (`curation-in-app.md` Option C, rejected there).

---

## Phase 1 - as built (19/10/2026)

Branch `feat/not-for-me`, cut from `main` at `e73d018`.

### Decisions taken while building

| Decision | Why |
| --- | --- |
| The hidden list lives on Sources ("Where ideas come from"), not the studio | User, at the `shape` step: it is a standing choice about what is offered, and a list of pieces turned down does not belong beside the record of what someone kept and painted |
| "Not for me" on Today is quieter than "Deal me another" (soft ink, thin underline) | User, at the `shape` step |
| On a phone propped sideways, "Not for me" takes the next line, one short scroll down | User, 19/10/2026, after the measurement below: the three actions need 492px and the row is 475px (863x360) or 357px (667x375). Chosen over an icon on the plate, which would cover a corner of the reference |
| Hiding on Today deals another, pinned like a deal | So Undo puts exactly that piece back and Back is not filled with skipped pieces |
| Today ranks each piece by its own score for the day | The old index into the matching list moved Today's piece whenever any other piece left the list; shown by a mutation check (below) |
| Focus goes back to the pressed control after a deal or a hide | A defect found on the way: dealing by keyboard dropped focus to the page |
| Hidden pieces move into the account on sign-in but are not counted in the sign-in notice | The notice is about what someone kept |
| The fonts e2e check pins a piece with a prompt | Baseline failure found first: it depended on the date (below) |

### Evidence, measured

- **Baseline** (`main` at `e73d018`, 19/10/2026): lint and typecheck exit 0;
  1,120 of 1,120 unit tests; coverage 97.47 / 93.22 / 93.77 / 97.47.
  Playwright at 2 workers: 261 passed, 3 failed - `fonts.spec.ts` "Today draws
  with the brand faces", on all three projects, because the day's piece
  (Mountain Range) had no prompt and so no italic. Fixed in its own commit by
  pinning Dogwood Vase: 6 of 6 on the unchanged build.
- **Red first.** The selection tests (13), the hidden store and hook (24), the
  account record (7) and the database rules (98) failed before the code
  existed, for the stated reason.
- **Mutation checks, each shown red:** a naive "filter, then index" daily pick
  fails both stability properties (on the 189-piece catalogue - first run on
  the 12 placeholders passed vacuously, so the tests now use `CATALOGUE`); an
  open read policy fails 2 database tests; dropping the guest list's emptying
  and the backup's hidden list each fail their service test; showing Undo
  regardless fails the no-timer test; dropping the focus hand-back fails four
  focus tests.
- **Focus after "Deal me another"** (real Chromium, 390x844): before, focus on
  `body`; after, on the button. Component test red before the fix, green after.
- **Propped posture, all 189 pieces:** with "Not for me" in the row, the row
  fitted the first screen for 29 of 189 at 863x360 and 60 of 189 at 667x375
  (all 189 before). After the decision above, Open and Deal fit for 189 of 189
  at both sizes with the same margins as before (11px, 9px); "Not for me" is at
  most 47px below the fold.
- **axe:** a colour-contrast hit on desktop straight after "Not for me" was the
  re-wet mid-fade (credit line 3.79:1, Open button 4.08:1); with the animations
  finished, none. The e2e check waits for animations to end.
- Screenshots: `Claude outputs/not-for-me/before/` and `after/` (Today, Today
  just hidden, everything hidden, Detail hidden, Browse with the hidden line
  and shown, Sources list and empty; phone, propped, tablet, desktop).

### Impeccable critique and polish

`critique` ran as two isolated subagents (design review; detector and browser
evidence). Design health before polish: **26/40**, 0 P0, 1 P1. The detector
and its in-page overlay found nothing on the new elements (their findings were
all on unchanged code); axe found 0 violations on 7 pages at 390 and 1440;
every new control is at least 44px and shows the focus ring.

Fixed in the polish pass, each checked again:

| Finding | Fix |
| --- | --- |
| P1: propped sideways, Undo landed below the fold after a hide | The Undo line is scrolled into view. New e2e test red on the old build on all three projects, green after; 667x375 measured 383-427 of 375 before, 325-369 after |
| P2: "Show" meant both "look at" (Browse) and "un-hide" (Sources, Detail) | Un-hiding is "Bring it back" / "Bring back"; Browse keeps "Show them" and drops `aria-pressed` (a toggle whose words change) |
| P2: "Show them" on Browse could reveal pieces pages down | Hidden matches come first when shown |
| P2: the way back was hard to find | The description names it; the Sources lede says hidden pieces wait there |
| P3: Sources title links 24px tall; thumbnails read their long descriptions | 44px title links; decorative thumbnails |
| Today's count said "0 ideas match" when the matches were hidden | It says every idea that matches is hidden |
| The count beside "Pieces you've hidden" was a tally of turned-down pieces | Removed |

Kept as built, with reasons: "won't come up again" (accurate, and Undo sits
beside it); Undo covers the last hide only (the list on Sources covers the
rest); the 12px indent of a wrapped "Not for me" matches "Deal me another".
