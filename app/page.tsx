import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 480, margin: "80px auto", padding: 24, textAlign: "center" }}>
      <h1>Welcome to the BCP</h1>
      <p>The 20th Annual Bowl Confidence Pool. Invite-only.</p>
      <p>
        <Link href="/signup">Have an invite code? Sign up</Link>
        {" · "}
        <Link href="/login">Already in? Log in</Link>
      </p>
    </main>
  );
}
