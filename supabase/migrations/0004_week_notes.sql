-- Run this in the Supabase SQL editor (or `supabase db push` if the CLI is linked).

-- A free-text note per user per week. `week_start` is that week's Monday as a
-- calendar date, so a note stays on its week regardless of time zone. Weeks
-- without a note have no row.
create table if not exists week_notes (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_start date not null,
  note text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table week_notes enable row level security;

drop policy if exists "own week notes" on week_notes;
create policy "own week notes" on week_notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
