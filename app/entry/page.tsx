import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getPool } from "@/lib/pool";

export default async function MyEntriesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { games, locked, lockLabel } = await getPool(supabase);

  // Row-level security means this only ever returns the signed-in user's entries.
  // picks(count) asks the database to count each entry's picks for us.
  const { data: entries, error } = await supabase
    .from("entries")
    .select("id, entry_label, created_at, picks(count)")
    .order("created_at", { ascending: true });

  const gameCount = games.length;

  return (
    <main style={{ maxWidth: 820, margin: "60px auto", padding: 24 }}>
      <h1>Your entries</h1>

      {gameCount === 0 ? (
        <p>The bowl slate hasn't been posted yet. Check back after Selection Day.</p>
      ) : (
        <p>
          {gameCount} games in this year's pool.{" "}
          {locked
            ? "Entries are locked because the first game has kicked off."
            : `Entries lock at the first kickoff: ${lockLabel} ET.`}
        </p>
      )}

      {error && <p style={{ color: "crimson" }}>Your entries could not be loaded: {error.message}</p>}

      {entries && entries.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse", margin: "16px 0" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ccc" }}>
              <th style={{ padding: 8 }}>Entry</th>
              <th style={{ padding: 8 }}>Picks</th>
              <th style={{ padding: 8 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const pickCount = (entry.picks as { count: number }[])[0]?.count ?? 0;
              const complete = gameCount > 0 && pickCount === gameCount;
              return (
                <tr key={entry.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>
                    <Link href={`/entry/${entry.id}`}>{entry.entry_label}</Link>
                  </td>
                  <td style={{ padding: 8 }}>
                    {pickCount} of {gameCount}
                  </td>
                  <td style={{ padding: 8, color: complete ? "#1e6b34" : "#8a5a00" }}>
                    {complete ? "Complete" : locked ? "Incomplete" : "Draft"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        !error && gameCount > 0 && <p>You don't have any entries yet.</p>
      )}

      {!locked && gameCount > 0 && (
        <p>
          <Link href="/entry/new">Start a new entry</Link>
        </p>
      )}
    </main>
  );
}
