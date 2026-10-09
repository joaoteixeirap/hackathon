import "server-only";
import type { BBox } from "./geo";
import { isSupabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";

export type City = {
  id: string | null;
  slug: string;
  name: string;
  state: string;
  center_lat: number;
  center_lng: number;
  zoom: number;
  bbox: BBox;
};

/**
 * Bootstrap values mirroring supabase/seed.sql, used only while the database
 * is not configured (M0) or unreachable. The `cities` table is the source of truth.
 */
const BOOTSTRAP_CITIES: City[] = [
  {
    id: null,
    slug: "santos",
    name: "Santos",
    state: "SP",
    center_lat: -23.964,
    center_lng: -46.329,
    zoom: 13.2,
    bbox: [-46.4, -24.0, -46.29, -23.91],
  },
];

export async function getCity(slug: string): Promise<City | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("cities")
        .select("id, slug, name, state, center_lat, center_lng, zoom, bbox")
        .eq("slug", slug)
        .maybeSingle();
      if (!error) {
        return data ? { ...data, zoom: Number(data.zoom), bbox: data.bbox as BBox } : null;
      }
    } catch {
      // fall through to bootstrap values
    }
  }
  return BOOTSTRAP_CITIES.find((c) => c.slug === slug) ?? null;
}

export const defaultCitySlug = process.env.NEXT_PUBLIC_DEFAULT_CITY || "santos";
