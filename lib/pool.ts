import type { SupabaseClient } from "@supabase/supabase-js";

export type Game = {
  id: string;
  bowl_name: string;
  kickoff_label: string; // formatted in Eastern time on the server
  tv_network: string | null;
  favorite_team: string;
  underdog_team: string;
  spread: number;
};

export type Side = "favorite" | "underdog";
export type Pick = { side: Side; points: number };

// Kickoff times are stored in UTC; everyone sees them in Eastern time.
export const easternFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

// Loads this year's pool games (earliest first) and works out the lock time,
// which is the first pool game's kickoff.
export async function getPool(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("games")
    .select("id, bowl_name, kickoff_at, tv_network, favorite_team, underdog_team, spread")
    .eq("in_pool", true)
    .order("kickoff_at", { ascending: true });

  if (error) throw new Error(`Games could not be loaded: ${error.message}`);

  const rows = data ?? [];
  const games: Game[] = rows.map((g) => ({
    id: g.id,
    bowl_name: g.bowl_name,
    kickoff_label: easternFormat.format(new Date(g.kickoff_at)),
    tv_network: g.tv_network,
    favorite_team: g.favorite_team,
    underdog_team: g.underdog_team,
    spread: Number(g.spread),
  }));

  const lockAt = rows.length > 0 ? new Date(rows[0].kickoff_at) : null;
  const locked = lockAt !== null && Date.now() >= lockAt.getTime();

  return {
    games,
    locked,
    lockLabel: lockAt ? easternFormat.format(lockAt) : null,
  };
}
