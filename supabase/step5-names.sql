-- Step 5: real names and "who is this entry for"
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Account holders get separate first and last names.
--    Left nullable so existing accounts keep working; the app asks those
--    users for their name once, at their next visit.
--    display_name is retired (kept only so old data isn't lost).
-- ---------------------------------------------------------------------------
alter table profiles add column if not exists first_name text;
alter table profiles add column if not exists last_name text;
alter table profiles alter column display_name drop not null;

-- ---------------------------------------------------------------------------
-- 2. Entries record who they are FOR.
--    Both empty  = the entry is for the account holder (name comes from profile).
--    Both filled = the entry is for someone else (a kid, a pet...).
--    entry_label is retired: labels are now calculated, never typed.
-- ---------------------------------------------------------------------------
alter table entries add column if not exists entrant_first_name text;
alter table entries add column if not exists entrant_last_name text;
alter table entries alter column entry_label drop not null;

alter table entries drop constraint if exists entries_entrant_name_both_or_neither;
alter table entries add constraint entries_entrant_name_both_or_neither check (
  (entrant_first_name is null and entrant_last_name is null)
  or (length(trim(entrant_first_name)) > 0 and length(trim(entrant_last_name)) > 0)
);

-- ---------------------------------------------------------------------------
-- 3. Close the profile loophole: users could previously edit ANY column of
--    their own profile, including is_admin. Names now change only through
--    set_my_name() below.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles are self-updatable" on profiles;

create or replace function set_my_name(p_first_name text, p_last_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be logged in.';
  end if;
  if nullif(trim(p_first_name), '') is null or nullif(trim(p_last_name), '') is null then
    raise exception 'Enter both a first name and a last name.';
  end if;

  update profiles
  set first_name = trim(p_first_name), last_name = trim(p_last_name)
  where id = auth.uid();
end;
$$;

revoke all on function set_my_name(text, text) from public, anon;
grant execute on function set_my_name(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Generated entry labels, in one place so every page (entries list,
--    leaderboard, admin view) numbers them the same way.
--    Rule: numbered only when one account has 2+ entries under the same name,
--    e.g. "Sam Brown 1", "Sam Brown 2", but "Dillon Brown" alone.
--    security_invoker = true makes the view obey the same row-level security
--    as the tables underneath it.
-- ---------------------------------------------------------------------------
drop view if exists entry_labels;
create view entry_labels with (security_invoker = true) as
with named as (
  select
    e.id,
    e.user_id,
    e.created_at,
    e.paid,
    (e.entrant_first_name is not null) as for_someone_else,
    coalesce(e.entrant_first_name, p.first_name) as first_name,
    coalesce(e.entrant_last_name, p.last_name) as last_name
  from entries e
  join profiles p on p.id = e.user_id
)
select
  id,
  user_id,
  created_at,
  paid,
  for_someone_else,
  first_name,
  last_name,
  coalesce(first_name || ' ' || last_name, 'Name needed')
    || case
         when count(*) over (partition by user_id, lower(first_name), lower(last_name)) > 1
         then ' ' || row_number() over (
                partition by user_id, lower(first_name), lower(last_name)
                order by created_at, id)
         else ''
       end as label
from named;

grant select on entry_labels to authenticated;

-- ---------------------------------------------------------------------------
-- 5. save_entry now takes who the entry is for instead of a typed label.
--    (Replaces the Step 4 version.)
-- ---------------------------------------------------------------------------
drop function if exists save_entry(uuid, text, jsonb);

create or replace function save_entry(
  p_entry_id uuid,
  p_entrant_first_name text,
  p_entrant_last_name text,
  p_picks jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user       uuid := auth.uid();
  v_entry      uuid := p_entry_id;
  v_first      text := nullif(trim(p_entrant_first_name), '');
  v_last       text := nullif(trim(p_entrant_last_name), '');
  v_lock_at    timestamptz;
  v_game_count integer;
begin
  if v_user is null then
    raise exception 'You must be logged in to save an entry.';
  end if;

  -- The account holder must have a real name on file first.
  if not exists (
    select 1 from profiles
    where id = v_user and first_name is not null and last_name is not null
  ) then
    raise exception 'Add your first and last name to your account before saving an entry.';
  end if;

  -- For someone else: both names required. For yourself: neither.
  if (v_first is null) <> (v_last is null) then
    raise exception 'Enter both a first name and a last name for this entry.';
  end if;

  -- Lock: no saves once the first pool game has kicked off.
  select min(kickoff_at), count(*) into v_lock_at, v_game_count
  from games where in_pool;

  if v_lock_at is not null and now() >= v_lock_at then
    raise exception 'Entries are locked. The first game has kicked off.';
  end if;

  if p_picks is null or jsonb_typeof(p_picks) <> 'array' then
    raise exception 'Picks were sent in an unexpected format.';
  end if;

  drop table if exists incoming;
  create temp table incoming on commit drop as
  select * from jsonb_to_recordset(p_picks)
    as p(game_id uuid, team_picked text, confidence_points integer);

  if exists (
    select 1 from incoming i
    left join games g on g.id = i.game_id and g.in_pool
    where g.id is null
       or i.team_picked is null
       or i.team_picked not in (g.favorite_team, g.underdog_team)
  ) then
    raise exception 'A pick refers to a game or team that is not in this year''s pool.';
  end if;

  if exists (
    select 1 from incoming
    where confidence_points is null
       or confidence_points < 1
       or confidence_points > v_game_count
  ) then
    raise exception 'Confidence points must be between 1 and %.', v_game_count;
  end if;

  if exists (select 1 from incoming group by game_id having count(*) > 1) then
    raise exception 'Each game can have only one pick.';
  end if;

  if exists (select 1 from incoming group by confidence_points having count(*) > 1) then
    raise exception 'Each confidence number can be used only once.';
  end if;

  if v_entry is null then
    insert into entries (user_id, entrant_first_name, entrant_last_name)
    values (v_user, v_first, v_last)
    returning id into v_entry;
  else
    update entries
    set entrant_first_name = v_first, entrant_last_name = v_last
    where id = v_entry and user_id = v_user;

    if not found then
      raise exception 'That entry does not exist or does not belong to you.';
    end if;
  end if;

  delete from picks where entry_id = v_entry;

  insert into picks (entry_id, game_id, team_picked, confidence_points)
  select v_entry, game_id, team_picked, confidence_points from incoming;

  return v_entry;
end;
$$;

revoke all on function save_entry(uuid, text, text, jsonb) from public, anon;
grant execute on function save_entry(uuid, text, text, jsonb) to authenticated;
