create extension if not exists pgcrypto;

create table if not exists public.guest_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  created_at timestamptz not null default now(),
  sort_order integer not null default 0
);

create unique index if not exists guest_groups_normalized_name_idx
  on public.guest_groups (lower(btrim(name)));

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  phone text unique,
  token text not null unique check (token ~ '^[A-HJ-KM-NP-Z2-9]{4}$'),
  group_id uuid references public.guest_groups(id) on delete set null,
  invitation_category text not null default 'ceremony_reception' check (invitation_category in ('ceremony_reception', 'reception_only')),
  status text not null default 'pending' check (status in ('pending', 'attending', 'declined')),
  party_size integer not null default 1 check (party_size between 0 and 20),
  notes text check (char_length(notes) <= 500),
  message_sent_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  sort_order integer not null default 0,
  constraint guests_ungrouped_require_phone check (group_id is not null or phone is not null)
);

alter table public.guests enable row level security;
alter table public.guest_groups enable row level security;

-- Intentionally create no anon/authenticated policies. The browser cannot read this
-- table; only server-side code using the service-role key can access it.
revoke all on table public.guests from anon, authenticated;
revoke all on table public.guest_groups from anon, authenticated;
