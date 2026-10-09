-- V5: partner idle slots and group benefits. All redemption checks run in the database.
alter table offers add column min_group int check (min_group between 2 and 30);
grant select (min_group) on offers to anon, authenticated;
alter table offer_redemptions add column activity_id uuid references activities on delete set null;

create table place_idle_slots (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  seats int check (seats between 1 and 100),
  note text check (char_length(note) <= 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
alter table place_idle_slots enable row level security;
create policy idle_read on place_idle_slots for select using (active or owns_place(place_id) or is_admin());
create policy idle_write on place_idle_slots for all to authenticated
  using (owns_place(place_id) or is_admin()) with check (owns_place(place_id) or is_admin());

create function group_early_minutes() returns int language sql immutable as $$ select 30 $$;
-- This replaces the existing one-argument function with an optional activity argument.
drop function redeem_offer(uuid);
create function redeem_offer(p_offer_id uuid, p_activity_id uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  day date := local_today();
  o offers;
  a activities;
  at timestamptz;
begin
  if uid is null or not is_verified() then raise exception 'verification pending' using errcode = '42501'; end if;
  select * into o from offers where id = p_offer_id for update;
  if not found or not o.active or o.valid_from > day or o.valid_to < day then raise exception 'offer not available'; end if;
  if o.min_group is not null then
    select * into a from activities where id = p_activity_id for update;
    if a.id is null or a.status not in ('open','full') or a.offer_id is distinct from o.id or a.place_id is distinct from o.place_id
       or not (a.creator_id = uid or exists (select 1 from activity_members where activity_id = a.id and user_id = uid and status = 'approved'))
    then raise exception 'group membership required' using errcode = '42501'; end if;
    if approved_count(a.id) + 1 < o.min_group then raise exception 'group too small'; end if;
    if now() < a.starts_at - make_interval(mins => group_early_minutes()) or now() > a.ends_at then raise exception 'outside group window'; end if;
  elsif p_activity_id is not null then
    raise exception 'not a group offer';
  end if;
  select created_at into at from offer_redemptions where offer_id = o.id and user_id = uid and redeemed_on = day;
  if found then
    if at > now() - offer_window() then return jsonb_build_object('code', o.code, 'expires_at', at + offer_window()); end if;
    raise exception 'already redeemed today';
  end if;
  if o.capacity is not null and (select count(*) from offer_redemptions where offer_id = o.id) >= o.capacity then raise exception 'offer sold out'; end if;
  insert into offer_redemptions (offer_id, user_id, redeemed_on, activity_id) values (o.id, uid, day, p_activity_id) returning created_at into at;
  return jsonb_build_object('code', o.code, 'expires_at', at + offer_window());
end;
$$;
revoke execute on function redeem_offer(uuid,uuid) from public, anon;
grant execute on function redeem_offer(uuid,uuid) to authenticated;

-- Reject unrelated benefits even when a client bypasses the form.
create function check_activity_offer() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.offer_id is not null and not exists (select 1 from offers where id = new.offer_id and place_id = new.place_id and active) then
    raise exception 'offer does not belong to place';
  end if;
  return new;
end;
$$;
create trigger activity_offer before insert or update of place_id, offer_id on activities for each row execute function check_activity_offer();
create trigger series_offer before insert or update of place_id, offer_id on activity_series for each row execute function check_activity_offer();

create function partner_sessions(p_place_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not (owns_place(p_place_id) or is_admin()) then raise exception 'not your place' using errcode = '42501'; end if;
  return jsonb_build_object(
    'upcoming', coalesce((select jsonb_agg(row_to_json(t)) from (
      select a.id, a.title, a.starts_at, a.capacity, approved_count(a.id) + 1 as people, o.title as benefit
      from activities a left join offers o on o.id = a.offer_id
      where a.place_id = p_place_id and a.ends_at > now() and a.status in ('open','full') order by a.starts_at limit 30
    ) t), '[]'::jsonb),
    'sessions', (select count(*) from activities where place_id = p_place_id and starts_at between now() - interval '30 days' and now() and status <> 'cancelled'),
    'people', (select coalesce(sum(approved_count(id)),0) from activities where place_id = p_place_id and starts_at between now() - interval '30 days' and now() and status <> 'cancelled'),
    'redemptions', (select count(*) from offer_redemptions r join activities a on a.id = r.activity_id where a.place_id = p_place_id and r.created_at >= now() - interval '30 days')
  );
end;
$$;
revoke execute on function partner_sessions(uuid) from public, anon;
grant execute on function partner_sessions(uuid) to authenticated;
