# BCP - Milestone 1

This is the foundation piece of the build: project scaffold, database schema,
and invite-code-gated signup/login. Nothing about picks or scoring yet — that's
milestone 2+.

## What's here

- `app/` - Next.js App Router pages: landing page, signup, login, a
  placeholder dashboard.
- `app/api/signup/route.ts` - server-side signup that checks the invite code
  is valid *before* creating an account.
- `lib/supabase-browser.ts` / `lib/supabase-server.ts` - the two ways the app
  talks to Supabase (from the browser vs. from the server).
- `supabase/schema.sql` - the whole database: profiles, invite codes, games,
  entries, picks. Comments explain each table's job.

## One-time setup

1. **Create a Supabase project.** Go to supabase.com, create a free project.
   Name it something like `bcp-2025`.
2. **Run the schema.** In the Supabase dashboard: SQL Editor -> New query ->
   paste the entire contents of `supabase/schema.sql` -> Run.
3. **Create your first invite code.** Still in the SQL editor, run:
   ```sql
   insert into invite_codes (code, label, max_uses)
   values ('BCP2025', 'first year invite', null);
   ```
   (`max_uses: null` = unlimited uses for that code. Set a number if you want
   to cap it.)
4. **Get your API keys.** Project Settings -> API. You need the Project URL,
   the `anon` `public` key, and the `service_role` `secret` key.
5. **Set up your local environment.**
   ```bash
   cp .env.example .env.local
   ```
   Paste in the three values from step 4.
6. **Install and run.**
   ```bash
   npm install
   npm run dev
   ```
   Visit http://localhost:3000, click "Sign up", and try your invite code.

## Deploying (when you're ready, not required yet)

Push this to a GitHub repo, then import it on vercel.com. Add the same three
environment variables from `.env.local` in Vercel's project settings. That's
the whole deploy - Vercel builds and hosts it for free at this scale.

## What's next (milestone 2)

The pick-submission form: one row per bowl game, a confidence number 1-40 per
pick, live validation that no number gets reused twice in the same entry
(this is the #1 thing people get wrong on the paper/Excel version), and a
hard lock the moment the first game's kickoff time passes.
