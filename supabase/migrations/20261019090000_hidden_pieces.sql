-- Pieces a person has said are not for them ("Not for me"), kept per account.
--
-- Today, "Deal me another" and Browse leave these pieces out; nothing else
-- does. Like saved and painted pieces, a guest's list stays in their browser
-- (src/lib/hidden.ts) and only reaches this table once they sign in. One row
-- per piece, because hiding is a set.
--
-- Additive: the app before this change never reads the table, so this can be
-- applied before the code that uses it is deployed - and must be, or every
-- signed-in start would fail to read it (docs/deploying-accounts.md).
--
-- Plan: docs/plans/not-for-me-reminders-curation.md, Phase 1.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table public.hidden_pieces (
  user_id uuid not null references auth.users (id) on delete cascade,
  piece_id text not null,
  hidden_at timestamptz not null default now(),
  primary key (user_id, piece_id),
  -- The same catalogue-id shape as the other two lists.
  constraint hidden_pieces_piece_id_shape
    check (piece_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$')
);

comment on table public.hidden_pieces is
  'Pieces a signed-in person has said are not for them, one row per piece, in hidden_at order.';

-- ---------------------------------------------------------------------------
-- A ceiling per person
-- ---------------------------------------------------------------------------
-- The same 1,000-row ceiling as saved and painted pieces, from the same
-- function (20261002082000_saved_and_painted.sql explains it).

create trigger hidden_pieces_within_limit
  before insert on public.hidden_pieces
  for each row execute function private.keep_pieces_within_limit();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.hidden_pieces enable row level security;

create policy "Hidden pieces: read your own"
  on public.hidden_pieces for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Hidden pieces: add your own"
  on public.hidden_pieces for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Hidden pieces: change your own"
  on public.hidden_pieces for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Hidden pieces: remove your own"
  on public.hidden_pieces for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- Revoked first, then only what the app uses: no TRUNCATE, which row level
-- security cannot see, and nothing for `anon`.

revoke all on table public.hidden_pieces from public, anon, authenticated;

grant select, insert, update, delete on table public.hidden_pieces to authenticated;
grant select, insert, update, delete on table public.hidden_pieces to service_role;

-- `delete_my_account()` needs no change: these rows go with the account
-- through `on delete cascade`, like the other two lists.
