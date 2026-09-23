import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getPool } from "@/lib/pool";
import EntryForm from "../EntryForm";

export default async function NewEntryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { games, locked } = await getPool(supabase);
  if (locked || games.length === 0) redirect("/entry");

  // Suggest a name: "Sam Brown" for a first entry, "Sam Brown 2" for a second, and so on.
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();
  const { count } = await supabase.from("entries").select("id", { count: "exact", head: true });

  const baseName = profile?.display_name ?? "My entry";
  const suggestedLabel = count && count > 0 ? `${baseName} ${count + 1}` : baseName;

  return (
    <main style={{ maxWidth: 820, margin: "60px auto", padding: 24 }}>
      <p>
        <Link href="/entry">← Your entries</Link>
      </p>
      <h1>New entry</h1>
      <EntryForm
        games={games}
        entryId={null}
        initialLabel={suggestedLabel}
        initialPicks={{}}
        locked={false}
      />
    </main>
  );
}
