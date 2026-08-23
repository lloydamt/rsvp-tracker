alter table public.guests drop constraint if exists guests_token_format_check;
alter table public.guests drop constraint if exists guests_token_check;

do $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  guest_row record;
  code text;
  i integer;
begin
  for guest_row in
    select id from public.guests
    where token !~ '^[A-HJ-KM-NP-Z2-9]{6}$'
  loop
    loop
      code := '';
      for i in 1..6 loop
        code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      end loop;
      exit when not exists (select 1 from public.guests where token = code);
    end loop;
    update public.guests set token = code where id = guest_row.id;
  end loop;
end $$;

alter table public.guests
  add constraint guests_token_format_check
  check (token ~ '^[A-HJ-KM-NP-Z2-9]{6}$');
