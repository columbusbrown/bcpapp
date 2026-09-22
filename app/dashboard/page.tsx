import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

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
        This is a placeholder. The entry/picks form (milestone 2), leaderboard
        (milestone 4), and rooting index (milestone 5) land here next.
      </p>
    </main>
  );
}
