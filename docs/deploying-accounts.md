# Deploying sign-in: Google, Supabase and Netlify

_Written 02/10/2026 for `feat/google-sign-in`. Plan and decisions:
[`docs/plans/google-sign-in.md`](plans/google-sign-in.md)._

This is the owner's checklist. Everything here happens in a dashboard or a
terminal you control; nothing in it can be done from the repository. Do the
steps in order. Steps 1-5 can be done before the code is merged, and should
be, so the pull request's deploy preview can be tested with real Google
sign-in (step 6) before anything reaches production.

Replace `<your-site>` everywhere with your Netlify site's name, as in
`https://<your-site>.netlify.app` (Netlify, your project, **Project
configuration, General, Project details**; Netlify now calls sites
"projects").

**Never paste a secret key anywhere public, including chat, an issue or a
`VITE_` variable.** The Supabase _publishable_ key and the Google _client ID_
are public by design. The Supabase _secret_ key, the database password and the
Google _client secret_ are not. The build refuses to run if a secret key is
put in a `VITE_` variable.

## Before anything: read two things in the pull request

- [ ] **The privacy page** (`src/screens/Privacy.tsx`, shown at `#/privacy`):
      it says what is kept, where, and how to delete it. It is written to be
      true of this setup, not as legal advice; check it says what you want to
      say, as the person running little wash, before it is public. If you set
      `VITE_SUPPORT_EMAIL` (step 5) it shows that address for questions.
- [ ] **The migration** (`supabase/migrations/*_saved_and_painted.sql`): two
      new tables, their rules, a row limit and the delete-account function.

## What you need

- [ ] The Supabase project: done 02/10/2026, `https://dbbjvtbaljprmfhmxdmr.supabase.co`.
- [ ] Its database password (set when the project was created; it can be reset
      in Project Settings, Database).
- [ ] A Google account to own the Google Cloud project, ideally one you will
      keep (it becomes the support contact people can see).
- [ ] Your Netlify site name.
- [ ] Node 22 and the repository checked out (for step 4).

## Step 1 - check the Supabase project

1. Supabase dashboard, your project, **Project Settings, General**: note the
   region. Sydney (`ap-southeast-2`) is the closest to New Zealand. If it is
   somewhere else and the project is still empty, deleting it and creating it
   again in Sydney costs nothing; otherwise it still works, a little slower.
2. **Project Settings, API Keys**: copy the **Publishable key**
   (`sb_publishable_...`). You need it in step 5. Leave the secret key alone.
3. **Authentication, Sign In / Providers**:
   - **Email**: turn it **off**. little wash only offers Google, and leaving
     email on lets anyone create accounts through the API with the public key.
   - **Anonymous sign-ins**: leave **off**. The database rules assume every
     signed-in person is a real account.
   - Phone: leave off.

## Step 2 - Google Cloud: project, consent screen and client

All of this is in the [Google Cloud console](https://console.cloud.google.com/).

1. **Create a project**, for example "little wash".
2. Open the [Google Auth Platform](https://console.cloud.google.com/auth/overview)
   and choose **Get started**:
   - App name: `little wash`
   - User support email: your address (people can see it)
   - Audience: **External**
   - Contact information: your address
   - Agree to the policy, then **Create**.
3. **Branding**:
   - App home page: `https://<your-site>.netlify.app/`
   - Privacy policy: `https://<your-site>.netlify.app/#/privacy`
   - Authorised domains: `<your-site>.netlify.app` and
     `dbbjvtbaljprmfhmxdmr.supabase.co` (both `netlify.app` and `supabase.co`
     are public suffixes, so these are the right level).
   - Leave the logo empty. A logo makes Google require brand verification,
     which needs every authorised domain verified, and `supabase.co` cannot
     be verified by you.
4. **Data Access**: add the scopes `openid`, `.../auth/userinfo.email` and
   `.../auth/userinfo.profile`. Add nothing else: any sensitive scope triggers
   a review.
5. **Audience**: leave the publishing status on **Testing** for now and add
   your own Google address (and anyone helping test) under **Test users**.
   Testing allows up to 100 listed people.
6. **Clients, Create client**:
   - Application type: **Web application**
   - Name: `little wash web`
   - Authorised JavaScript origins: `https://<your-site>.netlify.app`, and
     `http://localhost:5173` if you will sign in from `npm run dev`
   - Authorised redirect URIs: exactly
     `https://dbbjvtbaljprmfhmxdmr.supabase.co/auth/v1/callback`
   - **Create**, then copy the **Client ID** and **Client secret**. Keep the
     secret somewhere safe (a password manager). It goes into Supabase only.

What people will see: Google's screen will say "Choose an account to continue
to dbbjvtbaljprmfhmxdmr.supabase.co", because that is where Google sends them
back. The sign-in sheet in little wash says so before Google opens. Showing
"little wash" there instead needs a Supabase custom domain, which is a paid
add-on; that is a later decision.

## Step 3 - connect Google to Supabase

1. Supabase, **Authentication, Sign In / Providers, Google**: turn it on, paste
   the **Client ID** into Client IDs and the **Client secret** into Client
   Secret. Leave "Skip nonce checks" and "Allow users without an email" off.
   **Save**.
2. **Authentication, URL Configuration**:
   - Site URL: `https://<your-site>.netlify.app`
   - Redirect URLs, add each of:
     - `https://<your-site>.netlify.app/**`
     - `https://*--<your-site>.netlify.app/**` (deploy previews and branch
       deploys. Use a single `*` here, not `**`: `*` cannot cross a `.` or a
       `/`, so no other site can match it)
     - `http://localhost:5173/**` (only if you sign in from `npm run dev`)
3. **Before adding the preview pattern, stop strangers' previews from building
   on their own.** The repository is public, so anyone can open a pull request
   from a fork, and Netlify would build it at an address the pattern trusts:
   their code could then sign a visitor in and take that visitor's session.
   Netlify treats pull requests from people outside your Netlify team as
   "untrusted deploys", and only holds them for approval when its sensitive
   variable policy applies, which it does by itself only when it spots secret
   values (these variables are all public). So set it yourself: Netlify, your
   project, **Project configuration, Environment variables, Site policies**,
   sensitive variable policy **Require approval**. After that, never approve
   a preview of a pull request you have not read. If you would rather not rely
   on this, add the preview pattern only for step 6 and remove it afterwards;
   previews then simply cannot sign in. Your previews are also private to your
   Netlify team at the moment (they show "This site is private" to anyone
   else, seen 03/10/2026), so nobody outside the team can open one: keep that
   on as well.

## Step 4 - create the tables

The migration is `supabase/migrations/*_saved_and_painted.sql` on the branch.
Read it first; it only adds two tables, their rules, a row limit and the
delete-account function. It changes nothing that exists.

From the repository, in PowerShell or a terminal (no Docker needed for these):

```bash
npx supabase@2.119.0 login                     # opens the browser once
npx supabase@2.119.0 link --project-ref dbbjvtbaljprmfhmxdmr   # asks for the database password
npx supabase@2.119.0 db push --dry-run         # shows what would run
npx supabase@2.119.0 db push                   # applies it
```

Then check, in the Supabase dashboard:

- **Table Editor**: `saved_pieces` and `painted_pieces` exist, each marked
  "RLS enabled".
- **Authentication, Policies**: four policies on each table.
- **Advisors, Security Advisor**: no errors for these tables. One warning is
  expected and intended: `public.delete_my_account` is a `security definer`
  function that signed-in people can call. It is what "Delete my account"
  uses, and it can only ever delete the caller's own account (see the
  migration and `supabase/pglite/policies.test.ts`).

If `db push` cannot connect (some networks cannot reach the database over
IPv6), copy the **Session pooler** connection string from the dashboard's
**Connect** button and run
`npx supabase@2.119.0 db push --db-url "<that string>"`. As a last resort the
SQL can be pasted into the dashboard's SQL Editor and run; if you do that, run
`npx supabase@2.119.0 migration repair --status applied <timestamp>` afterwards
so the CLI knows it has been applied.

## Step 5 - tell Netlify where the project is

Netlify, your project, **Project configuration, Environment variables, Add a
variable**, with **the same value for all deploy contexts**:

| Key | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://dbbjvtbaljprmfhmxdmr.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the `sb_publishable_...` key from step 1 |
| `VITE_SUPPORT_EMAIL` | optional: an address shown on the privacy page |

These are build-time values: Vite writes them into the site when it builds, so
they take effect from the next deploy. They are public, which is fine for these
three. Without them the site simply has no sign-in, as today.

## Step 6 - test on the deploy preview

Open the pull request's deploy preview (Netlify posts the link on the pull
request; if it was built before step 5, **Retry deploy** it). Previews are
private to your Netlify team, so sign in to Netlify in each browser you test
with, your phone's included. Then, signed in with a Google account you added
as a test user:

- [ ] **Studio** shows "Sign in to keep your studio"; the sheet opens, says
      what signing in does and names the Supabase host.
- [ ] **Sign in with Google** goes to Google, then back to the studio, signed
      in, showing your email.
- [ ] Pieces you had saved or painted as a guest in that browser are in the
      account, and the notice says how many came across.
- [ ] Save a piece and mark one painted. Reload: still there.
- [ ] On a second device (your phone), open the same preview link, sign in,
      and see the same pieces. Change something there; bring the first device
      back into view and see it.
- [ ] Turn on aeroplane mode on the phone, mark something painted, turn it off:
      it reaches the account (check on the other device).
- [ ] **Sign out**: the studio is empty, and signing in again brings everything
      back.
- [ ] Cancel at Google's account chooser: you come back with "Sign-in was
      cancelled".
- [ ] **iPhone**: in Safari, then from the home screen (Share, Add to Home
      Screen). The home-screen app keeps its own sign-in, separate from Safari.
      If signing in there leaves you signed out, note it: there is a planned
      follow-up for it, and nothing else is affected.
- [ ] **Delete my account**, with a spare Google account: confirm, and the
      studio is empty; signing in again starts a fresh, empty account. In the
      dashboard, **Authentication, Users** no longer lists it.
- [ ] Open the site from inside Instagram or Facebook: the sheet says to open
      it in Safari or Chrome.

Anything that fails here: stop, and say what you saw. Nothing has reached
production yet.

## Step 7 - let anyone sign in

Google Auth Platform, **Audience**, **Publish app**, confirm. The status becomes
**In production** and any Google account can sign in. With only the three basic
scopes there is no review and no warning screen.

## Step 8 - production

1. Merge the pull request. Netlify deploys `main` to production as usual.
2. Repeat the first four checks of step 6 on `https://<your-site>.netlify.app`.
3. Supabase, **Authentication, Users**: your account is there.

## Keeping it running

- **Pausing.** Free Supabase projects pause after a week with no database
  activity, and people browsing without an account make no requests at all.
  When paused, guests are unaffected; signed-in people keep what is on their
  device and see "Can't reach your account", and new sign-ins fail. Supabase
  emails the owner; **Restore** from the dashboard brings it back with the
  data intact.
- **Usage**: Supabase, Organisation, Usage. The limits that matter are 500 MB of
  database and 50,000 monthly active users. A person's pieces are well under
  0.2 MB.
- **Keys**: if a secret key is ever exposed, rotate it under Project Settings,
  API Keys. The app does not use it, so nothing needs redeploying.

## Turning it off again

- **Hide sign-in, keep the data**: delete the two `VITE_SUPABASE_` variables in
  Netlify and redeploy. The site goes back to guest-only; accounts and their
  pieces stay in Supabase for when it is turned back on.
- **Undo the code**: revert the merge commit on `main`.
- **Remove the tables**: only on purpose, it deletes everyone's pieces:
  `drop table public.saved_pieces, public.painted_pieces;` and
  `drop function public.delete_my_account();` in the SQL Editor.

## Local development against the real project (optional)

Put the two `VITE_SUPABASE_` values in your untracked `.env` and add
`http://localhost:5173/**` to the redirect URLs (step 3) and the JavaScript
origins (step 2). `npm run dev` then signs in for real, against production
data, so use your own account only. The automated tests never use `.env`'s
values: unit tests read no `.env`, and the end-to-end build uses `.env.e2e`,
which points at a fake host.

## When something goes wrong

| What you see | Usually |
| --- | --- |
| Google: "Error 400: redirect_uri_mismatch" | The redirect URI in step 2.6 is not exactly `https://dbbjvtbaljprmfhmxdmr.supabase.co/auth/v1/callback` |
| Google: "Access blocked: little wash has not completed the Google verification process" | The app is in Testing and that account is not a test user (step 2.5), or a sensitive scope was added (step 2.4) |
| Google: "403: disallowed_useragent" | Opened inside another app's browser; open it in Safari or Chrome |
| Supabase: "Unsupported provider: provider is not enabled" | Step 3.1 not saved |
| Back on the production site after signing in on a preview | The preview pattern in step 3.2 is missing or uses the wrong site name |
| "Sign-in didn't finish in this browser" | The attempt was finished in a different browser or app than it started in, or took too long; start again |
| The studio says "Can't reach your account" | The project is paused (restore it) or Supabase is having a bad day |
