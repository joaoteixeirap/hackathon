-- compatible_people: its OUT column user_id clashed with stays.user_id ("ambiguous").

create or replace function compatible_people(p_city_id uuid, p_limit int default 20)
returns table (user_id uuid, display_name text, avatar_url text, common_interests text[], same_rhythm boolean, overlap_days int, score numeric)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
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
