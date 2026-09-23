"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

// Postgres error code for "that value already exists" (our unique email rule).
const DUPLICATE_EMAIL = "23505";

export default function RecapSignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  async function subscribe() {
    // Lowercase and trim so "Sam@Gmail.com " and "sam@gmail.com" count as one address.
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setMessage({ text: "Enter a valid email address.", isError: true });
      return;
    }

    setSaving(true);
    setMessage(null);

    // Created here, inside the handler, for the same reason as the login page:
    // it keeps Next.js from trying to build a Supabase client at build time.
    const supabase = createClient();

    // No .select() after the insert: the database lets visitors ADD an email
    // but never READ the list, so asking for the new row back would fail.
    const { error } = await supabase
      .from("recap_subscribers")
      .insert({ email: cleanEmail, name: cleanName || null });

    setSaving(false);

    if (error && error.code === DUPLICATE_EMAIL) {
      setMessage({ text: "That email is already on the recap list.", isError: false });
    } else if (error) {
      setMessage({ text: `Sign-up didn't go through: ${error.message}`, isError: true });
    } else {
      setMessage({ text: "You're on the list. Recaps start the morning after the first bowl game.", isError: false });
      setName("");
      setEmail("");
    }
  }

  const inputStyle = { display: "block", width: "100%", padding: 8, fontSize: 16, marginTop: 4 };

  return (
    <div style={{ marginTop: 24 }}>
      <label style={{ display: "block", marginBottom: 16 }}>
        Name (optional)
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          style={inputStyle}
        />
      </label>

      <label style={{ display: "block", marginBottom: 16 }}>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") subscribe();
          }}
          autoComplete="email"
          required
          style={inputStyle}
        />
      </label>

      <button
        type="button"
        onClick={subscribe}
        disabled={saving}
        style={{ padding: "10px 20px", fontSize: 16 }}
      >
        {saving ? "Signing up…" : "Sign up for the recap"}
      </button>

      {message && (
        <p role="alert" style={{ marginTop: 12, color: message.isError ? "crimson" : "#1e6b34" }}>
          {message.text}
        </p>
      )}

      <p style={{ marginTop: 24, fontSize: 14, color: "#555" }}>
        Every recap includes a link to unsubscribe.
      </p>
    </div>
  );
}
