-- Discovery always requires real verification, independently of the demo activity switch.
create or replace function counts_as_verified(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = p_user and verified);
$$;

-- Always materialize six FUTURE dates, even when today's slot has passed.
create or replace function ensure_series_occurrences(p_series_id uuid) returns int
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
  if (d + s.start_time) at time zone tz <= now() then d := d + 7; end if;
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
