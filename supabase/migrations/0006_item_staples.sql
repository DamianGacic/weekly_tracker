-- Run this in the Supabase SQL editor (or `supabase db push` if the CLI is linked).

-- Staples: items eaten often enough to always offer on This week, until
-- they're logged that week. Existing items start out as not staples.
alter table items add column if not exists staple boolean not null default false;
