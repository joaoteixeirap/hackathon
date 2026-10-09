import "server-only";
import { createClient } from "./supabase/server";
import type { IdleSlot } from "./journey";
import { todayInBrasilia } from "./offers";
export async function getIdleSlots(placeId: string): Promise<IdleSlot[]> {
  const { data } = await (await createClient()).from("place_idle_slots").select("id, weekday, start_time, end_time, seats, note, created_at").eq("place_id", placeId).eq("active", true).order("weekday");
  return (data ?? []) as IdleSlot[];
}
export async function getGroupOffer(placeId: string) {
  const today = todayInBrasilia();
  const { data } = await (await createClient()).from("offers").select("id, title, min_group").eq("place_id", placeId).eq("active", true).not("min_group", "is", null).or(`valid_from.is.null,valid_from.lte.${today}`).or(`valid_to.is.null,valid_to.gte.${today}`).order("created_at").limit(1).maybeSingle();
  return data as { id: string; title: string; min_group: number } | null;
}
