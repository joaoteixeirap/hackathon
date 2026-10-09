import "server-only";
import { unstable_cache } from "next/cache";
import { isSupabaseConfigured } from "./supabase/env";
import { createPublicClient } from "./supabase/public";

/**
 * Neighborhood names of a city, derived from mapped places (city_neighborhoods RPC).
 * The profile picks from this list so presence counts group the same spelling (F8).
 */
export async function getCityNeighborhoods(cityId: string): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    return await cached(cityId);
  } catch {
    return [];
  }
}

const cached = unstable_cache(
  async (cityId: string) => {
    const { data, error } = await createPublicClient().rpc("city_neighborhoods", { p_city_id: cityId });
    if (error) throw error;
    return ((data ?? []) as { neighborhood: string }[]).map((n) => n.neighborhood);
  },
  ["city-neighborhoods-v1"],
  { revalidate: 3600, tags: ["neighborhoods"] },
);
