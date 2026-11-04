-- Run this in the Supabase SQL editor (or `supabase db push` if the CLI is linked).

-- Additional raw macros: macros added to a week directly, without an item, for
-- exceptions and rare foods. Like `logs`, one row per entry, and `consumed_at`
-- decides which week it counts toward.
create table if not exists raw_macros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  protein numeric not null check (protein >= 0),
  carbs numeric not null check (carbs >= 0),
  fat numeric not null check (fat >= 0),
  calories numeric not null check (calories >= 0),
  consumed_at timestamptz not null default now()
);

create index if not exists raw_macros_user_consumed_at_idx on raw_macros (user_id, consumed_at);

alter table raw_macros enable row level security;

drop policy if exists "own raw macros" on raw_macros;
create policy "own raw macros" on raw_macros for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
