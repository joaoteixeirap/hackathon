-- Hackathon mode: no login screen. Visitors get an anonymous Supabase session on their
-- first action (RLS still applies per user), and manual verification is switched off.
-- Flip require_verification() back to true to restore the F4/F7 verification gate.

create or replace function require_verification() returns boolean
language sql immutable as $$ select false $$;

create or replace function is_verified() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    not require_verification()
    or exists (select 1 from profiles where id = auth.uid() and verified)
  );
$$;

-- Guests have no e-mail: give them a friendly placeholder name they can edit.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Viajante ' || upper(substr(replace(new.id::text, '-', ''), 1, 4))
    ), 60)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
