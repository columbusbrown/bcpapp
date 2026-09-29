import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const supabase = await createClient();
  await requireAdmin(supabase);

  // These counts prove the admin read policies work: a normal account would
  // only ever see its own rows, an admin sees everyone's.
  const { count: entryCount } = await supabase
    .from("entries")
    .select("id", { count: "exact", head: true });
  const { count: accountCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  return (
    <main style={{ maxWidth: 820, margin: "60px auto", padding: 24 }}>
      <p>
        <Link href="/dashboard">← Dashboard</Link>
      </p>
      <h1>Admin</h1>
      <p>You are signed in as an administrator.</p>
      <ul>
        <li>Accounts: {accountCount ?? "?"}</li>
        <li>Entries: {entryCount ?? "?"}</li>
      </ul>
    </main>
  );
}
