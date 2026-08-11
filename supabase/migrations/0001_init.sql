-- Run this in the Supabase SQL editor (or `supabase db push` if the CLI is linked).

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  protein numeric not null check (protein >= 0),
  carbs numeric not null check (carbs >= 0),
  fat numeric not null check (fat >= 0),
  calories numeric not null check (calories >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  consumed_at timestamptz not null default now()
);

create index if not exists logs_user_consumed_at_idx on logs (user_id, consumed_at);
create index if not exists logs_item_id_idx on logs (item_id);

alter table items enable row level security;
alter table logs enable row level security;

drop policy if exists "own items" on items;
create policy "own items" on items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own logs" on logs;
create policy "own logs" on logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
