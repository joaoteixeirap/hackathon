-- SPEC_V2 V1 — data and trust: work check-ins (R1/R2), seals with validity (R3),
-- per-fact source/date/confirmations (T1) and freshness inputs (T2).
-- Numbers mirror src/config/nomad.ts (hypotheses); keep both in sync.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

alter table cities add column timezone text not null default 'America/Sao_Paulo';

alter table places
  add column outlets_level text check (outlets_level in ('none','few','many')),
  add column stay_policy text not null default 'unknown'
    check (stay_policy in ('free','min_consumption','time_limit','pass_required','unknown')),
  add column stay_note text check (char_length(stay_note) <= 140),
  add column declared_wifi_mbps numeric check (declared_wifi_mbps > 0 and declared_wifi_mbps < 10000),
  add column upload_mbps numeric,
  add column ping_ms numeric,
  add column jitter_ms numeric,
  add column loss_pct numeric,
  add column call_ok_share numeric check (call_ok_share between 0 and 1),
  add column facts_meta jsonb not null default '{}'::jsonb,
  add column last_verified_at timestamptz,
  add column distinct_users_90d int not null default 0,
  add column seal_valid_until timestamptz,
  add column call_ready_valid_until timestamptz;
-- nomad_seal stays as a legacy mirror ("seal active right now"); the interface uses seal_valid_until.

alter table events add column session_id text check (char_length(session_id) <= 64);

-- ---------------------------------------------------------------------------
-- Configuration (hypotheses; see src/config/nomad.ts)
-- ---------------------------------------------------------------------------

create function checkin_cooldown() returns interval language sql immutable as $$ select interval '6 hours' $$;
create function seal_window() returns interval language sql immutable as $$ select interval '60 days' $$;
create function vote_cooldown() returns interval language sql immutable as $$ select interval '7 days' $$;
-- SEAL_REQUIRES_NEAR_PLACE: a check-in confirmed near the place is required for the seal.
create function seal_requires_near_place() returns boolean language sql immutable as $$ select true $$;

-- ---------------------------------------------------------------------------
-- Check-ins (replace wifi_tests). Individual rows are private to their author (I5b).
-- ---------------------------------------------------------------------------

create table place_checkins (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  activity_id uuid references activities on delete set null,
  download_mbps numeric check (download_mbps between 0 and 5000),
  upload_mbps numeric check (upload_mbps between 0 and 5000),
  ping_ms numeric check (ping_ms >= 0 and ping_ms < 10000),
  jitter_ms numeric check (jitter_ms >= 0 and jitter_ms < 10000),
  loss_pct numeric check (loss_pct between 0 and 100),
  measured boolean not null default false,
  on_venue_wifi boolean not null default false,
  near_place boolean not null default false,   -- only the boolean; never the user's coordinates
  outlets_level text check (outlets_level in ('none','few','many')),
  noise_level smallint check (noise_level between 1 and 5),   -- 1 barulhento ... 5 silencioso
  call_result text not null default 'not_tested' check (call_result in ('ok','choppy','failed','not_tested')),
  stay_policy text check (stay_policy in ('free','min_consumption','time_limit','pass_required','unknown')),
  crowd_level smallint check (crowd_level between 1 and 5),
  comment text check (char_length(comment) <= 200),
  created_at timestamptz not null default now()
);
create index on place_checkins (place_id, created_at desc);
create index on place_checkins (user_id, created_at desc);
alter table place_checkins enable row level security;
create policy checkins_read_own on place_checkins for select to authenticated
  using (user_id = auth.uid() or is_admin());
-- No insert/update policy: writes go through submit_checkin().

insert into place_checkins (place_id, user_id, download_mbps, ping_ms, measured, on_venue_wifi, created_at)
select place_id, user_id, download_mbps, ping_ms, true, true, created_at from wifi_tests;

drop table wifi_tests cascade;
drop function if exists wifi_test_rules();
drop function if exists wifi_test_recompute();
drop function if exists recompute_wifi(uuid);
drop function if exists place_wifi_stats(uuid);

-- ---------------------------------------------------------------------------
-- "Confirmar" / "Desatualizado" votes (aggregates only)
-- ---------------------------------------------------------------------------

create table fact_votes (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  field text not null check (field in
    ('wifi','outlets','noise','calls','stay_policy','opening_hours','languages','price','health_info','offer')),
  vote text not null check (vote in ('confirm','outdated')),
  created_at timestamptz not null default now()
);
create index on fact_votes (place_id, field, created_at desc);
create index on fact_votes (user_id, place_id, field, created_at desc);
alter table fact_votes enable row level security;
create policy fact_votes_admin on fact_votes for select to authenticated using (is_admin());

-- ---------------------------------------------------------------------------
-- Computed columns are off limits to partners (only recompute_place writes them).
-- ---------------------------------------------------------------------------

create or replace function protect_place_columns() returns trigger
language plpgsql as $$
begin
  if is_end_user_call() and not is_admin() then
    if tg_op = 'INSERT' then
      new.nomad_seal := false;
      new.featured_until := null;
      new.osm_id := null;
      new.is_demo := false;
      if new.wifi_source = 'user_test' then new.wifi_source := 'partner'; end if;
      new.facts_meta := '{}'::jsonb;
      new.seal_valid_until := null;
      new.call_ready_valid_until := null;
      new.last_verified_at := null;
      new.distinct_users_90d := 0;
      new.upload_mbps := null; new.ping_ms := null; new.jitter_ms := null; new.loss_pct := null;
      new.call_ok_share := null;
    elsif new.nomad_seal is distinct from old.nomad_seal
       or new.featured_until is distinct from old.featured_until
       or new.osm_id is distinct from old.osm_id
       or new.city_id is distinct from old.city_id
       or new.partner_id is distinct from old.partner_id
       or new.is_demo is distinct from old.is_demo
       or (new.wifi_source = 'user_test' and old.wifi_source is distinct from 'user_test')
       or new.wifi_mbps is distinct from old.wifi_mbps
       or new.facts_meta is distinct from old.facts_meta
       or new.seal_valid_until is distinct from old.seal_valid_until
       or new.call_ready_valid_until is distinct from old.call_ready_valid_until
       or new.last_verified_at is distinct from old.last_verified_at
       or new.distinct_users_90d is distinct from old.distinct_users_90d
       or new.upload_mbps is distinct from old.upload_mbps
       or new.ping_ms is distinct from old.ping_ms
       or new.jitter_ms is distinct from old.jitter_ms
       or new.loss_pct is distinct from old.loss_pct
       or new.call_ok_share is distinct from old.call_ok_share
       or new.outlets_level is distinct from old.outlets_level then
      raise exception 'protected place column' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- recompute_place: medians, facts_meta, seals. Precedence users > partner > OSM,
-- except stay_policy, where the partner's declaration wins (the rule belongs to the venue).
-- ---------------------------------------------------------------------------

-- Votes for one fact: distinct confirmers in 90 days, last confirmation, "outdated" in 30 days.
create function fact_vote_counts(p_place_id uuid, p_field text)
returns table (confirms_90d int, last_confirm timestamptz, outdated_30d int)
language sql stable security definer set search_path = public as $$
  select count(distinct user_id) filter (where vote = 'confirm' and created_at > now() - interval '90 days')::int,
         max(created_at) filter (where vote = 'confirm'),
         count(*) filter (where vote = 'outdated' and created_at > now() - interval '30 days')::int
  from fact_votes where place_id = p_place_id and field = p_field;
$$;

-- One entry of facts_meta.
create function fact_entry(p_place_id uuid, p_field text, p_source text, p_observed timestamptz, p_people int)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v record;
begin
  if p_source is null then return null; end if;
  select * into v from fact_vote_counts(p_place_id, p_field);
  return jsonb_build_object(
    'source', p_source,
    'observed_at', greatest(p_observed, v.last_confirm),
    'confirmations_90d', coalesce(p_people, 0) + coalesce(v.confirms_90d, 0),
    'outdated_30d', coalesce(v.outdated_30d, 0)
  );
end;
$$;

create function recompute_place(p_place_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  pl places;
  w90 timestamptz := now() - interval '90 days';
  wseal timestamptz := now() - seal_window();
  -- measured connection (last 90 days, or all time when there is nothing recent)
  m_n int; m_down numeric; m_up numeric; m_ping numeric; m_jitter numeric; m_loss numeric;
  m_last timestamptz; m_users int;
  -- reports
  r_outlets text; r_outlets_last timestamptz; r_outlets_people int;
  r_noise numeric; r_noise_last timestamptz; r_noise_people int;
  r_calls_ok int; r_calls_bad int; r_calls_last timestamptz; r_calls_people int;
  r_stay text; r_stay_last timestamptz; r_stay_people int;
  -- seals
  s_users int; s_down numeric; s_up numeric; s_ping numeric; s_jitter numeric; s_loss numeric;
  s_last timestamptz; s_near boolean; s_out_good int; s_out_none int; s_noise numeric;
  s_calls_ok int; s_calls_bad int;
  seal_ok boolean; call_ok boolean;
  v_seal timestamptz; v_call timestamptz;
  offers_last timestamptz;
  meta jsonb := '{}'::jsonb;
  v_source text;
  partner_stay boolean;
begin
  select * into pl from places where id = p_place_id for update;
  if not found then return; end if;

  -- Connection medians
  select count(*), percentile_cont(0.5) within group (order by download_mbps),
         percentile_cont(0.5) within group (order by upload_mbps),
         percentile_cont(0.5) within group (order by ping_ms),
         percentile_cont(0.5) within group (order by jitter_ms),
         percentile_cont(0.5) within group (order by loss_pct),
         max(created_at), count(distinct user_id)
  into m_n, m_down, m_up, m_ping, m_jitter, m_loss, m_last, m_users
  from place_checkins where place_id = p_place_id and measured and created_at > w90;
  if m_n = 0 then
    select count(*), percentile_cont(0.5) within group (order by download_mbps),
           percentile_cont(0.5) within group (order by upload_mbps),
           percentile_cont(0.5) within group (order by ping_ms),
           percentile_cont(0.5) within group (order by jitter_ms),
           percentile_cont(0.5) within group (order by loss_pct),
           max(created_at), 0
    into m_n, m_down, m_up, m_ping, m_jitter, m_loss, m_last, m_users
    from place_checkins where place_id = p_place_id and measured;
  end if;

  -- Reports (last 90 days): mode for categories, median for noise
  select outlets_level, max(created_at) into r_outlets, r_outlets_last
  from place_checkins where place_id = p_place_id and outlets_level is not null and created_at > w90
  group by outlets_level order by count(*) desc, max(created_at) desc limit 1;
  select count(distinct user_id) into r_outlets_people
  from place_checkins where place_id = p_place_id and outlets_level is not null and created_at > w90;

  select percentile_disc(0.5) within group (order by noise_level), max(created_at), count(distinct user_id)
  into r_noise, r_noise_last, r_noise_people
  from place_checkins where place_id = p_place_id and noise_level is not null and created_at > w90;

  select count(*) filter (where call_result = 'ok'), count(*) filter (where call_result in ('choppy','failed')),
         max(created_at) filter (where call_result <> 'not_tested'),
         count(distinct user_id) filter (where call_result <> 'not_tested')
  into r_calls_ok, r_calls_bad, r_calls_last, r_calls_people
  from place_checkins where place_id = p_place_id and created_at > w90;

  select stay_policy, max(created_at) into r_stay, r_stay_last
  from place_checkins where place_id = p_place_id and stay_policy is not null and stay_policy <> 'unknown' and created_at > w90
  group by stay_policy order by count(*) desc, max(created_at) desc limit 1;
  select count(distinct user_id) into r_stay_people
  from place_checkins where place_id = p_place_id and stay_policy is not null and stay_policy <> 'unknown' and created_at > w90;

  partner_stay := coalesce(pl.facts_meta -> 'stay_policy' ->> 'source', '') = 'partner';

  -- Seals: qualifying window
  select count(distinct user_id), percentile_cont(0.5) within group (order by download_mbps),
         percentile_cont(0.5) within group (order by upload_mbps),
         percentile_cont(0.5) within group (order by ping_ms),
         percentile_cont(0.5) within group (order by jitter_ms),
         percentile_cont(0.5) within group (order by loss_pct),
         max(created_at), bool_or(near_place)
  into s_users, s_down, s_up, s_ping, s_jitter, s_loss, s_last, s_near
  from place_checkins where place_id = p_place_id and measured and on_venue_wifi and created_at > wseal;
  select count(*) filter (where outlets_level in ('few','many')), count(*) filter (where outlets_level = 'none'),
         percentile_disc(0.5) within group (order by noise_level),
         count(*) filter (where call_result = 'ok'), count(*) filter (where call_result in ('choppy','failed'))
  into s_out_good, s_out_none, s_noise, s_calls_ok, s_calls_bad
  from place_checkins where place_id = p_place_id and created_at > wseal;

  seal_ok := coalesce(s_users, 0) >= nomad_seal_min_tests()
    and coalesce(s_down, 0) >= nomad_seal_min_mbps()
    and (s_out_good > s_out_none or (s_out_good + s_out_none = 0 and coalesce(pl.has_power_outlets, false)))
    and (not seal_requires_near_place() or coalesce(s_near, false));
  call_ok := coalesce(s_users, 0) >= nomad_seal_min_tests()
    and coalesce(s_down, 0) >= 15 and coalesce(s_up, 0) >= 5
    and s_ping is not null and s_ping <= 80
    and coalesce(s_jitter, 0) <= 30 and coalesce(s_loss, 0) <= 2
    and coalesce(s_noise, coalesce(pl.quiet_level, 0)) >= 3
    and s_calls_bad <= s_calls_ok;

  -- Valid for SEAL_WINDOW_DAYS after the latest qualifying check-in; when criteria stop
  -- holding, the seal ends now (and shows as "vencido" with its date).
  v_seal := case when seal_ok then s_last + seal_window()
                 when pl.seal_valid_until is not null then least(pl.seal_valid_until, now()) end;
  v_call := case when call_ok then s_last + seal_window()
                 when pl.call_ready_valid_until is not null then least(pl.call_ready_valid_until, now()) end;

  -- facts_meta
  if m_n > 0 then
    meta := meta || jsonb_build_object('wifi', fact_entry(p_place_id, 'wifi', 'user', m_last, m_users));
  elsif pl.declared_wifi_mbps is not null then
    meta := meta || jsonb_build_object('wifi', fact_entry(p_place_id, 'wifi', 'partner',
      coalesce((pl.facts_meta -> 'wifi' ->> 'observed_at')::timestamptz, pl.created_at), 0));
  elsif pl.wifi_source = 'osm' then
    meta := meta || jsonb_build_object('wifi', fact_entry(p_place_id, 'wifi', 'osm', pl.created_at, 0));
  end if;

  v_source := case when pl.osm_id is not null then 'osm' else 'partner' end;
  if r_outlets is not null then
    meta := meta || jsonb_build_object('outlets', fact_entry(p_place_id, 'outlets', 'user', r_outlets_last, r_outlets_people));
  elsif pl.has_power_outlets is not null then
    meta := meta || jsonb_build_object('outlets', fact_entry(p_place_id, 'outlets', 'partner', pl.created_at, 0));
  end if;
  if r_noise is not null then
    meta := meta || jsonb_build_object('noise', fact_entry(p_place_id, 'noise', 'user', r_noise_last, r_noise_people));
  elsif pl.quiet_level is not null then
    meta := meta || jsonb_build_object('noise', fact_entry(p_place_id, 'noise', 'partner', pl.created_at, 0));
  end if;
  if r_calls_ok + r_calls_bad > 0 then
    meta := meta || jsonb_build_object('calls', fact_entry(p_place_id, 'calls', 'user', r_calls_last, r_calls_people));
  end if;
  if partner_stay then
    meta := meta || jsonb_build_object('stay_policy', fact_entry(p_place_id, 'stay_policy', 'partner',
      (pl.facts_meta -> 'stay_policy' ->> 'observed_at')::timestamptz, 0));
  elsif r_stay is not null then
    meta := meta || jsonb_build_object('stay_policy', fact_entry(p_place_id, 'stay_policy', 'user', r_stay_last, r_stay_people));
  end if;
  if pl.opening_hours is not null then
    meta := meta || jsonb_build_object('opening_hours', fact_entry(p_place_id, 'opening_hours', v_source, pl.created_at, 0));
  end if;
  if pl.languages is not null and cardinality(pl.languages) > 0 then
    meta := meta || jsonb_build_object('languages', fact_entry(p_place_id, 'languages', v_source, pl.created_at, 0));
  end if;
  if pl.price_hint is not null then
    meta := meta || jsonb_build_object('price', fact_entry(p_place_id, 'price', v_source, pl.created_at, 0));
  end if;
  if pl.category = 'health' and pl.accepts_without_plan is not null then
    meta := meta || jsonb_build_object('health_info', fact_entry(p_place_id, 'health_info', v_source, pl.created_at, 0));
  end if;
  select max(created_at) into offers_last from offers
  where place_id = p_place_id and active and (valid_to is null or valid_to >= local_today());
  if offers_last is not null then
    meta := meta || jsonb_build_object('offer', fact_entry(p_place_id, 'offer', 'partner', offers_last, 0));
  end if;
  meta := jsonb_strip_nulls(meta);

  update places set
    wifi_mbps = case when m_n > 0 then round(m_down::numeric, 1)
                     when pl.declared_wifi_mbps is not null then pl.declared_wifi_mbps
                     when pl.wifi_source = 'user_test' then null
                     else pl.wifi_mbps end,
    wifi_source = case when m_n > 0 then 'user_test'
                       when pl.declared_wifi_mbps is not null then 'partner'
                       when pl.wifi_source = 'user_test' then null
                       else pl.wifi_source end,
    upload_mbps = case when m_n > 0 then round(m_up::numeric, 1) end,
    ping_ms = case when m_n > 0 then round(m_ping::numeric) end,
    jitter_ms = case when m_n > 0 then round(m_jitter::numeric, 1) end,
    loss_pct = case when m_n > 0 then round(m_loss::numeric, 1) end,
    outlets_level = coalesce(r_outlets, pl.outlets_level),
    has_power_outlets = case when r_outlets is not null then r_outlets in ('few','many') else pl.has_power_outlets end,
    quiet_level = coalesce(r_noise::smallint, pl.quiet_level),
    call_ok_share = case when r_calls_ok + r_calls_bad > 0 then round(r_calls_ok::numeric / (r_calls_ok + r_calls_bad), 2) end,
    stay_policy = case when partner_stay then pl.stay_policy else coalesce(r_stay, 'unknown') end,
    last_verified_at = (select max(created_at) from place_checkins where place_id = p_place_id),
    distinct_users_90d = (select count(distinct user_id) from place_checkins where place_id = p_place_id and created_at > w90),
    seal_valid_until = v_seal,
    call_ready_valid_until = v_call,
    nomad_seal = coalesce(v_seal > now(), false),
    facts_meta = meta
  where id = p_place_id;
end;
$$;

-- Offers feed the "offer" fact.
create function offers_recompute_place() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform recompute_place(coalesce(new.place_id, old.place_id));
  return null;
end;
$$;
create trigger offers_recompute after insert or update or delete on offers
  for each row execute function offers_recompute_place();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- How many times the place card was opened in the last 30 days ("você ajudou N pessoas").
create function place_open_count(p_place_id uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from events
  where name = 'open_place' and props ->> 'place_id' = p_place_id::text and created_at > now() - interval '30 days';
$$;

-- Public trust fields of a place (no user ids anywhere).
create function place_trust(p_place_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'wifi_mbps', wifi_mbps, 'wifi_source', wifi_source, 'declared_wifi_mbps', declared_wifi_mbps,
    'upload_mbps', upload_mbps, 'ping_ms', ping_ms, 'jitter_ms', jitter_ms, 'loss_pct', loss_pct,
    'outlets_level', outlets_level, 'has_power_outlets', has_power_outlets, 'quiet_level', quiet_level,
    'call_ok_share', call_ok_share, 'stay_policy', stay_policy, 'stay_note', stay_note,
    'facts_meta', facts_meta, 'last_verified_at', last_verified_at, 'distinct_users_90d', distinct_users_90d,
    'seal_valid_until', seal_valid_until, 'call_ready_valid_until', call_ready_valid_until)
  from places where id = p_place_id;
$$;

-- Check-in (R1): any signed-in user (guests too), one per place every CHECKIN_COOLDOWN_HOURS.
create function submit_checkin(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_place uuid := (p ->> 'place_id')::uuid;
  v_cat text;
  v_measured boolean := (p ->> 'download_mbps') is not null;
  v_activity uuid;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select category into v_cat from places where id = v_place;
  if v_cat is null then raise exception 'place not found' using errcode = 'P0002'; end if;
  if v_cat not in ('work','eat') then raise exception 'check-ins are for work places and cafes'; end if;
  if exists (select 1 from place_checkins where place_id = v_place and user_id = v_uid and created_at > now() - checkin_cooldown()) then
    raise exception 'checkin cooldown' using errcode = 'P0001';
  end if;
  if v_measured and not coalesce((p ->> 'on_venue_wifi')::boolean, false) then
    raise exception 'confirm venue wifi' using errcode = 'P0001';
  end if;
  if (p ->> 'activity_id') is not null then
    select id into v_activity from activities where id = (p ->> 'activity_id')::uuid and place_id = v_place;
  end if;

  insert into place_checkins (place_id, user_id, activity_id, download_mbps, upload_mbps, ping_ms, jitter_ms, loss_pct,
    measured, on_venue_wifi, near_place, outlets_level, noise_level, call_result, stay_policy, crowd_level, comment)
  values (v_place, v_uid, v_activity,
    (p ->> 'download_mbps')::numeric, (p ->> 'upload_mbps')::numeric, (p ->> 'ping_ms')::numeric,
    (p ->> 'jitter_ms')::numeric, (p ->> 'loss_pct')::numeric,
    v_measured, coalesce((p ->> 'on_venue_wifi')::boolean, false), coalesce((p ->> 'near_place')::boolean, false),
    nullif(p ->> 'outlets_level', ''), (p ->> 'noise_level')::smallint,
    coalesce(nullif(p ->> 'call_result', ''), 'not_tested'), nullif(p ->> 'stay_policy', ''),
    (p ->> 'crowd_level')::smallint, nullif(left(btrim(p ->> 'comment'), 200), ''));

  perform recompute_place(v_place);
  return place_trust(v_place) || jsonb_build_object('helped', place_open_count(v_place));
end;
$$;

-- "Confirmar" / "Desatualizado" (T1): one vote per user, place and field every 7 days;
-- partners cannot vote on their own places.
create function vote_fact(p_place_id uuid, p_field text, p_vote text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if p_vote not in ('confirm','outdated') then raise exception 'invalid vote'; end if;
  if owns_place(p_place_id) then raise exception 'partners cannot vote on their own place' using errcode = '42501'; end if;
  if exists (select 1 from fact_votes where user_id = v_uid and place_id = p_place_id and field = p_field
             and created_at > now() - vote_cooldown()) then
    raise exception 'vote cooldown' using errcode = 'P0001';
  end if;
  insert into fact_votes (place_id, user_id, field, vote) values (p_place_id, v_uid, p_field, p_vote);
  perform recompute_place(p_place_id);
  return place_trust(p_place_id);
end;
$$;

revoke execute on function recompute_place(uuid), fact_entry(uuid, text, text, timestamptz, int), fact_vote_counts(uuid, text),
  offers_recompute_place(), place_open_count(uuid) from public, anon, authenticated;
revoke execute on function submit_checkin(jsonb), vote_fact(uuid, text, text) from public, anon;
grant execute on function submit_checkin(jsonb), vote_fact(uuid, text, text) to authenticated;
grant execute on function place_trust(uuid) to anon, authenticated;

-- Fill the new columns for every place once.
select recompute_place(id) from places;
