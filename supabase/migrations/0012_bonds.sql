-- SPEC_V2 V4 — bonds during the stay: weekly series (S3), compatibility counts (S4),
-- official welcome series (S5), compatible people (S2) and blocks.

-- ---------------------------------------------------------------------------
-- Blocks (private to the blocker)
-- ---------------------------------------------------------------------------

create table user_blocks (
  blocker_id uuid references profiles on delete cascade,
  blocked_id uuid references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table user_blocks enable row level security;
create policy blocks_own on user_blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create function is_blocked_between(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_blocks where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a));
$$;

-- "Verified" honoring the hackathon switch (require_verification() = false → everyone counts).
create function counts_as_verified(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select not require_verification() or exists (select 1 from profiles where id = p_user and verified);
$$;

-- ---------------------------------------------------------------------------
-- Weekly series (S3)
-- ---------------------------------------------------------------------------

create table activity_series (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references cities,
  creator_id uuid not null references profiles on delete cascade,
  place_id uuid references places on delete set null,
  offer_id uuid references offers on delete set null,
  title text not null check (char_length(title) between 3 and 80),
  description text check (char_length(description) <= 1000),
  category text not null check (category in ('meetup','work_together','food','outdoor','culture','tour')),
  weekday smallint not null check (weekday between 0 and 6),   -- 0 = Sunday, in the city's time zone
  start_time time not null,
  duration_min int not null check (duration_min between 30 and 480),
  meeting_lat double precision not null,
  meeting_lng double precision not null,
  meeting_label text check (char_length(meeting_label) <= 120),
  capacity int not null check (capacity between 2 and 12),
  is_official boolean not null default false,
  active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index on activity_series (city_id, active);
alter table activity_series enable row level security;
-- Public like activities (map and WhatsApp previews of /serie/[id]).
create policy series_read on activity_series for select using (active or creator_id = auth.uid() or is_admin());
create policy series_insert on activity_series for insert to authenticated with check (creator_id = auth.uid() and is_verified());
create policy series_update on activity_series for update to authenticated
  using (creator_id = auth.uid() or is_admin()) with check (creator_id = auth.uid() or is_admin());

create function protect_series_columns() returns trigger
language plpgsql as $$
begin
  if is_end_user_call() and not is_admin() then
    if tg_op = 'INSERT' then
      new.is_official := false;
      new.is_demo := false;
    elsif new.is_official is distinct from old.is_official or new.is_demo is distinct from old.is_demo
       or new.creator_id is distinct from old.creator_id or new.city_id is distinct from old.city_id then
      raise exception 'protected series column' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger series_protect before insert or update on activity_series
  for each row execute function protect_series_columns();

alter table activities add column series_id uuid references activity_series on delete set null;
create index on activities (series_id, starts_at);
create unique index activities_one_per_series_slot on activities (series_id, starts_at) where series_id is not null;

create table series_members (
  series_id uuid references activity_series on delete cascade,
  user_id uuid references profiles on delete cascade,
  status text not null default 'requested' check (status in ('requested','approved','declined','left')),
  created_at timestamptz not null default now(),
  primary key (series_id, user_id)
);
alter table series_members enable row level security;
create policy series_members_read on series_members for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from activity_series s where s.id = series_id and s.creator_id = auth.uid())
    or (status = 'approved' and exists (select 1 from series_members m where m.series_id = series_members.series_id and m.user_id = auth.uid() and m.status = 'approved'))
    or is_admin()
  );
-- Writes only through follow_series / decide_series_member / leave_series.

create function series_weeks_ahead() returns int language sql immutable as $$ select 6 $$;

-- Creates the missing occurrences for the next SERIES_WEEKS_AHEAD weeks (in the city's time
-- zone, so DST and day changes are Postgres's job) and puts approved followers in them.
create function ensure_series_occurrences(p_series_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  s activity_series;
  tz text;
  today date;
  d date;
  starts timestamptz;
  created int := 0;
  occ record;
  m record;
begin
  select * into s from activity_series where id = p_series_id and active;
  if not found then return 0; end if;
  select timezone into tz from cities where id = s.city_id;
  today := (now() at time zone tz)::date;
  -- first date on the series' weekday, today included
  d := today + ((s.weekday - extract(dow from today)::int + 7) % 7);
  for i in 0 .. series_weeks_ahead() - 1 loop
    starts := ((d + i * 7) + s.start_time) at time zone tz;
    if starts > now() then
      insert into activities (city_id, creator_id, place_id, offer_id, title, description, category, starts_at, ends_at,
                              meeting_lat, meeting_lng, meeting_label, capacity, series_id, is_demo)
      values (s.city_id, s.creator_id, s.place_id, s.offer_id, s.title, s.description, s.category, starts,
              starts + make_interval(mins => s.duration_min), s.meeting_lat, s.meeting_lng, s.meeting_label,
              s.capacity, s.id, s.is_demo)
      on conflict (series_id, starts_at) where series_id is not null do nothing;
      if found then created := created + 1; end if;
    end if;
  end loop;

  -- Approved followers join every future occurrence with room left.
  for occ in select id, capacity from activities where series_id = s.id and starts_at > now() and status in ('open','full') loop
    for m in select user_id from series_members where series_id = s.id and status = 'approved' order by created_at loop
      if approved_count(occ.id) + 1 >= occ.capacity then exit; end if;
      insert into activity_members (activity_id, user_id, status) values (occ.id, m.user_id, 'approved')
      on conflict (activity_id, user_id) do nothing;
    end loop;
  end loop;
  return created;
end;
$$;

create function ensure_all_series() returns int
language sql security definer set search_path = public as $$
  select coalesce(sum(ensure_series_occurrences(id)), 0)::int from activity_series where active;
$$;

create function follow_series(p_series_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  s activity_series;
  v_status text;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if not is_verified() then raise exception 'verification pending' using errcode = '42501'; end if;
  select * into s from activity_series where id = p_series_id and active;
  if not found then raise exception 'series not found' using errcode = 'P0002'; end if;
  if s.creator_id = v_uid then raise exception 'creator cannot follow own series'; end if;
  if is_blocked_between(v_uid, s.creator_id) then raise exception 'not available' using errcode = '42501'; end if;
  select status into v_status from series_members where series_id = p_series_id and user_id = v_uid;
  if v_status in ('requested','approved') then return v_status; end if;
  if v_status = 'declined' then raise exception 'request was declined'; end if;
  insert into series_members (series_id, user_id, status) values (p_series_id, v_uid, 'requested')
  on conflict (series_id, user_id) do update set status = 'requested', created_at = now();
  return 'requested';
end;
$$;

-- The creator decides once; approved followers enter all future occurrences (until full).
create function decide_series_member(p_series_id uuid, p_user_id uuid, p_decision text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if p_decision not in ('approved','declined') then raise exception 'invalid decision'; end if;
  if not exists (select 1 from activity_series where id = p_series_id and creator_id = auth.uid()) then
    raise exception 'only the creator can decide' using errcode = '42501';
  end if;
  update series_members set status = p_decision where series_id = p_series_id and user_id = p_user_id and status = 'requested';
  if not found then raise exception 'no pending request' using errcode = 'P0002'; end if;
  if p_decision = 'approved' then perform ensure_series_occurrences(p_series_id); end if;
  return p_decision;
end;
$$;

create function leave_series(p_series_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update series_members set status = 'left' where series_id = p_series_id and user_id = auth.uid() and status in ('requested','approved');
  update activity_members am set status = 'left'
  from activities a
  where am.activity_id = a.id and a.series_id = p_series_id and a.starts_at > now()
    and am.user_id = auth.uid() and am.status in ('requested','approved');
end;
$$;

-- People around a series: the creator sees requests; approved members see the approved names.
create function series_people(p_series_id uuid)
returns table (user_id uuid, display_name text, status text)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.display_name, m.status
  from series_members m join profiles p on p.id = m.user_id
  join activity_series s on s.id = m.series_id
  where m.series_id = p_series_id
    and (
      (s.creator_id = auth.uid() and m.status in ('requested','approved'))
      or (m.status = 'approved' and exists (select 1 from series_members x where x.series_id = p_series_id and x.user_id = auth.uid() and x.status = 'approved'))
      or is_admin()
    )
  order by m.status, m.created_at;
$$;

-- ---------------------------------------------------------------------------
-- S4: compatibility counts on an activity (counts only, never who)
-- ---------------------------------------------------------------------------

create function activity_compat(p_activity_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  me profiles;
  my_stay stays;
  a activities;
  same_rhythm int := 0;
  overlap int := 0;
begin
  if v_uid is null then return null; end if;
  select * into me from profiles where id = v_uid;
  select * into my_stay from stays where user_id = v_uid and active;
  select * into a from activities where id = p_activity_id;
  if a.id is null or my_stay.id is null then return null; end if;

  with people as (
    select a.creator_id as uid union
    select user_id from activity_members where activity_id = p_activity_id and status = 'approved'
  )
  select
    count(*) filter (where me.work_rhythm <> 'flexible' and p.work_rhythm = me.work_rhythm),
    count(*) filter (where s.id is not null and s.city_id = my_stay.city_id
                       and s.arrive_on <= my_stay.leave_on and s.leave_on >= my_stay.arrive_on)
  into same_rhythm, overlap
  from people x
  join profiles p on p.id = x.uid
  left join stays s on s.user_id = x.uid and s.active
  where x.uid <> v_uid;

  return jsonb_build_object('same_rhythm', same_rhythm, 'overlap', overlap);
end;
$$;

-- ---------------------------------------------------------------------------
-- S2: compatible people (opt-in, verified, active stays overlapping ≥ MIN_OVERLAP_DAYS, no blocks)
-- ---------------------------------------------------------------------------

create function min_overlap_days() returns int language sql immutable as $$ select 7 $$;

create function compatible_people(p_city_id uuid, p_limit int default 20)
returns table (user_id uuid, display_name text, avatar_url text, common_interests text[], same_rhythm boolean, overlap_days int, score numeric)
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  me profiles;
  my_stay stays;
begin
  if v_uid is null then return; end if;
  select * into me from profiles where id = v_uid;
  select * into my_stay from stays where user_id = v_uid and active and city_id = p_city_id;
  if me.id is null or not me.discoverable or not counts_as_verified(v_uid) or my_stay.id is null then return; end if;

  return query
  with candidates as (
    select p.id, p.display_name, p.avatar_url, p.interests, p.work_rhythm,
           (least(s.leave_on, my_stay.leave_on) - greatest(s.arrive_on, my_stay.arrive_on) + 1) as days
    from profiles p
    join stays s on s.user_id = p.id and s.active and s.city_id = p_city_id
    where p.id <> v_uid and p.discoverable and counts_as_verified(p.id)
      and not is_blocked_between(v_uid, p.id)
  )
  select c.id, c.display_name, c.avatar_url,
         array(select unnest(c.interests) intersect select unnest(me.interests)),
         (c.work_rhythm = me.work_rhythm and me.work_rhythm <> 'flexible'),
         c.days::int,
         round(50 * least(c.days, 30) / 30.0
               + 30 * least(cardinality(array(select unnest(c.interests) intersect select unnest(me.interests))), 3) / 3.0
               + 20 * (case when c.work_rhythm = me.work_rhythm and me.work_rhythm <> 'flexible' then 1 else 0 end), 1)
  from candidates c
  where c.days >= min_overlap_days()
  order by 7 desc, 6 desc
  limit greatest(1, least(p_limit, 50));
end;
$$;

revoke execute on function ensure_series_occurrences(uuid), ensure_all_series(), is_blocked_between(uuid, uuid), counts_as_verified(uuid)
  from public, anon, authenticated;
revoke execute on function follow_series(uuid), decide_series_member(uuid, uuid, text), leave_series(uuid), series_people(uuid),
  activity_compat(uuid), compatible_people(uuid, int) from public, anon;
grant execute on function follow_series(uuid), decide_series_member(uuid, uuid, text), leave_series(uuid), series_people(uuid),
  activity_compat(uuid), compatible_people(uuid, int) to authenticated;

-- Anyone may refresh a series' occurrences when opening it (idempotent, no user input besides the id).
create function refresh_series(p_series_id uuid) returns int
language sql security definer set search_path = public as $$ select ensure_series_occurrences(p_series_id) $$;
grant execute on function refresh_series(uuid) to anon, authenticated;

alter publication supabase_realtime add table series_members;
