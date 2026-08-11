# weekly

A minimal macro tracker: define your own food items (protein/carb/fat), log them by clicking a
searchbar entry, and see this week's running totals plus an average-daily figure — no per-day
breakdown, only the week view. Weeks start Monday. The current week's daily average divides by
the fraction of the week that has actually elapsed (hours so far / 24); completed weeks divide by
7.

**Works with no account.** Items and logs are kept in the browser's `localStorage` until you sign
in. Signing in (email magic link, no password) switches the app to Supabase-backed storage so your
items and history follow you across devices — the first time you sign in, whatever you'd already
tracked locally is uploaded to your new account automatically (see `lib/store/migrate.ts`).

Stack: Next.js (App Router) + Supabase (email magic-link auth, Postgres with Row Level Security) +
Tailwind/shadcn. No custom backend — the browser talks to Supabase directly when signed in,
protected by RLS; there is no server-side auth gate, since the app is fully usable signed out.

## 1. Local development, no account needed

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you can create items and log them right
away, no Supabase project required. Data lives in `localStorage` until you sign in.

## 2. Create a Supabase project (only needed for sign-in/sync)

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   This creates the `items`/`logs` tables and their Row Level Security policies.
3. Under **Authentication → Sign In / Providers**, confirm Email is enabled (it is by default; no
   password is required — this app uses magic links).
4. Under **Authentication → URL Configuration**, set:
   - **Site URL**: your Render URL once deployed (e.g. `https://weekly.onrender.com`), or
     `http://localhost:3000` for local dev.
   - **Redirect URLs**: add both `http://localhost:3000/auth/callback` and
     `https://<your-render-app>.onrender.com/auth/callback`.
5. Under **Project Settings → API**, copy the **Project URL** and **anon public** key.
6. `cp .env.local.example .env.local` and fill in the two values from step 5, then restart `npm run dev`.

## 3. Deploy to Render

1. Push this repo to GitHub.
2. In Render, choose **New → Blueprint** and point it at the repo (it will pick up
   [`render.yaml`](render.yaml)), or create a Web Service manually with:
   - Build command: `npm ci && npm run build`
   - Start command: `npm start`
3. Set the two environment variables on the service: `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same values as your `.env.local`). The app works even if these
   are left unset — sign-in just won't function until they're set and a Supabase project exists.
4. Once deployed, add `https://<your-app>.onrender.com/auth/callback` to Supabase's redirect URLs
   and update the Site URL (step 2.4) if you haven't already.

The anon key is safe to expose to the browser — Row Level Security on `items`/`logs` is what
actually restricts each signed-in user to their own rows.

## Notes

- Data model is an event log (`logs`, one row per click) rather than counters, so weekly totals
  are just a filter/sum over the full log list and any past week can be recomputed on demand.
- Local mode (`lib/store/local.ts`) and Supabase mode (`lib/store/remote.ts`) implement the same
  `DataStore` interface (`lib/store/types.ts`), so the UI components don't know or care which one
  is active — `lib/store/AuthProvider.tsx` picks based on sign-in state.
- Editing/deleting items, undoing a log entry, and per-day breakdowns are intentionally not
  built — the app only ever shows week-level numbers.
