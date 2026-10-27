-- Run this in the Supabase SQL editor (or `supabase db push` if the CLI is linked).

-- How many portions of the item a log stands for: 1 for a normal tap, or
-- e.g. 0.5 when only part of a portion was eaten. Existing logs become 1.
alter table logs add column if not exists amount numeric not null default 1 check (amount > 0);
