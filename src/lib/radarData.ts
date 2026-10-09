import "server-only";
import { unstable_cache } from "next/cache";
import { RADAR_MAX_PLACES } from "@/config/nomad";
import { MAP_DATA_TAG } from "./mapData";
import { toPlaceTrust, type PlaceTrust } from "./placeTrust";
import type { PlaceCategory } from "./places";
import { isSupabaseConfigured } from "./supabase/env";
import { createPublicClient } from "./supabase/public";

/** Work places and cafés with everything the Radar scores and shows (no sponsorship fields, I3). */
export type RadarPlace = PlaceTrust & {
  id: string;
  name: string;
  category: PlaceCategory;
  subcategory: string | null;
  lat: number;
  lng: number;
  neighborhood: string | null;
  opening_hours: string | null;
  is_demo: boolean;
};

const COLUMNS =
  "id, name, category, subcategory, lat, lng, neighborhood, opening_hours, is_demo, wifi_mbps, wifi_source, declared_wifi_mbps, upload_mbps, ping_ms, jitter_ms, loss_pct, outlets_level, has_power_outlets, quiet_level, call_ok_share, stay_policy, stay_note, facts_meta, last_verified_at, distinct_users_90d, seal_valid_until, call_ready_valid_until";

export async function loadRadarPlaces(cityId: string | null): Promise<RadarPlace[]> {
  if (!cityId || !isSupabaseConfigured()) return [];
  try {
    return await cached(cityId);
  } catch {
    return [];
  }
}

const cached = unstable_cache(
  async (cityId: string): Promise<RadarPlace[]> => {
    const { data, error } = await createPublicClient()
      .from("places")
      .select(COLUMNS)
      .eq("city_id", cityId)
      .or("category.eq.work,subcategory.eq.cafe")
      // Verified places first so the cap never drops measured data.
      .order("last_verified_at", { ascending: false, nullsFirst: false })
      .limit(RADAR_MAX_PLACES);
    if (error) throw error;
    return (data ?? []).map((r) => {
      const row = r as unknown as RadarPlace;
      return { ...row, ...toPlaceTrust(r)!, lat: Number(row.lat), lng: Number(row.lng) };
    });
  },
  ["radar-v1"],
  { revalidate: 60, tags: [MAP_DATA_TAG] },
);
