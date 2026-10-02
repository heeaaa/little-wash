-- A stand-in for the few parts of the Supabase platform that the migrations
-- rely on, so they can run on PGlite (Postgres in WebAssembly) in the ordinary
-- unit suite, on a machine with no Docker.
--
-- It is a model, not the real thing. CI also runs the same migrations on a
-- real local Supabase stack (`npm run test:integration`), which is what proves
-- the model right. Keep this file to what Supabase actually provides:
--
--   - the three API roles PostgREST switches into for a request;
--   - auth.users, reduced to the columns the migrations touch;
--   - auth.uid(), copied from Supabase's own definition: the `sub` claim of the
--     request's JWT, which PostgREST places in `request.jwt.claims`.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

grant usage on schema public to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key,
  email text
);

create function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
