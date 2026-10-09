-- M7: neighborhoods from mapped places, aggregated presence with positions (F8).

-- Neighborhood centroids per city, derived from places (OSM addr:suburb / nearest place=suburb).
-- Only neighborhoods with a few mapped places, so the list stays clean.
create function city_neighborhoods(p_city_id uuid)
returns table (neighborhood text, lat double precision, lng double precision, places int)
language sql stable security definer set search_path = public as $$
  select p.neighborhood, avg(p.lat), avg(p.lng), count(*)::int
  from places p
  where p.city_id = p_city_id and p.neighborhood is not null and not p.is_demo
  group by p.neighborhood
  having count(*) >= 3
  order by p.neighborhood;
$$;

-- "Quem está aqui": counts per neighborhood (min 3 people) placed at the neighborhood centroid.
-- Never an individual position (CLAUDE.md rule 3).
create function presence_map(p_city_id uuid)
returns table (neighborhood text, people int, lat double precision, lng double precision)
language sql stable security definer set search_path = public as $$
  select pr.neighborhood, pr.people, n.lat, n.lng
  from presence_by_neighborhood(p_city_id) pr
  join city_neighborhoods(p_city_id) n on n.neighborhood = pr.neighborhood;
$$;

grant execute on function city_neighborhoods(uuid), presence_map(uuid) to anon, authenticated;

-- Reports queue: newest unresolved first.
create index on reports (resolved, created_at desc);
