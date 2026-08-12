-- Group names are organizer-facing identifiers and must be unique regardless
-- of capitalization or surrounding whitespace.
create unique index if not exists guest_groups_normalized_name_idx
  on public.guest_groups (lower(btrim(name)));
