alter table public.guests
  add column if not exists invitation_category text not null default 'ceremony_reception';

alter table public.guests
  drop constraint if exists guests_invitation_category_check;

alter table public.guests
  add constraint guests_invitation_category_check
  check (invitation_category in ('ceremony_reception', 'reception_only'));

create index if not exists guests_invitation_category_idx
  on public.guests(invitation_category);
