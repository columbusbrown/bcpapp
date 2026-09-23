-- Step 4: saving entries
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Close the direct-write door.
--    Participants can still READ their own entries and picks, but every write
--    now has to go through save_entry() below, which enforces the pool rules.
--    (This also stops a participant from marking their own entry as paid.)
-- ---------------------------------------------------------------------------
drop policy if exists "entries are self-manageable" on entries;
drop policy if exists "picks are owner-manageable" on picks;

-- ---------------------------------------------------------------------------
-- 2. save_entry: creates or updates one entry and all of its picks.
--    Everything inside a function runs as a single transaction, so an entry
--    saves completely or not at all.
--    p_entry_id = null creates a new entry; otherwise updates that entry.
--    p_picks    = [{ "game_id": "...", "team_picked": "...", "confidence_points": 39 }, ...]
--    Partial pick lists are allowed (drafts).
-- ---------------------------------------------------------------------------
create or replace function save_entry(p_entry_id uuid, p_entry_label text, p_picks jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user       uuid := auth.uid();
  v_entry      uuid := p_entry_id;
  v_label      text := nullif(trim(p_entry_label), '');
  v_lock_at    timestamptz;
  v_game_count integer;
begin
  if v_user is null then
    raise exception 'You must be logged in to save an entry.';
  end if;

  -- Lock: no saves once the first pool game has kicked off.
  select min(kickoff_at), count(*) into v_lock_at, v_game_count
  from games where in_pool;

  if v_lock_at is not null and now() >= v_lock_at then
    raise exception 'Entries are locked. The first game has kicked off.';
  end if;

  if v_label is null then
    raise exception 'Give this entry a name.';
  end if;

  if p_picks is null or jsonb_typeof(p_picks) <> 'array' then
    raise exception 'Picks were sent in an unexpected format.';
  end if;

  -- Unpack the picks once into a temporary table for checking.
  drop table if exists incoming;
  create temp table incoming on commit drop as
  select * from jsonb_to_recordset(p_picks)
    as p(game_id uuid, team_picked text, confidence_points integer);

  -- Every pick must be a pool game, and the team must be one of its two teams.
  if exists (
    select 1 from incoming i
    left join games g on g.id = i.game_id and g.in_pool
    where g.id is null
       or i.team_picked is null
       or i.team_picked not in (g.favorite_team, g.underdog_team)
  ) then
    raise exception 'A pick refers to a game or team that is not in this year''s pool.';
  end if;

  -- Points must fall between 1 and the number of pool games.
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

  -- Create the entry, or confirm the caller owns the one being edited.
  if v_entry is null then
    insert into entries (user_id, entry_label)
    values (v_user, v_label)
    returning id into v_entry;
  else
    update entries set entry_label = v_label
    where id = v_entry and user_id = v_user;

    if not found then
      raise exception 'That entry does not exist or does not belong to you.';
    end if;
  end if;

  -- Replace the entry's picks with the submitted set.
  delete from picks where entry_id = v_entry;

  insert into picks (entry_id, game_id, team_picked, confidence_points)
  select v_entry, game_id, team_picked, confidence_points from incoming;

  return v_entry;
end;
$$;

-- Only signed-in users may call it.
revoke all on function save_entry(uuid, text, jsonb) from public, anon;
grant execute on function save_entry(uuid, text, jsonb) to authenticated;
