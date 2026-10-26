-- Run this in the Supabase SQL editor (or `supabase db push` if the CLI is linked).

-- One row per user. A goal whose `*_value` is null isn't set. Each goal's
-- value applies to its `*_anchor_week` (that week's Monday 00:00); every
-- week after that, `*_step` is applied once — as a flat amount, or as a
-- percentage of the previous week's value — so the stored value only
-- changes when the user edits the goal.
create table if not exists goals (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  protein_value numeric check (protein_value >= 0),
  protein_anchor_week timestamptz,
  protein_step numeric not null default 0,
  protein_step_mode text not null default 'flat' check (protein_step_mode in ('flat', 'percent')),
  calories_value numeric check (calories_value >= 0),
  calories_anchor_week timestamptz,
  calories_step numeric not null default 0,
  calories_step_mode text not null default 'flat' check (calories_step_mode in ('flat', 'percent')),
  updated_at timestamptz not null default now()
);

alter table goals enable row level security;

drop policy if exists "own goals" on goals;
create policy "own goals" on goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
