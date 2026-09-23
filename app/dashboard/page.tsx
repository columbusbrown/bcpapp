import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main style={{ maxWidth: 640, margin: "60px auto", padding: 24 }}>
      <h1>You're in.</h1>
      <p>
        <Link href="/entry">Go to your entries</Link> to make or edit your picks.
      </p>
    </main>
  );
}
