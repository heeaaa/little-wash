# No environment here, on purpose

`vitest.config.ts` points Vite's `envDir` at this directory so that no `.env`
file is ever read by the unit suite. A developer's own `.env` can hold the real
Supabase project's address for `npm run dev`; the tests must not pick it up.
Tests that need accounts configured build their own config.
