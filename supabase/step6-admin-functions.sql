-- ---------------------------------------------------------------------------
-- Step 6: database side of the admin page (Checkpoint 2)
--
-- Follows the same pattern as save_entry: the database enforces the rule,
-- so the website cannot bypass it even if the page code has a bug.
--
--   1. is_admin()          - "is the person calling me an admin?"
--   2. read policies       - admins may read ALL entries and profiles
--                            (everyone else still sees only their own rows)
--   3. admin_set_paid()    - the only way to change an entry's paid status
-- ---------------------------------------------------------------------------

-- 1. Helper. SECURITY DEFINER lets it read the profiles table without being
--    blocked by the profiles read policy. Without it, a policy on profiles
--    that asks "am I an admin?" would need to read profiles, which triggers
--    the same policy, which asks again (infinite recursion).
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from profiles p where p.id = auth.uid()), false);
$$;

revoke all on function is_admin() from public, anon;
grant execute on function is_admin() to authenticated;

-- 2. Admin read access. These ADD to the existing "self-readable" policies:
--    when several SELECT policies exist, a row is visible if ANY of them allows it.
drop policy if exists "admins can read all entries" on entries;
create policy "admins can read all entries"
  on entries for select to authenticated
  using (is_admin());

drop policy if exists "admins can read all profiles" on profiles;
create policy "admins can read all profiles"
  on profiles for select to authenticated
  using (is_admin());

-- 3. Mark an entry paid or unpaid. Checks admin status itself, every call.
create or replace function admin_set_paid(p_entry_id uuid, p_paid boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Not authorized.';
  end if;

  if p_paid is null then
    raise exception 'Paid must be true or false.';
  end if;

  update entries set paid = p_paid where id = p_entry_id;

  if not found then
    raise exception 'Entry not found.';
  end if;
end;
$$;

revoke all on function admin_set_paid(uuid, boolean) from public, anon;
grant execute on function admin_set_paid(uuid, boolean) to authenticated;
