import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { requireNamedUser } from "@/lib/account";
import { getPool } from "@/lib/pool";

export default async function MyEntriesPage() {
  const supabase = await createClient();
  await requireNamedUser(supabase);

  const { games, locked, lockLabel } = await getPool(supabase);
  const gameCount = games.length;

  // entry_labels is the database view that builds names like "Sam Brown 1".
  // Row-level security means it only returns the signed-in user's entries.
  const { data: entries, error } = await supabase
    .from("entry_labels")
    .select("id, label, created_at")
    .order("created_at", { ascending: true });

  // Count picks per entry.
  const { data: pickRows } = await supabase.from("picks").select("entry_id");
  const pickCounts = new Map<string, number>();
  for (const row of pickRows ?? []) {
    pickCounts.set(row.entry_id, (pickCounts.get(row.entry_id) ?? 0) + 1);
  }

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
              const pickCount = pickCounts.get(entry.id) ?? 0;
              const complete = gameCount > 0 && pickCount === gameCount;
              return (
                <tr key={entry.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>
                    <Link href={`/entry/${entry.id}`}>{entry.label}</Link>
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
