-- Ticket upgrades (more people and/or a better ticket type). Run once in Supabase:
-- SQL Editor -> New query -> paste -> Run.

-- One row per upgrade, so you can see who took the extra money and when.
create table if not exists public.ticket_upgrades (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references public.tickets(id) on delete cascade,
  org_id        uuid not null references public.organizations(id) on delete cascade,
  added_slots   integer not null check (added_slots >= 0),
  from_tier     text not null,
  to_tier       text not null,
  extra_amount  bigint not null default 0 check (extra_amount >= 0), -- whole naira
  by_id         uuid references public.profiles(id) on delete set null,
  by_name       text,
  created_at    timestamptz not null default now()
);
create index if not exists ticket_upgrades_ticket_idx on public.ticket_upgrades(ticket_id);

alter table public.ticket_upgrades enable row level security;
