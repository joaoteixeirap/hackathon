import "server-only";
import { createClient } from "./supabase/server";

export async function getProfileRating(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("profile_rating", { p_profile_id: profileId }).maybeSingle();
  const row = data as { avg_rating: number | null; review_count: number } | null;
  return { avg: row?.avg_rating != null ? Number(row.avg_rating) : null, count: row?.review_count ?? 0 };
}
