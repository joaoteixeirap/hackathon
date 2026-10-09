import "server-only";
import type { ActivitySummary, PlaceSummary } from "./places";
import { isSupabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";

const PLACE_COLUMNS =
  "id, name, category, subcategory, lat, lng, neighborhood, address, opening_hours, wifi_mbps, wifi_source, has_power_outlets, quiet_level, price_hint, accepts_without_plan, languages, wheelchair, nomad_seal, featured_until, is_demo";

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

/** Everything the map needs for one city, loaded in one round of parallel queries. */
export async function loadMapData(cityId: string | null): Promise<{
  places: PlaceSummary[];
  activities: ActivitySummary[];
}> {
  if (!cityId || !isSupabaseConfigured()) return { places: [], activities: [] };
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [placesRes, offersRes, activitiesRes] = await Promise.all([
    supabase.from("places").select(PLACE_COLUMNS).eq("city_id", cityId).limit(5000),
    supabase.from("offers").select("place_id, places!inner(city_id)").eq("places.city_id", cityId),
    supabase
      .from("activities")
      .select("id, title, category, starts_at, ends_at, meeting_lat, meeting_lng, meeting_label, capacity, status, is_demo")
      .eq("city_id", cityId)
      .in("status", ["open", "full"])
      .gt("ends_at", nowIso)
      .order("starts_at")
      .limit(500),
  ]);

  const offerCount = new Map<string, number>();
  for (const o of offersRes.data ?? []) offerCount.set(o.place_id, (offerCount.get(o.place_id) ?? 0) + 1);

  const places = ((placesRes.data ?? []) as PlaceRow[]).map((r) => toPlaceSummary(r, offerCount.get(r.id) ?? 0));
  const activities: ActivitySummary[] = (activitiesRes.data ?? []).map((a) => ({
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
  }));
  return { places, activities };
}

/** One place with its live offer count and Wi-Fi test count (for /lugar/[id]). */
export async function loadPlace(id: string): Promise<{ place: PlaceSummary; wifiTests: number; citySlug: string } | null> {
  if (!isSupabaseConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const [placeRes, offersRes, statsRes] = await Promise.all([
    supabase.from("places").select(`${PLACE_COLUMNS}, cities(slug)`).eq("id", id).maybeSingle(),
    supabase.from("offers").select("id", { count: "exact", head: true }).eq("place_id", id),
    supabase.rpc("place_wifi_stats", { p_place_id: id }).maybeSingle(),
  ]);
  if (!placeRes.data) return null;
  const { cities, ...row } = placeRes.data as unknown as PlaceRow & { cities: { slug: string } | null };
  return {
    place: toPlaceSummary(row, offersRes.count ?? 0),
    wifiTests: (statsRes.data as { tests: number } | null)?.tests ?? 0,
    citySlug: cities?.slug ?? "",
  };
}
