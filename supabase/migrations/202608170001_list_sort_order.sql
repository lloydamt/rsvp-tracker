alter table public.guest_groups
  add column if not exists sort_order integer not null default 0;

alter table public.guests
  add column if not exists sort_order integer not null default 0;

with ranked_groups as (
  select id, row_number() over (order by created_at desc, name asc) - 1 as rn
  from public.guest_groups
)
update public.guest_groups as groups
set sort_order = ranked_groups.rn
from ranked_groups
where groups.id = ranked_groups.id;

with ranked_guests as (
  select id, row_number() over (order by created_at desc, name asc) - 1 as rn
  from public.guests
)
update public.guests as guests
set sort_order = ranked_guests.rn
from ranked_guests
where guests.id = ranked_guests.id;
