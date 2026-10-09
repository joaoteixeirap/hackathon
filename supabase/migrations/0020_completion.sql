-- Keep the original OSM emergency tag in existing JSON metadata, without inventing hours.
create function preserve_osm_emergency() returns trigger
language plpgsql set search_path = public as $$
begin
  if (old.facts_meta ? 'emergency') and not (new.facts_meta ? 'emergency') then
    new.facts_meta := new.facts_meta || jsonb_build_object('emergency', old.facts_meta->'emergency');
  end if;
  return new;
end;
$$;
create trigger places_preserve_osm_emergency before update of facts_meta on places
for each row execute function preserve_osm_emergency();
revoke execute on function preserve_osm_emergency() from public, anon, authenticated;

-- Import-only RPC: preserve all measured facts and never change partner-owned places.
create function import_osm_emergency(p_city_id uuid, p_rows jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 5000 then
    raise exception 'invalid import';
  end if;
  update places p set facts_meta = p.facts_meta || jsonb_build_object('emergency',
    jsonb_build_object('value', r.emergency, 'source', 'osm', 'observed_at', now(),
      'confirmations_90d', 0, 'outdated_30d', 0))
  from jsonb_to_recordset(p_rows) as r(osm_id text, emergency boolean)
  where p.osm_id = r.osm_id and p.city_id = p_city_id and p.partner_id is null
    and p.category = 'health' and r.emergency is not null;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function import_osm_emergency(uuid,jsonb) from public, anon, authenticated;
grant execute on function import_osm_emergency(uuid,jsonb) to service_role;

-- Batched, viewer-specific counts for map cards. Never cache these as public map data.
create function activity_compats(p_activity_ids uuid[]) returns jsonb
language sql stable set search_path = public as $$
  select coalesce(jsonb_object_agg(x.id::text, activity_compat(x.id)), '{}'::jsonb)
  from (select distinct id from unnest(p_activity_ids) as u(id) where id is not null limit 300) x;
$$;
revoke execute on function activity_compats(uuid[]) from public, anon;
grant execute on function activity_compats(uuid[]) to authenticated;
