import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

// Kickoff times are stored in UTC; everyone sees them in Eastern time.
const kickoffFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function EntryPage() {
  const supabase = await createClient();

  // 1. Only signed-in users can see this page.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Load the pool games, earliest kickoff first.
  const { data: games, error } = await supabase
    .from("games")
    .select("id, bowl_name, kickoff_at, tv_network, favorite_team, underdog_team, spread")
    .eq("in_pool", true)
    .order("kickoff_at", { ascending: true });

  if (error) {
    return (
      <main style={{ maxWidth: 720, margin: "60px auto", padding: 24 }}>
        <h1>Your entry</h1>
        <p style={{ color: "crimson" }}>Games could not be loaded: {error.message}</p>
      </main>
    );
  }

  if (!games || games.length === 0) {
    return (
      <main style={{ maxWidth: 720, margin: "60px auto", padding: 24 }}>
        <h1>Your entry</h1>
        <p>The bowl slate hasn't been posted yet. Check back after Selection Day.</p>
      </main>
    );
  }

  // 3. The confidence range always matches the number of pool games.
  const gameCount = games.length;

  return (
    <main style={{ maxWidth: 720, margin: "60px auto", padding: 24 }}>
      <h1>Your entry</h1>
      <p>
        {gameCount} games in this year's pool. Each game gets a confidence value
        from 1 to {gameCount}, and each number is used once.
      </p>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ccc" }}>
              <th style={{ padding: 8 }}>Bowl</th>
              <th style={{ padding: 8 }}>Kickoff (ET)</th>
              <th style={{ padding: 8 }}>TV</th>
              <th style={{ padding: 8 }}>Favorite</th>
              <th style={{ padding: 8 }}>Underdog</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr key={game.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>{game.bowl_name}</td>
                <td style={{ padding: 8 }}>{kickoffFormat.format(new Date(game.kickoff_at))}</td>
                <td style={{ padding: 8 }}>{game.tv_network ?? "TBD"}</td>
                <td style={{ padding: 8 }}>
                  {game.favorite_team} (-{game.spread})
                </td>
                <td style={{ padding: 8 }}>{game.underdog_team}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
