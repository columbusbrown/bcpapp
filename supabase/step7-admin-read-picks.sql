-- ---------------------------------------------------------------------------
-- Step 7: let admins read all picks (Checkpoint 4)
--
-- The admin table shows how many picks each entry has (e.g. 39/39 vs 12/39),
-- so you can tell a finished entry from an abandoned draft.
-- Adds to the existing "picks are owner-readable" policy; regular users
-- still see only their own picks.
-- ---------------------------------------------------------------------------
drop policy if exists "admins can read all picks" on picks;
create policy "admins can read all picks"
  on picks for select to authenticated
  using (is_admin());
