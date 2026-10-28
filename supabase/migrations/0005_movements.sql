-- Run this in the Supabase SQL editor (or `supabase db push` if the CLI is linked).

-- Movement tracking, alongside macros. A movement is either a move, counted
-- in reps (`kind = 'reps'`), or a position, held for a time (`kind = 'time'`,
-- amounts in seconds). Its optional weekly goal works like the macro goals:
-- `goal_value` applies to `goal_anchor_week`, then `goal_step` is applied once
-- per week after that, as a flat amount or a percentage.
create table if not exists movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('reps', 'time')),
  default_amount numeric not null check (default_amount > 0),
  goal_value numeric check (goal_value >= 0),
  goal_anchor_week timestamptz,
  goal_step numeric not null default 0,
  goal_step_mode text not null default 'flat' check (goal_step_mode in ('flat', 'percent')),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists movement_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  movement_id uuid not null references movements(id) on delete cascade,
  amount numeric not null check (amount > 0),
  logged_at timestamptz not null default now()
);

create index if not exists movement_logs_user_logged_at_idx on movement_logs (user_id, logged_at);
create index if not exists movement_logs_movement_id_idx on movement_logs (movement_id);

alter table movements enable row level security;
alter table movement_logs enable row level security;

drop policy if exists "own movements" on movements;
create policy "own movements" on movements for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own movement logs" on movement_logs;
create policy "own movement logs" on movement_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
