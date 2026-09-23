import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { requireNamedUser } from "@/lib/account";
import { getPool } from "@/lib/pool";
import EntryForm from "../EntryForm";

export default async function NewEntryPage() {
  const supabase = await createClient();
  const { fullName } = await requireNamedUser(supabase);

  const { games, locked } = await getPool(supabase);
  if (locked || games.length === 0) redirect("/entry");

  return (
    <main style={{ maxWidth: 820, margin: "60px auto", padding: 24 }}>
      <p>
        <Link href="/entry">← Your entries</Link>
      </p>
      <h1>New entry</h1>
      <EntryForm
        games={games}
        entryId={null}
        accountName={fullName}
        initialEntrant={{ forSomeoneElse: false, firstName: "", lastName: "" }}
        initialPicks={{}}
        locked={false}
      />
    </main>
  );
}
