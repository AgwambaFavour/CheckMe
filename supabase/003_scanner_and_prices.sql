-- Scanner role + per-tier ticket prices. Run once in Supabase: SQL Editor -> New query -> paste -> Run.

-- 1. A "scanner" can scan tickets and check guests in, but can't create, edit or void tickets.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('owner', 'admin', 'scanner'));

-- 2. Price per person for each ticket type, e.g. {"Regular": 5000, "VIP": 20000, "Table": 50000}.
--    The ticket form multiplies it by the number of slots to fill in the amount.
alter table public.events
  add column if not exists tier_prices jsonb not null default '{}'::jsonb;
