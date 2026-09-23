import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import NameForm from "./NameForm";

export default async function AccountNamePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  const hasName = Boolean(profile?.first_name && profile?.last_name);

  return (
    <main style={{ maxWidth: 420, margin: "60px auto", padding: 24 }}>
      <h1>{hasName ? "Your name" : "Add your name"}</h1>
      <p>
        {hasName
          ? "This is the name shown on your entries."
          : "The BCP uses real first and last names. Your entries will be listed under this name."}
      </p>
      <NameForm initialFirst={profile?.first_name ?? ""} initialLast={profile?.last_name ?? ""} />
    </main>
  );
}
