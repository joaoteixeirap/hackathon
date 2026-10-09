-- A2: a real series-follow cohort, with no user identifiers returned.
create or replace function engagement_totals(p_since timestamptz default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  return jsonb_build_object(
    'series_requested', (select count(distinct user_id) from series_members where p_since is null or created_at >= p_since),
    'series_approved', (select count(distinct user_id) from series_members where status = 'approved' and (p_since is null or created_at >= p_since)),
    'series_returning', (select count(*) from (
      select m.user_id from activity_members m join activities a on a.id = m.activity_id
      where m.status = 'approved' and a.ends_at <= now() and a.status <> 'cancelled' and (p_since is null or a.ends_at >= p_since)
        and exists (select 1 from series_members sm where sm.user_id = m.user_id and sm.status = 'approved' and sm.series_id = a.series_id and (p_since is null or sm.created_at >= p_since))
      group by m.user_id having count(distinct m.activity_id) >= 2
    ) returned),
    'approved', (select count(*) from activity_members where status = 'approved' and (p_since is null or created_at >= p_since)),
    'returning', (select count(*) from (select m.user_id from activity_members m join activities a on a.id = m.activity_id where m.status = 'approved' and a.ends_at <= now() and a.status <> 'cancelled' and (p_since is null or a.ends_at >= p_since) group by m.user_id having count(distinct m.activity_id) >= 2) x)
  );
end;
$$;
