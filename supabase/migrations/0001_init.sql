-- SoloRota: initial schema, RLS and RPCs (SPEC.md §5).
-- Conventions: uuid PKs with gen_random_uuid(), timestamptz, lat/lng as double precision (no PostGIS).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table cities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  state text not null,
  center_lat double precision not null,
  center_lng double precision not null,
  zoom numeric not null default 12,
  bbox double precision[] not null check (array_length(bbox, 1) = 4)  -- [west, south, east, north]
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar_url text,
  bio text check (char_length(bio) <= 280),
  home_country text default 'BR',
  languages text[] default '{pt}',
  role text not null default 'nomad' check (role in ('nomad','partner','admin')),
  verified boolean not null default false,
  current_city_id uuid references cities,
  stay_from date,
  stay_to date,
  neighborhood text,              -- only for presence aggregation
  share_presence boolean not null default false,
  created_at timestamptz not null default now(),
  check (stay_to is null or stay_from is null or stay_to >= stay_from)
);

create table partners (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  business_name text not null check (char_length(business_name) between 2 and 120),
  document_type text check (document_type in ('cnpj','mei')),
  document_number text,
  approved boolean not null default false,
  plan text not null default 'free' check (plan in ('free','destaque')),
  created_at timestamptz not null default now()
);
create index on partners (owner_id);

create table places (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references cities,
  partner_id uuid references partners on delete set null,
  osm_id text unique,
  name text not null,
  category text not null check (category in ('work','eat','health','stay','tour','service')),
  subcategory text,
  lat double precision not null,
  lng double precision not null,
  address text,
  neighborhood text,
  description text,
  opening_hours text,              -- OSM format, parsed with opening_hours.js
  wifi_mbps numeric,
  wifi_source text check (wifi_source in ('osm','partner','user_test')),
  has_power_outlets boolean,
  quiet_level smallint check (quiet_level between 1 and 5),
  price_hint text check (price_hint in ('$','$$','$$$')),
  accepts_without_plan boolean,    -- health
  languages text[],
  nomad_seal boolean not null default false,
  featured_until timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index on places (city_id, category);
create index on places (lat, lng);
create index on places (partner_id);

create table offers (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places on delete cascade,
  kind text not null check (kind in ('discount','day_pass','slot','package','consult')),
  title text not null check (char_length(title) between 3 and 80),
  description text,
  code text not null,
  valid_from date,
  valid_to date,
  capacity int check (capacity > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on offers (place_id);

create table offer_redemptions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  redeemed_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (offer_id, user_id, redeemed_on)
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references cities,
  creator_id uuid not null references profiles on delete cascade,
  place_id uuid references places on delete set null,
  offer_id uuid references offers on delete set null,
  title text not null check (char_length(title) between 3 and 80),
  description text check (char_length(description) <= 1000),
  category text not null check (category in ('meetup','work_together','food','outdoor','culture','tour')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  meeting_lat double precision not null,
  meeting_lng double precision not null,
  meeting_label text,
  capacity int not null check (capacity between 2 and 30),  -- total people, creator included
  cost_total_cents int check (cost_total_cents >= 0),
  split_cost boolean not null default false,
  status text not null default 'open' check (status in ('open','full','cancelled','done')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index on activities (city_id, starts_at);
create index on activities (creator_id);

create table activity_members (
  activity_id uuid references activities on delete cascade,
  user_id uuid references profiles on delete cascade,
  status text not null default 'requested' check (status in ('requested','approved','declined','left')),
  created_at timestamptz not null default now(),
  primary key (activity_id, user_id)
);
create index on activity_members (user_id);

create table messages (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index on messages (activity_id, created_at);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles on delete cascade,
  target_type text not null check (target_type in ('place','activity','profile')),
  target_id uuid not null,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 300),
  created_at timestamptz not null default now(),
  unique (author_id, target_type, target_id)
);
create index on reviews (target_type, target_id);

create table wifi_tests (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  download_mbps numeric not null check (download_mbps >= 0 and download_mbps < 10000),
  ping_ms numeric check (ping_ms >= 0),
  created_at timestamptz not null default now()
);
create index on wifi_tests (place_id, created_at);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles on delete cascade,
  target_type text not null check (target_type in ('activity','message','profile','place')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 500),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  city_slug text,
  audience text check (audience in ('nomad_br','nomad_foreign','partner')),
  utm_source text,
  utm_campaign text,
  origin_block text,
  created_at timestamptz not null default now(),
  unique (email)
);

create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 64),
  props jsonb default '{}',
  created_at timestamptz not null default now()
);
create index on events (name, created_at);

-- ---------------------------------------------------------------------------
-- Configurable criteria (hypotheses, SPEC F2/F12)
-- ---------------------------------------------------------------------------

create function nomad_seal_min_mbps() returns numeric language sql immutable as $$ select 25::numeric $$;
create function nomad_seal_min_tests() returns int language sql immutable as $$ select 2 $$;
create function presence_min_people() returns int language sql immutable as $$ select 3 $$;

-- ---------------------------------------------------------------------------
-- Helper functions (security definer: used inside policies without recursion)
-- ---------------------------------------------------------------------------

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create function is_verified() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and verified);
$$;

-- Approved partner owned by the current user.
create function owns_partner(p_partner_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from partners where id = p_partner_id and owner_id = auth.uid() and approved
  );
$$;

create function owns_place(p_place_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from places pl join partners pa on pa.id = pl.partner_id
    where pl.id = p_place_id and pa.owner_id = auth.uid() and pa.approved
  );
$$;

create function is_activity_creator(p_activity_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from activities where id = p_activity_id and creator_id = auth.uid());
$$;

-- Creator or approved member.
create function is_activity_participant(p_activity_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from activities where id = p_activity_id and creator_id = p_user_id)
      or exists (
        select 1 from activity_members
        where activity_id = p_activity_id and user_id = p_user_id and status = 'approved'
      );
$$;

-- True when the call comes from an end user (PostgREST roles), not from the
-- service role, migrations, or a security definer RPC.
create function is_end_user_call() returns boolean
language sql stable as $$
  select current_user in ('anon', 'authenticated');
$$;

-- ---------------------------------------------------------------------------
-- New user → profile
-- ---------------------------------------------------------------------------

create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1), 'Nômade'), 60)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Users that already exist (e.g. hosted project reset keeps auth.users).
insert into profiles (id, display_name)
select u.id, left(coalesce(split_part(u.email, '@', 1), 'Nômade'), 60)
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Column protection triggers (end users cannot touch privileged columns)
-- ---------------------------------------------------------------------------

create function protect_profile_columns() returns trigger
language plpgsql as $$
begin
  if is_end_user_call() and not is_admin() then
    if new.role is distinct from old.role or new.verified is distinct from old.verified then
      raise exception 'only admins can change role or verified' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger profiles_protect before update on profiles
  for each row execute function protect_profile_columns();

create function protect_partner_columns() returns trigger
language plpgsql as $$
begin
  if is_end_user_call() and not is_admin() then
    if tg_op = 'INSERT' then
      new.approved := false;
      new.plan := 'free';
    elsif new.approved is distinct from old.approved
       or new.plan is distinct from old.plan
       or new.owner_id is distinct from old.owner_id then
      raise exception 'only admins can change approval, plan or owner' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger partners_protect before insert or update on partners
  for each row execute function protect_partner_columns();

create function protect_place_columns() returns trigger
language plpgsql as $$
begin
  if is_end_user_call() and not is_admin() then
    if tg_op = 'INSERT' then
      new.nomad_seal := false;
      new.featured_until := null;
      new.osm_id := null;
      new.is_demo := false;
      if new.wifi_source = 'user_test' then new.wifi_source := 'partner'; end if;
    elsif new.nomad_seal is distinct from old.nomad_seal
       or new.featured_until is distinct from old.featured_until
       or new.osm_id is distinct from old.osm_id
       or new.city_id is distinct from old.city_id
       or new.partner_id is distinct from old.partner_id
       or new.is_demo is distinct from old.is_demo
       or (new.wifi_source = 'user_test' and old.wifi_source is distinct from 'user_test') then
      raise exception 'protected place column' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger places_protect before insert or update on places
  for each row execute function protect_place_columns();

create function protect_activity_columns() returns trigger
language plpgsql as $$
begin
  if is_end_user_call() and not is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'open';
      new.is_demo := false;
    elsif new.creator_id is distinct from old.creator_id
       or new.city_id is distinct from old.city_id
       or new.is_demo is distinct from old.is_demo
       or (new.status is distinct from old.status and new.status not in ('cancelled','done')) then
      raise exception 'protected activity column' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger activities_protect before insert or update on activities
  for each row execute function protect_activity_columns();

-- ---------------------------------------------------------------------------
-- Activity membership: capacity and status bookkeeping
-- ---------------------------------------------------------------------------

create function approved_count(p_activity_id uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from activity_members where activity_id = p_activity_id and status = 'approved';
$$;

create function check_member_capacity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_capacity int;
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    select capacity into v_capacity from activities where id = new.activity_id for update;
    -- capacity counts the creator
    if approved_count(new.activity_id) + 1 >= v_capacity then
      raise exception 'activity is full' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
create trigger activity_members_capacity before insert or update on activity_members
  for each row execute function check_member_capacity();

create function sync_activity_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := coalesce(new.activity_id, old.activity_id);
begin
  update activities a
  set status = case when approved_count(v_id) + 1 >= a.capacity then 'full' else 'open' end
  where a.id = v_id and a.status in ('open','full');
  return null;
end;
$$;
create trigger activity_members_sync after insert or update or delete on activity_members
  for each row execute function sync_activity_status();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Own profile with private columns (column privileges hide them from plain selects).
create function get_my_profile() returns profiles
language sql stable security definer set search_path = public as $$
  select * from profiles where id = auth.uid();
$$;

create function request_join(p_activity_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_act activities;
  v_status text;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if not is_verified() then raise exception 'verification pending' using errcode = '42501'; end if;

  select * into v_act from activities where id = p_activity_id;
  if not found then raise exception 'activity not found' using errcode = 'P0002'; end if;
  if v_act.creator_id = v_uid then raise exception 'creator cannot join own activity'; end if;
  if v_act.status <> 'open' then raise exception 'activity is not open'; end if;
  if v_act.starts_at <= now() then raise exception 'activity already started'; end if;

  select status into v_status from activity_members where activity_id = p_activity_id and user_id = v_uid;
  if v_status in ('requested','approved') then return v_status; end if;
  if v_status = 'declined' then raise exception 'request was declined'; end if;

  insert into activity_members (activity_id, user_id, status)
  values (p_activity_id, v_uid, 'requested')
  on conflict (activity_id, user_id) do update set status = 'requested', created_at = now();
  return 'requested';
end;
$$;

create function decide_join(p_activity_id uuid, p_user_id uuid, p_decision text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if p_decision not in ('approved','declined') then raise exception 'invalid decision'; end if;
  if not is_activity_creator(p_activity_id) then
    raise exception 'only the creator can decide' using errcode = '42501';
  end if;

  update activity_members set status = p_decision
  where activity_id = p_activity_id and user_id = p_user_id and status = 'requested';
  if not found then raise exception 'no pending request' using errcode = 'P0002'; end if;
  return p_decision;
end;
$$;

create function leave_activity(p_activity_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update activity_members set status = 'left'
  where activity_id = p_activity_id and user_id = auth.uid() and status in ('requested','approved');
end;
$$;

create function presence_by_neighborhood(p_city_id uuid)
returns table (neighborhood text, people int)
language sql stable security definer set search_path = public as $$
  select p.neighborhood, count(*)::int
  from profiles p
  where p.current_city_id = p_city_id
    and p.share_presence
    and p.neighborhood is not null
    and (p.stay_from is null or p.stay_from <= current_date)
    and (p.stay_to is null or p.stay_to >= current_date)
  group by p.neighborhood
  having count(*) >= presence_min_people();
$$;

create function recompute_wifi(p_place_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_median numeric;
  v_count int;
begin
  select percentile_cont(0.5) within group (order by download_mbps), count(*)
  into v_median, v_count
  from wifi_tests where place_id = p_place_id;

  if v_count >= nomad_seal_min_tests() then
    update places set
      wifi_mbps = round(v_median, 1),
      wifi_source = 'user_test',
      nomad_seal = v_median >= nomad_seal_min_mbps() and coalesce(has_power_outlets, false)
    where id = p_place_id;
  end if;
end;
$$;

-- Aggregated Wi-Fi stats per place (raw tests are private).
create function place_wifi_stats(p_place_id uuid)
returns table (tests int, median_mbps numeric, last_test_at timestamptz)
language sql stable security definer set search_path = public as $$
  select count(*)::int,
         round((percentile_cont(0.5) within group (order by download_mbps))::numeric, 1),
         max(created_at)
  from wifi_tests where place_id = p_place_id;
$$;

create function wifi_test_rules() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from wifi_tests
    where place_id = new.place_id and user_id = new.user_id and created_at > now() - interval '1 hour'
  ) then
    raise exception 'one wifi test per place per hour' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger wifi_tests_rules before insert on wifi_tests
  for each row execute function wifi_test_rules();

create function wifi_test_recompute() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform recompute_wifi(new.place_id);
  return null;
end;
$$;
create trigger wifi_tests_recompute after insert on wifi_tests
  for each row execute function wifi_test_recompute();

-- Rating summary for profiles (public part of reputation).
create function profile_rating(p_profile_id uuid)
returns table (avg_rating numeric, review_count int)
language sql stable security definer set search_path = public as $$
  select round(avg(rating)::numeric, 1), count(*)::int
  from reviews where target_type = 'profile' and target_id = p_profile_id;
$$;

-- Reviews: after the activity ended, only between participants.
create function can_review(p_target_type text, p_target_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case p_target_type
    when 'place' then auth.uid() is not null
    when 'activity' then exists (
      select 1 from activities a
      where a.id = p_target_id and a.ends_at < now() and is_activity_participant(a.id)
    )
    when 'profile' then p_target_id <> auth.uid() and exists (
      select 1 from activities a
      where a.ends_at < now()
        and is_activity_participant(a.id)
        and is_activity_participant(a.id, p_target_id)
    )
    else false
  end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table cities enable row level security;
alter table profiles enable row level security;
alter table partners enable row level security;
alter table places enable row level security;
alter table offers enable row level security;
alter table offer_redemptions enable row level security;
alter table activities enable row level security;
alter table activity_members enable row level security;
alter table messages enable row level security;
alter table reviews enable row level security;
alter table wifi_tests enable row level security;
alter table reports enable row level security;
alter table waitlist enable row level security;
alter table events enable row level security;

-- cities
create policy cities_read on cities for select using (true);
create policy cities_admin on cities for all to authenticated using (is_admin()) with check (is_admin());

-- profiles: public columns for authenticated users; private columns via get_my_profile().
revoke select on profiles from anon, authenticated;
grant select (id, display_name, avatar_url, bio, home_country, languages, role, verified, current_city_id, created_at)
  on profiles to authenticated;
create policy profiles_read on profiles for select to authenticated using (true);
create policy profiles_update_self on profiles for update to authenticated
  using (id = auth.uid() or is_admin()) with check (id = auth.uid() or is_admin());

-- partners
create policy partners_read on partners for select to authenticated
  using (owner_id = auth.uid() or is_admin());
create policy partners_insert on partners for insert to authenticated
  with check (owner_id = auth.uid());
create policy partners_update on partners for update to authenticated
  using (owner_id = auth.uid() or is_admin()) with check (owner_id = auth.uid() or is_admin());
create policy partners_delete on partners for delete to authenticated using (is_admin());

-- places
create policy places_read on places for select using (true);
create policy places_insert on places for insert to authenticated
  with check (is_admin() or (partner_id is not null and owns_partner(partner_id)));
create policy places_update on places for update to authenticated
  using (is_admin() or owns_place(id)) with check (is_admin() or owns_place(id));
create policy places_delete on places for delete to authenticated using (is_admin());

-- offers
create policy offers_read on offers for select
  using (
    (active and (valid_to is null or valid_to >= current_date))
    or owns_place(place_id) or is_admin()
  );
create policy offers_write on offers for all to authenticated
  using (owns_place(place_id) or is_admin()) with check (owns_place(place_id) or is_admin());

-- offer_redemptions (partner first-name listing comes via RPC in M6)
create policy redemptions_read on offer_redemptions for select to authenticated
  using (
    user_id = auth.uid() or is_admin()
    or exists (select 1 from offers o where o.id = offer_id and owns_place(o.place_id))
  );
create policy redemptions_insert on offer_redemptions for insert to authenticated
  with check (
    user_id = auth.uid() and is_verified()
    and exists (
      select 1 from offers o where o.id = offer_id and o.active
        and (o.valid_from is null or o.valid_from <= current_date)
        and (o.valid_to is null or o.valid_to >= current_date)
    )
  );

-- activities: summaries are public (map and WhatsApp previews); cancelled ones only to creator/admin.
create policy activities_read on activities for select
  using (status <> 'cancelled' or creator_id = auth.uid() or is_admin());
create policy activities_insert on activities for insert to authenticated
  with check (creator_id = auth.uid() and is_verified());
create policy activities_update on activities for update to authenticated
  using (creator_id = auth.uid() or is_admin()) with check (creator_id = auth.uid() or is_admin());
create policy activities_delete on activities for delete to authenticated
  using (creator_id = auth.uid() or is_admin());

-- activity_members: inserts/decisions go through request_join / decide_join / leave_activity.
create policy members_read on activity_members for select to authenticated
  using (
    user_id = auth.uid()
    or is_activity_creator(activity_id)
    or (status = 'approved' and is_activity_participant(activity_id))
    or is_admin()
  );
create policy members_request on activity_members for insert to authenticated
  with check (
    user_id = auth.uid() and status = 'requested' and is_verified()
    and not is_activity_creator(activity_id)
  );
create policy members_decide on activity_members for update to authenticated
  using (is_activity_creator(activity_id))
  with check (is_activity_creator(activity_id) and status in ('approved','declined'));

-- messages
create policy messages_read on messages for select to authenticated
  using (is_activity_participant(activity_id) or is_admin());
create policy messages_insert on messages for insert to authenticated
  with check (user_id = auth.uid() and is_activity_participant(activity_id));
create policy messages_delete on messages for delete to authenticated using (is_admin());

-- reviews
create policy reviews_read on reviews for select to authenticated using (true);
create policy reviews_insert on reviews for insert to authenticated
  with check (author_id = auth.uid() and can_review(target_type, target_id));
create policy reviews_delete on reviews for delete to authenticated
  using (author_id = auth.uid() or is_admin());

-- wifi_tests (aggregates via place_wifi_stats)
create policy wifi_read on wifi_tests for select to authenticated
  using (user_id = auth.uid() or is_admin());
create policy wifi_insert on wifi_tests for insert to authenticated
  with check (user_id = auth.uid());

-- reports, events, waitlist: write-only for users, read for admins
create policy reports_insert on reports for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_admin on reports for all to authenticated using (is_admin()) with check (is_admin());

create policy events_insert on events for insert to anon, authenticated with check (true);
create policy events_admin_read on events for select to authenticated using (is_admin());

create policy waitlist_insert on waitlist for insert to anon, authenticated with check (true);
create policy waitlist_admin_read on waitlist for select to authenticated using (is_admin());

-- ---------------------------------------------------------------------------
-- Function privileges: helpers are internal; RPCs are callable by signed-in users.
-- ---------------------------------------------------------------------------

revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function recompute_wifi(uuid) from public, anon, authenticated;
revoke execute on function request_join(uuid) from public, anon;
revoke execute on function decide_join(uuid, uuid, text) from public, anon;
revoke execute on function leave_activity(uuid) from public, anon;
revoke execute on function get_my_profile() from public, anon;
grant execute on function request_join(uuid), decide_join(uuid, uuid, text), leave_activity(uuid), get_my_profile()
  to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: chat, membership queue and new activities
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table messages, activity_members, activities;
