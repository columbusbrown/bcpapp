import RecapSignupForm from "./RecapSignupForm";

// A public page: there is no login check here, so anyone with the link can
// open it. Compare with /entry, which calls supabase.auth.getUser() and
// redirects to /login when nobody is signed in.
export default function RecapSignupPage() {
  return (
    <main style={{ maxWidth: 520, margin: "60px auto", padding: 24 }}>
      <h1>Get the daily bowl recap</h1>
      <p>
        Not entering the pool this year, but want to follow along? Sign up and
        you'll get an email each morning of bowl season with the previous
        day's results and updated standings.
      </p>
      <p style={{ fontSize: 14, color: "#555" }}>
        Pool entrants already receive the recap and don't need to sign up here.
      </p>
      <RecapSignupForm />
    </main>
  );
}
