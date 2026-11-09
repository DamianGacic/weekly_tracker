-- Run this in the Supabase SQL editor (or `supabase db push` if the CLI is linked).

-- Habits, ticked off per day. `goal_days` is how many days a week the habit
-- should be done (null: no goal). `includes` lists the habits that checking
-- this one also checks on the same day; the app keeps it free of circles.
create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  goal_days smallint check (goal_days between 1 and 7),
  includes uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- One row per habit per day it was done; a day without a row wasn't done.
-- `day` is the local calendar date, so a check stays on its day regardless of
-- time zone. `auto` marks a check made because a habit including this one was
-- checked, rather than by checking this one itself.
create table if not exists habit_checks (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  day date not null,
  auto boolean not null default false,
  primary key (habit_id, day)
);

create index if not exists habit_checks_user_day_idx on habit_checks (user_id, day);

alter table habits enable row level security;
alter table habit_checks enable row level security;

drop policy if exists "own habits" on habits;
create policy "own habits" on habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own habit checks" on habit_checks;
create policy "own habit checks" on habit_checks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
