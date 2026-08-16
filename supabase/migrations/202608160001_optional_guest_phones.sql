-- Plus-ones in a group may omit a phone number. Ungrouped guests still need one.
-- PostgreSQL unique constraints already allow multiple NULLs.
alter table public.guests
  alter column phone drop not null;

alter table public.guests
  drop constraint if exists guests_ungrouped_require_phone;

alter table public.guests
  add constraint guests_ungrouped_require_phone
  check (group_id is not null or phone is not null);
