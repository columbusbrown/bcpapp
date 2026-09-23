"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { Game, Pick, Side } from "@/lib/pool";

type Props = {
  games: Game[];
  entryId: string | null; // null = a brand-new entry that hasn't been saved yet
  accountName: string; // the signed-in person's full name
  initialEntrant: { forSomeoneElse: boolean; firstName: string; lastName: string };
  initialPicks: Record<string, Pick>;
  locked: boolean;
};

export default function EntryForm({ games, entryId, accountName, initialEntrant, initialPicks, locked }: Props) {
  const router = useRouter();
  const [forSomeoneElse, setForSomeoneElse] = useState(initialEntrant.forSomeoneElse);
  const [entrantFirst, setEntrantFirst] = useState(initialEntrant.firstName);
  const [entrantLast, setEntrantLast] = useState(initialEntrant.lastName);
  const [picks, setPicks] = useState<Record<string, Pick>>(initialPicks);
  const [unsaved, setUnsaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const gameCount = games.length;
  const pointOptions = Array.from({ length: gameCount }, (_, i) => gameCount - i); // N down to 1

  // Which game is currently holding each confidence number.
  const pointOwner = new Map<number, string>();
  for (const [gameId, pick] of Object.entries(picks)) {
    pointOwner.set(pick.points, gameId);
  }

  const pickedCount = Object.keys(picks).length;
  const isComplete = pickedCount === gameCount;

  function assign(gameId: string, side: Side, value: string) {
    setPicks((current) => {
      const next = { ...current };
      if (value === "") {
        // Clearing the number under the team currently picked removes the pick.
        if (next[gameId]?.side === side) delete next[gameId];
      } else {
        // A number under one team replaces anything under the other team,
        // just like moving the number to the other cell in Excel.
        next[gameId] = { side, points: Number(value) };
      }
      return next;
    });
    setUnsaved(true);
    setMessage(null);
  }

  async function save() {
    setSaving(true);
    setMessage(null);

    // Translate "favorite/underdog" into the team name the database stores.
    const payload = games
      .filter((game) => picks[game.id])
      .map((game) => {
        const pick = picks[game.id];
        return {
          game_id: game.id,
          team_picked: pick.side === "favorite" ? game.favorite_team : game.underdog_team,
          confidence_points: pick.points,
        };
      });

    const supabase = createClient();
    const { data, error } = await supabase.rpc("save_entry", {
      p_entry_id: entryId,
      // Empty names mean "this entry is for me"; the database uses my account name.
      p_entrant_first_name: forSomeoneElse ? entrantFirst : null,
      p_entrant_last_name: forSomeoneElse ? entrantLast : null,
      p_picks: payload,
    });

    setSaving(false);

    if (error) {
      // The database explains exactly which rule was broken.
      setMessage({ text: error.message, isError: true });
      return;
    }

    setUnsaved(false);
    setMessage({
      text: isComplete
        ? "Saved. This entry is complete. You can keep editing until the first kickoff."
        : `Saved as a draft: ${pickedCount} of ${gameCount} games picked. Finish before the first kickoff.`,
      isError: false,
    });

    // A brand-new entry now has an id, so move to its own page.
    // Later saves then update this entry instead of creating another one.
    if (!entryId && data) {
      router.replace(`/entry/${data}?created=1`);
    }
    router.refresh();
  }

  function pointSelect(game: Game, side: Side) {
    const pick = picks[game.id];
    const value = pick?.side === side ? String(pick.points) : "";
    const teamName = side === "favorite" ? game.favorite_team : game.underdog_team;

    return (
      <select
        aria-label={`Confidence points for ${teamName} in the ${game.bowl_name}`}
        value={value}
        disabled={locked}
        onChange={(e) => assign(game.id, side, e.target.value)}
        style={{ marginTop: 6, padding: 6, minWidth: 72, fontSize: 16 }}
      >
        <option value="">—</option>
        {pointOptions.map((n) => {
          const owner = pointOwner.get(n);
          const usedElsewhere = owner !== undefined && owner !== game.id;
          return (
            <option key={n} value={n} disabled={usedElsewhere}>
              {usedElsewhere ? `${n} (used)` : n}
            </option>
          );
        })}
      </select>
    );
  }

  function teamCell(game: Game, side: Side) {
    const isPicked = picks[game.id]?.side === side;
    const label =
      side === "favorite"
        ? `${game.favorite_team} (-${game.spread})`
        : `${game.underdog_team} (+${game.spread})`;

    return (
      <td
        style={{
          padding: 8,
          verticalAlign: "top",
          background: isPicked ? "#e6f4ea" : undefined,
          fontWeight: isPicked ? 600 : 400,
        }}
      >
        <div>{label}</div>
        {pointSelect(game, side)}
      </td>
    );
  }

  return (
    <>
      <fieldset disabled={locked} style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12, marginBottom: 16 }}>
        <legend>Who is this entry for?</legend>
        <label style={{ display: "block", marginBottom: 6 }}>
          <input
            type="radio"
            name="entrant"
            checked={!forSomeoneElse}
            onChange={() => {
              setForSomeoneElse(false);
              setUnsaved(true);
            }}
          />{" "}
          Me ({accountName})
        </label>
        <label style={{ display: "block" }}>
          <input
            type="radio"
            name="entrant"
            checked={forSomeoneElse}
            onChange={() => {
              setForSomeoneElse(true);
              setUnsaved(true);
            }}
          />{" "}
          Someone else, such as a family member or pet
        </label>

        {forSomeoneElse && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
            <label>
              First name
              <input
                required
                value={entrantFirst}
                onChange={(e) => {
                  setEntrantFirst(e.target.value);
                  setUnsaved(true);
                }}
                style={{ display: "block", marginTop: 4, padding: 8, fontSize: 16 }}
              />
            </label>
            <label>
              Last name
              <input
                required
                value={entrantLast}
                onChange={(e) => {
                  setEntrantLast(e.target.value);
                  setUnsaved(true);
                }}
                style={{ display: "block", marginTop: 4, padding: 8, fontSize: 16 }}
              />
            </label>
          </div>
        )}
      </fieldset>

      <p
        role="status"
        style={{
          padding: 12,
          borderRadius: 6,
          background: isComplete ? "#e6f4ea" : "#f3f3f3",
        }}
      >
        {isComplete
          ? `All ${gameCount} games picked, and every number from 1 to ${gameCount} is used once.`
          : `${pickedCount} of ${gameCount} games picked. Put a number under the team you're taking.`}
      </p>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ccc" }}>
              <th style={{ padding: 8 }}>Game</th>
              <th style={{ padding: 8 }}>Favorite</th>
              <th style={{ padding: 8 }}>Underdog</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr key={game.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 8, verticalAlign: "top" }}>
                  <div style={{ fontWeight: 600 }}>{game.bowl_name}</div>
                  <div style={{ fontSize: 14, color: "#555" }}>
                    {game.kickoff_label} ET, {game.tv_network ?? "TV TBD"}
                  </div>
                </td>
                {teamCell(game, "favorite")}
                {teamCell(game, "underdog")}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!locked && (
        <div style={{ position: "sticky", bottom: 0, background: "white", padding: "12px 0", borderTop: "1px solid #eee" }}>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            style={{ padding: "10px 20px", fontSize: 16 }}
          >
            {saving ? "Saving…" : isComplete ? "Save entry" : "Save draft"}
          </button>
          {unsaved && !saving && (
            <span style={{ marginLeft: 12, color: "#8a5a00" }}>You have unsaved changes.</span>
          )}
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "#555" }}>
            Entrants receive the daily bowl recap by email. You can unsubscribe from any   recap.
          </p>
          {message && (
            <p role="alert" style={{ margin: "8px 0 0", color: message.isError ? "crimson" : "#1e6b34" }}>
              {message.text}
            </p>
          )}
        </div>
      )}
    </>
  );
}
