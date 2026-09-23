import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { requireNamedUser } from "@/lib/account";
import { getPool, type Pick } from "@/lib/pool";
import EntryForm from "../EntryForm";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
};

export default async function EditEntryPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { created } = await searchParams;
  const supabase = await createClient();
  const { fullName } = await requireNamedUser(supabase);

  const { games, locked, lockLabel } = await getPool(supabase);

  // Row-level security returns nothing if this entry belongs to someone else,
  // so another user's entry id shows "not found" rather than their picks.
  const { data: entry } = await supabase
    .from("entries")
    .select("id, entrant_first_name, entrant_last_name, picks(game_id, team_picked, confidence_points)")
    .eq("id", id)
    .maybeSingle();

  if (!entry) notFound();

  // The generated label, e.g. "Sam Brown 2" or "Dillon Brown".
  const { data: labelRow } = await supabase.from("entry_labels").select("label").eq("id", id).maybeSingle();

  // The database stores the team name; the form works in favorite/underdog.
  const initialPicks: Record<string, Pick> = {};
  for (const pick of entry.picks ?? []) {
    const game = games.find((g) => g.id === pick.game_id);
    if (!game) continue;
    initialPicks[game.id] = {
      side: pick.team_picked === game.favorite_team ? "favorite" : "underdog",
      points: pick.confidence_points,
    };
  }

  return (
    <main style={{ maxWidth: 820, margin: "60px auto", padding: 24 }}>
      <p>
        <Link href="/entry">← Your entries</Link>
      </p>
      <h1>{labelRow?.label ?? "Entry"}</h1>

      {created && (
        <p role="status" style={{ color: "#1e6b34" }}>
          Entry created and saved.
        </p>
      )}

      <p>
        {locked
          ? "Entries are locked because the first game has kicked off. These are your final picks."
          : `You can change these picks until the first kickoff: ${lockLabel} ET.`}
      </p>

      <EntryForm
        games={games}
        entryId={entry.id}
        accountName={fullName}
        initialEntrant={{
          forSomeoneElse: entry.entrant_first_name !== null,
          firstName: entry.entrant_first_name ?? "",
          lastName: entry.entrant_last_name ?? "",
        }}
        initialPicks={initialPicks}
        locked={locked}
      />
    </main>
  );
}
