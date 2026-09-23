"use client";

import { useState } from "react";

export type Game = {
  id: string;
  bowl_name: string;
  kickoff_label: string; // already formatted in Eastern time by the server
  tv_network: string | null;
  favorite_team: string;
  underdog_team: string;
  spread: number;
};

type Side = "favorite" | "underdog";
type Pick = { side: Side; points: number };

export default function EntryForm({ games }: { games: Game[] }) {
  // One entry per game that has a number assigned, keyed by game id.
  const [picks, setPicks] = useState<Record<string, Pick>>({});

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
  }

  function pointSelect(game: Game, side: Side) {
    const pick = picks[game.id];
    const value = pick?.side === side ? String(pick.points) : "";
    const teamName = side === "favorite" ? game.favorite_team : game.underdog_team;

    return (
      <select
        aria-label={`Confidence points for ${teamName} in the ${game.bowl_name}`}
        value={value}
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

      <p style={{ fontSize: 14, color: "#555" }}>
        Saving isn't connected yet. Your picks reset if you reload the page.
      </p>
    </>
  );
}
