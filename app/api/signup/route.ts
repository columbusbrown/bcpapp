import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const { inviteCode, firstName, lastName, email, password, referredBy } =
    await request.json();

  // Trim first, so a name made only of spaces counts as missing.
  const first = typeof firstName === "string" ? firstName.trim() : "";
  const last = typeof lastName === "string" ? lastName.trim() : "";

  if (!inviteCode || !first || !last || !email || !password) {
    return NextResponse.json(
      { error: "Invite code, first name, last name, email, and password are all required." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // 1. Validate the invite code before creating any account. This is a
  //    server-only check (never trust a code check that happens in the
  //    browser) so a determined person can't just skip the form.
  const { data: invite, error: inviteError } = await admin
    .from("invite_codes")
    .select("*")
    .eq("code", inviteCode.trim())
    .eq("active", true)
    .maybeSingle();

  if (inviteError) {
    return NextResponse.json({ error: "Could not validate invite code." }, { status: 500 });
  }
  if (!invite) {
    return NextResponse.json({ error: "That invite code isn't valid." }, { status: 400 });
  }
  if (invite.max_uses !== null && invite.uses_count >= invite.max_uses) {
    return NextResponse.json({ error: "That invite code has reached its use limit." }, { status: 400 });
  }

  // 2. Create the auth user.
  const supabase = await createClient();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError || !signUpData.user) {
    return NextResponse.json(
      { error: signUpError?.message ?? "Could not create account." },
      { status: 400 }
    );
  }

  // 3. Create the profile row and bump the invite code's use count.
  //    Both use the admin client since RLS would otherwise block writing a
  //    profile before the user's session cookie is fully established.
  const { error: profileError } = await admin.from("profiles").insert({
    id: signUpData.user.id,
    first_name: first,
    last_name: last,
    email,
    referred_by: referredBy || null,
  });

  if (profileError) {
    return NextResponse.json({ error: "Account created, but profile setup failed. Contact the pool admin." }, { status: 500 });
  }

  await admin
    .from("invite_codes")
    .update({ uses_count: invite.uses_count + 1 })
    .eq("code", invite.code);

  return NextResponse.json({ ok: true });
}
