-- Run this in the Supabase SQL editor (or `supabase db push` if the CLI is linked).

-- Lift tracking, next to movements. Unlike a move, a lift is logged in sets,
-- each with its own weight (kg, 0 for bodyweight) and reps.
--
-- A lift's optional weekly goal is a list of lines, each "this many sets of at
-- least this weight for at least this many reps", stored as a JSON array:
--   [{"sets": 3, "weight": 105, "reps": 4}, {"sets": 4, "weight": 80, "reps": 5}]
-- An empty array means no goal. Which sets count toward which line is worked
-- out in the app (lib/lifts.ts), not stored.
create table if not exists lifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  goal jsonb not null default '[]'::jsonb check (jsonb_typeof(goal) = 'array'),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists lift_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lift_id uuid not null references lifts(id) on delete cascade,
  weight numeric not null check (weight >= 0),
  reps integer not null check (reps > 0),
  logged_at timestamptz not null default now()
);

create index if not exists lift_sets_user_logged_at_idx on lift_sets (user_id, logged_at);
create index if not exists lift_sets_lift_id_idx on lift_sets (lift_id);

alter table lifts enable row level security;
alter table lift_sets enable row level security;

drop policy if exists "own lifts" on lifts;
create policy "own lifts" on lifts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own lift sets" on lift_sets;
create policy "own lift sets" on lift_sets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
