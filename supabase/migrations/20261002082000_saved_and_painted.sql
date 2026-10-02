-- Saved and painted pieces, kept per account.
--
-- little wash works with no account at all: a guest's pieces stay in their
-- browser and nothing reaches this database. These tables hold the pieces of
-- people who chose to sign in, so the pieces follow them across devices. The
-- shape mirrors the browser's own record (src/lib/favorites.ts and
-- src/lib/painted.ts): one row per piece, because saving and painting are sets.
--
-- Access is enforced here, not in the app. Row level security lets a signed-in
-- person read and change only their own rows, and nobody signed out can read
-- anything. Since 30/05/2026 a new Supabase project exposes no table to its API
-- until it is granted, so the grants below are exactly what the app needs and
-- no more - and they are applied as revoke-then-grant, so an older project that
-- still grants everything by default ends up the same.
--
-- Plan and reasoning: docs/plans/google-sign-in.md.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.saved_pieces (
  user_id uuid not null references auth.users (id) on delete cascade,
  piece_id text not null,
  saved_at timestamptz not null default now(),
  primary key (user_id, piece_id),
  -- A catalogue id: letters, digits, "-" and "_". The longest today is 53
  -- characters; the limit stops anyone storing essays in it.
  constraint saved_pieces_piece_id_shape
    check (piece_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$')
);

comment on table public.saved_pieces is
  'Pieces a signed-in person has saved, one row per piece, in saved_at order.';

create table public.painted_pieces (
  user_id uuid not null references auth.users (id) on delete cascade,
  piece_id text not null,
  -- The person's own calendar day, as their device saw it. A date, not a
  -- timestamp, and never converted: "the day I painted it" is what a person
  -- means, wherever the server happens to be.
  painted_on date not null,
  marked_at timestamptz not null default now(),
  primary key (user_id, piece_id),
  constraint painted_pieces_piece_id_shape
    check (piece_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$'),
  constraint painted_pieces_painted_on_range
    check (painted_on between date '2000-01-01' and date '2100-12-31')
);

comment on table public.painted_pieces is
  'Pieces a signed-in person has marked painted, one row per piece, with the local day.';

-- ---------------------------------------------------------------------------
-- A ceiling per person
-- ---------------------------------------------------------------------------
-- The catalogue holds 189 pieces. Without a ceiling, one signed-in person with
-- a script could fill the free plan's 500 MB with made-up ids. 1,000 rows per
-- table is far beyond any real use and matches the API's own max_rows, so the
-- app can always read a whole list in one request.

create schema if not exists private;
revoke all on schema private from public;

create function private.keep_pieces_within_limit()
returns trigger
language plpgsql
-- Runs as the person inserting, so row level security limits the count to
-- their own rows - which is exactly the count wanted.
security invoker
set search_path = ''
as $$
declare
  others integer;
begin
  -- One request at a time per person and list, until it commits. Without
  -- this, parallel requests each count only rows already committed, and
  -- together could pass the ceiling (independent review, 02/10/2026).
  perform pg_advisory_xact_lock(hashtextextended(tg_table_name || ':' || new.user_id::text, 0));

  execute format(
    'select count(*) from %I.%I where user_id = $1 and piece_id <> $2',
    tg_table_schema,
    tg_table_name
  )
  into others
  using new.user_id, new.piece_id;

  -- "Others" leaves out this piece, so saving again a piece that is already
  -- there still works at the limit; only a new one is refused.
  if others >= 1000 then
    raise exception 'little wash keeps at most 1000 pieces in each list'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger saved_pieces_within_limit
  before insert on public.saved_pieces
  for each row execute function private.keep_pieces_within_limit();

create trigger painted_pieces_within_limit
  before insert on public.painted_pieces
  for each row execute function private.keep_pieces_within_limit();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
-- `(select auth.uid())` rather than `auth.uid()`: Postgres then evaluates it
-- once per statement instead of once per row (Supabase's own guidance).

alter table public.saved_pieces enable row level security;
alter table public.painted_pieces enable row level security;

create policy "Saved pieces: read your own"
  on public.saved_pieces for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Saved pieces: add your own"
  on public.saved_pieces for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Saved pieces: change your own"
  on public.saved_pieces for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Saved pieces: remove your own"
  on public.saved_pieces for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Painted pieces: read your own"
  on public.painted_pieces for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Painted pieces: add your own"
  on public.painted_pieces for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Painted pieces: change your own"
  on public.painted_pieces for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Painted pieces: remove your own"
  on public.painted_pieces for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- Revoked first, then only what the app uses. TRUNCATE in particular is not
-- subject to row level security, so it must never reach a signed-in person.
-- Nothing at all for `anon`: a guest's pieces never leave their browser.

revoke all on table public.saved_pieces from public, anon, authenticated;
revoke all on table public.painted_pieces from public, anon, authenticated;

grant select, insert, update, delete on table public.saved_pieces to authenticated;
grant select, insert, update, delete on table public.painted_pieces to authenticated;

grant select, insert, update, delete on table public.saved_pieces to service_role;
grant select, insert, update, delete on table public.painted_pieces to service_role;

-- ---------------------------------------------------------------------------
-- Leaving
-- ---------------------------------------------------------------------------
-- Deletes the calling person's account. Their saved and painted rows go with
-- it through `on delete cascade`, and Supabase Auth's own tables (identities,
-- sessions, refresh tokens) cascade from auth.users the same way, so every
-- session they had stops working.
--
-- `security definer` because only the database owner may delete from
-- auth.users; the function can only ever delete the caller, and an empty
-- search_path means nothing it names can be swapped for another object.

create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'Only a signed-in person can delete their account'
      using errcode = 'insufficient_privilege';
  end if;

  delete from auth.users where id = caller;
end;
$$;

comment on function public.delete_my_account() is
  'Deletes the signed-in caller''s account and, by cascade, their saved and painted pieces.';

revoke all on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.delete_my_account() to authenticated;
