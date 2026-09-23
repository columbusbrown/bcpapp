import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import EntryForm, { type Game } from "./EntryForm";

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

  // 3. Format kickoff times here on the server, so every participant sees
  //    Eastern time regardless of their own device's time zone.
  const formGames: Game[] = games.map((game) => ({
    id: game.id,
    bowl_name: game.bowl_name,
    kickoff_label: kickoffFormat.format(new Date(game.kickoff_at)),
    tv_network: game.tv_network,
    favorite_team: game.favorite_team,
    underdog_team: game.underdog_team,
    spread: Number(game.spread),
  }));

  return (
    <main style={{ maxWidth: 820, margin: "60px auto", padding: 24 }}>
      <h1>Your entry</h1>
      <p>
        {formGames.length} games in this year's pool. Put a confidence number
        under the team you're taking. Each number from 1 to {formGames.length} is
        used once.
      </p>
      <EntryForm games={formGames} />
    </main>
  );
}
