-- BCP database schema
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Safe to re-run: uses "if not exists" guards.

-- ---------------------------------------------------------------------------
-- Profiles: one row per authenticated user, extends Supabase's auth.users
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  referred_by text,              -- free-text name of who invited them, per your spec
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Invite codes: one code can be used by many people, up to max_uses
-- ---------------------------------------------------------------------------
create table if not exists invite_codes (
  code text primary key,
  label text,                    -- e.g. "2025 general invite"
  max_uses integer,              -- null = unlimited
  uses_count integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Games: the ~41 bowl matchups for the season
-- ---------------------------------------------------------------------------
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  bowl_name text not null,
  city text,
  kickoff_at timestamptz not null,
  tv_network text,
  favorite_team text not null,   -- e.g. "Navy"
  underdog_team text not null,   -- e.g. "Army"
  spread numeric not null,       -- always positive, applies to the favorite
  sort_order integer not null,   -- controls display order / column order
  final_favorite_score integer,  -- null until the game is final
  final_underdog_score integer,  -- null until the game is final
  created_at timestamptz not null default now()
);

-- Which team actually covered, once the game is final.
-- Computed in application code when scores are entered (see /lib/scoring.ts,
-- milestone 3) rather than stored redundantly here.

-- ---------------------------------------------------------------------------
-- Entries: a user can have multiple entries (per your "multiple entries" rule)
-- ---------------------------------------------------------------------------
create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  entry_label text not null,     -- e.g. "Sam Brown" / "Sam Brown 2"
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Picks: one row per (entry, game). This is the heart of the pool.
-- ---------------------------------------------------------------------------
create table if not exists picks (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references entries(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  team_picked text not null,     -- must equal favorite_team or underdog_team
  confidence_points integer not null check (confidence_points between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One pick per game per entry:
  unique (entry_id, game_id),
  -- Each confidence number used exactly once per entry (the rule new users
  -- always trip over):
  unique (entry_id, confidence_points)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table entries enable row level security;
alter table picks enable row level security;
alter table games enable row level security;
alter table invite_codes enable row level security;

-- Everyone signed in can read games (schedule/spreads are not secret).
create policy if not exists "games are readable by authenticated users"
  on games for select to authenticated using (true);

-- Users can see and manage only their own profile/entries.
create policy if not exists "profiles are self-readable"
  on profiles for select to authenticated using (auth.uid() = id);
create policy if not exists "profiles are self-updatable"
  on profiles for update to authenticated using (auth.uid() = id);

create policy if not exists "entries are self-readable"
  on entries for select to authenticated using (auth.uid() = user_id);
create policy if not exists "entries are self-manageable"
  on entries for all to authenticated using (auth.uid() = user_id);

-- Picks: a user can manage their own entry's picks. Making everyone's picks
-- visible to everyone after the first kickoff (per your rule) is handled by
-- a separate, more permissive policy added in milestone 2 once "first
-- kickoff has passed" is easy to compute - keeping this restrictive for now
-- is the safe default.
create policy if not exists "picks are owner-readable"
  on picks for select to authenticated
  using (exists (select 1 from entries e where e.id = entry_id and e.user_id = auth.uid()));
create policy if not exists "picks are owner-manageable"
  on picks for all to authenticated
  using (exists (select 1 from entries e where e.id = entry_id and e.user_id = auth.uid()));
