alter table public.guests
  add column if not exists sms_via_guest_id uuid;

alter table public.guests
  drop constraint if exists guests_sms_via_guest_id_fkey;

alter table public.guests
  add constraint guests_sms_via_guest_id_fkey
  foreign key (sms_via_guest_id) references public.guests(id) on delete restrict;

alter table public.guests
  drop constraint if exists guests_sms_via_not_self;

alter table public.guests
  add constraint guests_sms_via_not_self
  check (sms_via_guest_id is distinct from id);
