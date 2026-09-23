import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { requireNamedUser } from "@/lib/account";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { firstName } = await requireNamedUser(supabase);

  return (
    <main style={{ maxWidth: 640, margin: "60px auto", padding: 24 }}>
      <h1>Welcome, {firstName}.</h1>
      <p>
        <Link href="/entry">Go to your entries</Link> to make or edit your picks.
      </p>
      <p style={{ fontSize: 14 }}>
        <Link href="/account/name">Change your name</Link>
      </p>
    </main>
  );
}
