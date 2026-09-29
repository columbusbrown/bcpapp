import { notFound, redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

// Used at the top of every admin page (same idea as requireNamedUser):
//  - not logged in  -> send to /login
//  - logged in, not an admin -> show the normal "page not found" screen,
//    so a non-admin can't tell an admin area exists
//  - admin          -> return the user
//
// The answer comes from the database's is_admin() function, the same one
// the admin read policies and admin_set_paid() use, so there is exactly one
// definition of "admin" in the whole system.
export async function requireAdmin(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) notFound();

  return { user };
}
