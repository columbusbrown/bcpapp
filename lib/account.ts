import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

// Used at the top of every signed-in page:
//  - not logged in           -> send to /login
//  - logged in, but no name  -> send to /account/name (one-time prompt)
//  - otherwise               -> return the user and their full name
export async function requireNamedUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  if (!profile?.first_name || !profile?.last_name) redirect("/account/name");

  return {
    user,
    firstName: profile.first_name as string,
    lastName: profile.last_name as string,
    fullName: `${profile.first_name} ${profile.last_name}`,
  };
}
