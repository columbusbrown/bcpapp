-- ===========================================================================
-- Step 5: Daily recap mailing list
--
-- Purpose: stores everyone who receives the daily bowl recap email.
--   - Family/friends who don't enter can sign up themselves (public form).
--   - Anyone who creates an entry is subscribed automatically (trigger below).
--   - Unsubscribing sets unsubscribed_at; rows are never deleted, so a
--     person who opted out is never silently re-added.
--
-- Safe to re-run: every statement is written so running it twice does no harm.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Subscriber table
-- ---------------------------------------------------------------------------
create table if not exists public.recap_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,                 -- stored lowercase by app/trigger
  name text,                                  -- optional
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz,                -- null = active subscriber
  unsubscribe_token uuid not null default gen_random_uuid()  -- used in one-click unsubscribe links
);


-- ---------------------------------------------------------------------------
-- 2. Row Level Security
--    The public (browser) key may ADD an email but may never READ the list.
--    Server-side code reads the list with the secret key when sending recaps.
-- ---------------------------------------------------------------------------
alter table public.recap_subscribers enable row level security;

drop policy if exists "Anyone can subscribe" on public.recap_subscribers;
create policy "Anyone can subscribe"
  on public.recap_subscribers
  for insert
  to anon, authenticated
  with check (true);


-- ---------------------------------------------------------------------------
-- 3. Auto-subscribe entrants
--    When a new entry (including a draft) is created, copy the owner's login
--    email into the subscriber list.
--    - security definer: needed to read auth.users, which normal users can't.
--    - set search_path: standard safety pairing with security definer.
--    - on conflict do nothing: skips people already on the list, and leaves
--      anyone who unsubscribed unsubscribed.
-- ---------------------------------------------------------------------------
create or replace function public.auto_subscribe_entrant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.recap_subscribers (email)
  select lower(u.email)
  from auth.users u
  where u.id = new.user_id
  on conflict (email) do nothing;

  return new;
end;
$$;

drop trigger if exists auto_subscribe_on_entry on public.entries;
create trigger auto_subscribe_on_entry
  after insert on public.entries
  for each row
  execute function public.auto_subscribe_entrant();


-- ---------------------------------------------------------------------------
-- 4. Backfill: subscribe anyone who already had an entry before the trigger
--    existed. Harmless to re-run.
-- ---------------------------------------------------------------------------
insert into public.recap_subscribers (email)
select distinct lower(u.email)
from auth.users u
join public.entries e on e.user_id = u.id
on conflict (email) do nothing;
