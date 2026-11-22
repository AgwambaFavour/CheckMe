-- CheckMe ticketing schema
-- Run this whole file once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Security model: RLS is ON for every table with NO policies, so the public
-- (anon / authenticated) API keys cannot read or write anything directly.
-- All access goes through the Next.js server, which verifies the logged-in
-- user and their role, then uses the secret (service role) key.

create extension if not exists pgcrypto;

-- ───────────────────────── Tables ─────────────────────────

create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  org_id      uuid not null references public.organizations(id) on delete cascade,
  full_name   text not null,
  email       text not null,
  role        text not null check (role in ('owner', 'admin')),
  created_at  timestamptz not null default now()
);
create index profiles_org_idx on public.profiles(org_id);

create table public.events (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizations(id) on delete cascade,
  name               text not null,
  starts_at          timestamptz,
  venue              text,
  capacity           integer check (capacity is null or capacity > 0),
  whatsapp_template  text not null default
    'Hi {name}, here is your {tier} ticket for {event} ({slots}). Show this QR code at the entrance: {link}',
  created_at         timestamptz not null default now()
);
create index events_org_idx on public.events(org_id);

create table public.tickets (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations(id) on delete cascade,
  event_id         uuid not null references public.events(id) on delete cascade,
  code             text not null unique,
  buyer_name       text not null,
  buyer_phone      text not null,
  tier             text not null,
  slots            integer not null check (slots > 0),
  amount_paid      bigint not null default 0 check (amount_paid >= 0), -- whole naira
  guest_names      text[] not null default '{}',
  status           text not null default 'active' check (status in ('active', 'void')),
  created_by       uuid references public.profiles(id) on delete set null,
  created_by_name  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index tickets_event_idx on public.tickets(event_id);

create table public.checkins (
  id               uuid primary key default gen_random_uuid(),
  ticket_id        uuid not null references public.tickets(id) on delete cascade,
  event_id         uuid not null references public.events(id) on delete cascade,
  count            integer not null check (count > 0),
  names            text[] not null default '{}',
  admitted_by      uuid references public.profiles(id) on delete set null,
  admitted_by_name text,
  created_at       timestamptz not null default now(),
  undone_at        timestamptz,
  undone_by_name   text
);
create index checkins_ticket_idx on public.checkins(ticket_id);
create index checkins_event_idx on public.checkins(event_id);

alter table public.organizations enable row level security;
alter table public.profiles      enable row level security;
alter table public.events        enable row level security;
alter table public.tickets       enable row level security;
alter table public.checkins      enable row level security;

-- ───────────────────────── Views ─────────────────────────

-- Ticket + how many have been admitted. security_invoker keeps RLS in force.
create view public.ticket_summary with (security_invoker = true) as
select
  t.*,
  coalesce(c.admitted, 0)::int                 as admitted,
  (t.slots - coalesce(c.admitted, 0))::int     as remaining
from public.tickets t
left join (
  select ticket_id, sum(count) as admitted
  from public.checkins
  where undone_at is null
  group by ticket_id
) c on c.ticket_id = t.id;

-- ───────────────────────── Functions ─────────────────────────

-- Atomically admit people on a ticket. Locks the ticket row so two
-- scanners can never over-admit the same ticket.
create or replace function public.admit_guests(
  p_ticket_id  uuid,
  p_count      integer,
  p_names      text[],
  p_admin_id   uuid,
  p_admin_name text
) returns json
language plpgsql
set search_path = public
as $$
declare
  t    public.tickets;
  used integer;
begin
  select * into t from public.tickets where id = p_ticket_id for update;
  if not found then
    raise exception 'TICKET_NOT_FOUND';
  end if;
  if t.status <> 'active' then
    raise exception 'TICKET_VOID';
  end if;
  if p_count is null or p_count < 1 then
    raise exception 'INVALID_COUNT';
  end if;

  select coalesce(sum(count), 0) into used
  from public.checkins
  where ticket_id = t.id and undone_at is null;

  if used + p_count > t.slots then
    raise exception 'NOT_ENOUGH_SLOTS:%', t.slots - used;
  end if;

  insert into public.checkins (ticket_id, event_id, count, names, admitted_by, admitted_by_name)
  values (t.id, t.event_id, p_count, coalesce(p_names, '{}'), p_admin_id, p_admin_name);

  return json_build_object(
    'admitted',  used + p_count,
    'remaining', t.slots - used - p_count
  );
end;
$$;

-- Dashboard numbers for one event.
create or replace function public.event_stats(p_event_id uuid)
returns json
language sql
stable
set search_path = public
as $$
  select json_build_object(
    'tickets',   (select count(*) from tickets where event_id = p_event_id and status = 'active'),
    'slots',     (select coalesce(sum(slots), 0) from tickets where event_id = p_event_id and status = 'active'),
    'revenue',   (select coalesce(sum(amount_paid), 0) from tickets where event_id = p_event_id and status = 'active'),
    'admitted',  (select coalesce(sum(c.count), 0)
                    from checkins c join tickets t on t.id = c.ticket_id
                   where c.event_id = p_event_id and c.undone_at is null and t.status = 'active'),
    'voided',    (select count(*) from tickets where event_id = p_event_id and status = 'void'),
    'by_tier',   (select coalesce(json_agg(x order by x.tier), '[]'::json) from (
                    select t.tier,
                           count(*)::int as tickets,
                           sum(t.slots)::int as slots,
                           coalesce(sum(s.admitted), 0)::int as admitted
                      from tickets t
                      left join (select ticket_id, sum(count) as admitted from checkins
                                  where undone_at is null group by ticket_id) s on s.ticket_id = t.id
                     where t.event_id = p_event_id and t.status = 'active'
                     group by t.tier) x)
  );
$$;

-- Only the server (service role) may call these.
revoke all on function public.admit_guests(uuid, integer, text[], uuid, text) from public, anon, authenticated;
revoke all on function public.event_stats(uuid) from public, anon, authenticated;
grant execute on function public.admit_guests(uuid, integer, text[], uuid, text) to service_role;
grant execute on function public.event_stats(uuid) to service_role;
