"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function NameForm({ initialFirst, initialLast }: { initialFirst: string; initialLast: string }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("set_my_name", {
      p_first_name: firstName,
      p_last_name: lastName,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/entry");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
      <label>
        First name
        <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ display: "block", width: "100%" }} />
      </label>
      <label>
        Last name
        <input required value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ display: "block", width: "100%" }} />
      </label>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save name"}
      </button>
    </form>
  );
}
