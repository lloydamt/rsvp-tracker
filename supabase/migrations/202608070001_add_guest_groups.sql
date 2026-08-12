create table if not exists public.guest_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  created_at timestamptz not null default now()
);

alter table public.guest_groups enable row level security;
revoke all on table public.guest_groups from anon, authenticated;

alter table public.guests
  add column if not exists group_id uuid references public.guest_groups(id) on delete set null;

create index if not exists guests_group_id_idx on public.guests(group_id);
