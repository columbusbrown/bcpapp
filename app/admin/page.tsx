import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin";
import { setPaid } from "./actions";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Entry fee per entry, in dollars. Set to null to show counts only.
const ENTRY_FEE: number | null = 10;

type Props = { searchParams: Promise<{ filter?: string }> };

export default async function AdminPage({ searchParams }: Props) {
  const { filter } = await searchParams;
  const unpaidOnly = filter === "unpaid";

  const supabase = await createClient();
  await requireAdmin(supabase);

  // Four reads at once. Admin read policies let each one see everyone's rows.
  const [entriesRes, labelsRes, profilesRes, gamesRes] = await Promise.all([
    supabase.from("entries").select("id, user_id, paid, picks(count)"),
    supabase.from("entry_labels").select("id, label"),
    supabase.from("profiles").select("id, first_name, last_name, email"),
    supabase.from("games").select("id", { count: "exact", head: true }).eq("in_pool", true),
  ]);

  const failure = entriesRes.error ?? labelsRes.error ?? profilesRes.error ?? gamesRes.error;
  if (failure) {
    return (
      <main style={{ maxWidth: 900, margin: "60px auto", padding: 24 }}>
        <h1>Admin</h1>
        <p role="alert" style={{ color: "crimson" }}>
          Could not load data: {failure.message}
        </p>
      </main>
    );
  }

  const totalGames = gamesRes.count ?? 0;
  const labelById = new Map((labelsRes.data ?? []).map((l) => [l.id as string, l.label as string]));
  const holderById = new Map(
    (profilesRes.data ?? []).map((p) => [
      p.id as string,
      {
        name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "(no name)",
        email: (p.email as string) ?? "",
      },
    ])
  );

  const rows = (entriesRes.data ?? [])
    .map((e) => {
      const picks = (e.picks as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
      const holder = holderById.get(e.user_id as string) ?? { name: "(unknown)", email: "" };
      return {
        id: e.id as string,
        paid: e.paid as boolean,
        picks,
        complete: totalGames > 0 && picks === totalGames,
        label: labelById.get(e.id as string) ?? "Entry",
        holderName: holder.name,
        holderEmail: holder.email,
      };
    })
    .sort(
      (a, b) =>
        a.holderName.localeCompare(b.holderName) ||
        a.label.localeCompare(b.label, undefined, { numeric: true })
    );

  // Money rules:
  //  - Collected  = every entry marked paid (people sometimes pay before finishing picks)
  //  - Still owed = finished, unpaid entries only
  //  - Unfinished, unpaid entries are shown separately and not counted as owed
  const paidCount = rows.filter((r) => r.paid).length;
  const owedCount = rows.filter((r) => r.complete && !r.paid).length;
  const unfinishedUnpaid = rows.filter((r) => !r.complete && !r.paid).length;
  const money = (n: number) => (ENTRY_FEE === null ? "" : ` ($${(n * ENTRY_FEE).toLocaleString()})`);

  const visible = unpaidOnly ? rows.filter((r) => !r.paid) : rows;
  const cell = { padding: "8px 10px", borderBottom: "1px solid #ddd", textAlign: "left" as const };

  return (
    <main style={{ maxWidth: 900, margin: "60px auto", padding: 24 }}>
      <p>
        <Link href="/dashboard">← Dashboard</Link>
      </p>
      <h1>Admin</h1>

      <h2>Payments</h2>
      <ul>
        <li>
          Entries: {rows.length} across {holderById.size} accounts
        </li>
        <li>
          Collected: {paidCount} paid{money(paidCount)}
        </li>
        <li>
          Still owed: {owedCount} finished entries{money(owedCount)}
        </li>
        <li>Unfinished and unpaid (not counted as owed): {unfinishedUnpaid}</li>
      </ul>

      <p>
        Show:{" "}
        {unpaidOnly ? <Link href="/admin">All</Link> : <strong>All</strong>} |{" "}
        {unpaidOnly ? <strong>Unpaid</strong> : <Link href="/admin?filter=unpaid">Unpaid</Link>}
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={cell}>Account holder</th>
            <th style={cell}>Entry</th>
            <th style={cell}>Picks</th>
            <th style={cell}>Paid</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => (
            <tr key={r.id}>
              <td style={cell}>
                {r.holderName}
                <br />
                <small style={{ color: "#666" }}>{r.holderEmail}</small>
              </td>
              <td style={cell}>{r.label}</td>
              <td style={cell}>
                {r.picks}/{totalGames}
                {!r.complete && <small style={{ color: "#b45309" }}> unfinished</small>}
              </td>
              <td style={cell}>
                <form action={setPaid}>
                  <input type="hidden" name="entryId" value={r.id} />
                  <input type="hidden" name="paid" value={String(!r.paid)} />
                  <button type="submit">{r.paid ? "Paid ✓ (undo)" : "Mark paid"}</button>
                </form>
              </td>
            </tr>
          ))}
          {visible.length === 0 && (
            <tr>
              <td style={cell} colSpan={4}>
                {unpaidOnly ? "Everyone is paid up." : "No entries yet."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
