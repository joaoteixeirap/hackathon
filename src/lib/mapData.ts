import "server-only";
import { unstable_cache } from "next/cache";
import type { ActivitySummary, PlaceSummary } from "./places";
import { toPlaceTrust, type PlaceTrust } from "./placeTrust";
import { isSupabaseConfigured } from "./supabase/env";
import { createPublicClient } from "./supabase/public";
import { createClient } from "./supabase/server";

/** Cache tag for public map data; revalidated when activities change. */
export const MAP_DATA_TAG = "map-data";

const PLACE_COLUMNS =
  "id, name, category, subcategory, lat, lng, neighborhood, address, opening_hours, stay_policy, emergency_fact:facts_meta->emergency, wifi_mbps, wifi_source, has_power_outlets, quiet_level, price_hint, accepts_without_plan, languages, wheelchair, seal_valid_until, call_ready_valid_until, last_verified_at, wifi_fact:facts_meta->wifi, featured_until, is_demo";

type PlaceRow = Omit<PlaceSummary, "featured" | "offers" | "wifi_mbps"> & {
  featured_until: string | null;
  wifi_mbps: number | string | null;
};

export function toPlaceSummary(row: PlaceRow, offerCount: number, now = Date.now()): PlaceSummary {
  const { featured_until, ...rest } = row;
  return {
    ...rest,
    wifi_mbps: row.wifi_mbps == null ? null : Number(row.wifi_mbps),
    featured: featured_until != null && new Date(featured_until).getTime() > now,
    offers: offerCount,
  };
}

type MapData = { places: PlaceSummary[]; activities: ActivitySummary[] };

/**
 * Everything the map needs for one city. Public data only, so it is cached on the server
 * for 60 s (and invalidated by MAP_DATA_TAG when someone creates an activity); open maps
 * receive new activities through Realtime anyway.
 */
export async function loadMapData(cityId: string | null): Promise<MapData> {
  if (!cityId || !isSupabaseConfigured()) return { places: [], activities: [] };
  try {
    return await cachedMapData(cityId);
  } catch {
    // The map still opens (empty) if the database is unreachable.
    return { places: [], activities: [] };
  }
}

const cachedMapData = unstable_cache(fetchMapData, ["map-data-v4"], { revalidate: 60, tags: [MAP_DATA_TAG] });

async function fetchMapData(cityId: string): Promise<MapData> {
  const supabase = createPublicClient();
  const nowIso = new Date().toISOString();

  const [placesRes, offersRes, activitiesRes] = await Promise.all([
    supabase.from("places").select(PLACE_COLUMNS).eq("city_id", cityId).limit(5000),
    supabase.from("offers").select("place_id, places!inner(city_id)").eq("places.city_id", cityId),
    supabase
      .from("activities")
      .select("id, title, category, starts_at, ends_at, meeting_lat, meeting_lng, meeting_label, capacity, status, is_demo, series_id, activity_series(weekday, start_time, is_official)")
      .eq("city_id", cityId)
      .in("status", ["open", "full"])
      .gt("ends_at", nowIso)
      .order("starts_at")
      .limit(500),
  ]);

  const failed = placesRes.error ?? offersRes.error ?? activitiesRes.error;
  if (failed) throw failed;

  const offerCount = new Map<string, number>();
  for (const o of offersRes.data ?? []) offerCount.set(o.place_id, (offerCount.get(o.place_id) ?? 0) + 1);

  const places = ((placesRes.data ?? []) as PlaceRow[]).map((r) => toPlaceSummary(r, offerCount.get(r.id) ?? 0));
  type ActivityRow = { id: string; title: string; category: ActivitySummary["category"]; starts_at: string; ends_at: string; meeting_lat: number; meeting_lng: number; meeting_label: string | null; capacity: number; status: "open" | "full"; is_demo: boolean; series_id: string | null; activity_series: { weekday: number; start_time: string; is_official: boolean } | null };
  // A weekly series shows only its next occurrence on the map (rows are ordered by start).
  const seen = new Set<string>();
  const rows = ((activitiesRes.data ?? []) as unknown as ActivityRow[]).filter((a) => !a.series_id || (!seen.has(a.series_id) && seen.add(a.series_id)));
  const activities: ActivitySummary[] = rows.map((a) => ({
    id: a.id,
    title: a.title,
    category: a.category,
    starts_at: a.starts_at,
    ends_at: a.ends_at,
    lat: a.meeting_lat,
    lng: a.meeting_lng,
    meeting_label: a.meeting_label,
    capacity: a.capacity,
    status: a.status,
    is_demo: a.is_demo,
    series: a.series_id && a.activity_series ? { id: a.series_id, ...a.activity_series, start_time: a.activity_series.start_time.slice(0, 5) } : null,
  }));
  return { places, activities };
}

/** One place with its live offer count and full trust data (for /lugar/[id]). */
export async function loadPlace(id: string): Promise<{ place: PlaceSummary; trust: PlaceTrust | null; citySlug: string } | null> {
  if (!isSupabaseConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const [placeRes, offersRes, trustRes] = await Promise.all([
    supabase.from("places").select(`${PLACE_COLUMNS}, cities(slug)`).eq("id", id).maybeSingle(),
    supabase.from("offers").select("id", { count: "exact", head: true }).eq("place_id", id),
    supabase.rpc("place_trust", { p_place_id: id }),
  ]);
  if (!placeRes.data) return null;
  const { cities, ...row } = placeRes.data as unknown as PlaceRow & { cities: { slug: string } | null };
  return {
    place: toPlaceSummary(row, offersRes.count ?? 0),
    trust: toPlaceTrust(trustRes.data),
    citySlug: cities?.slug ?? "",
  };
}

export type ActivityPageData = Omit<ActivitySummary, "status"> & {
  description: string | null;
  cost_total_cents: number | null;
  split_cost: boolean;
  status: "open" | "full" | "cancelled" | "done";
  creator_id: string;
  approved: number;
  place: { id: string; name: string } | null;
  city: { slug: string; name: string };
};

export async function loadActivity(id: string): Promise<ActivityPageData | null> {
  if (!isSupabaseConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const [actRes, countRes] = await Promise.all([
    supabase
      .from("activities")
      .select(
        "id, title, description, category, starts_at, ends_at, meeting_lat, meeting_lng, meeting_label, capacity, cost_total_cents, split_cost, status, is_demo, creator_id, series_id, activity_series(weekday, start_time, is_official), places(id, name), cities(slug, name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.rpc("approved_count", { p_activity_id: id }),
  ]);
  const a = actRes.data as unknown as
    | (Omit<ActivityPageData, "lat" | "lng" | "approved" | "place" | "city" | "series"> & {
        series_id: string | null;
        activity_series: { weekday: number; start_time: string; is_official: boolean } | null;
        meeting_lat: number;
        meeting_lng: number;
        places: { id: string; name: string } | null;
        cities: { slug: string; name: string };
      })
    | null;
  if (!a) return null;
  const { meeting_lat, meeting_lng, places, cities, series_id, activity_series, ...rest } = a;
  return {
    ...rest,
    series: series_id && activity_series ? { id: series_id, ...activity_series, start_time: activity_series.start_time.slice(0, 5) } : null,
    lat: meeting_lat,
    lng: meeting_lng,
    approved: typeof countRes.data === "number" ? countRes.data : 0,
    place: places,
    city: cities,
  };
}
