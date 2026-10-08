import "server-only";
import type { BBox } from "./geo";
import { isSupabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";

export type City = {
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
    slug: "florianopolis",
    name: "Florianópolis",
    state: "SC",
    center_lat: -27.5954,
    center_lng: -48.548,
    zoom: 11.5,
    bbox: [-48.62, -27.85, -48.33, -27.38],
  },
];

export async function getCity(slug: string): Promise<City | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("cities")
        .select("slug, name, state, center_lat, center_lng, zoom, bbox")
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

export const defaultCitySlug = process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "florianopolis";
