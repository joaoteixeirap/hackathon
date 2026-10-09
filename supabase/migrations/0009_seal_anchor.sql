-- SPEC_V2 R3: seal window anchored on the latest qualifying check-in (expires without a job).

create or replace function recompute_place(p_place_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  pl places;
  w90 timestamptz := now() - interval '90 days';
  s_anchor timestamptz;
  wseal timestamptz;
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

  -- Seals: the SEAL_WINDOW_DAYS window that ends at the latest measured on-venue check-in.
  -- Anchoring on that check-in (not on now) lets a seal expire on its own and show as "vencido".
  select max(created_at) into s_anchor from place_checkins where place_id = p_place_id and measured and on_venue_wifi;
  wseal := s_anchor - seal_window();
  select count(distinct user_id), percentile_cont(0.5) within group (order by download_mbps),
         percentile_cont(0.5) within group (order by upload_mbps),
         percentile_cont(0.5) within group (order by ping_ms),
         percentile_cont(0.5) within group (order by jitter_ms),
         percentile_cont(0.5) within group (order by loss_pct),
         max(created_at), bool_or(near_place)
  into s_users, s_down, s_up, s_ping, s_jitter, s_loss, s_last, s_near
  from place_checkins where place_id = p_place_id and measured and on_venue_wifi and created_at between wseal and s_anchor;
  select count(*) filter (where outlets_level in ('few','many')), count(*) filter (where outlets_level = 'none'),
         percentile_disc(0.5) within group (order by noise_level),
         count(*) filter (where call_result = 'ok'), count(*) filter (where call_result in ('choppy','failed'))
  into s_out_good, s_out_none, s_noise, s_calls_ok, s_calls_bad
  from place_checkins where place_id = p_place_id and created_at between wseal and s_anchor;

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


select recompute_place(id) from places;
