import "server-only";
import type { OfferKind } from "./offers";
import type { StayPolicy } from "./placeTrust";
import type { PlaceCategory } from "./places";
import { createClient } from "./supabase/server";

export type MyPartner = { id: string; business_name: string; approved: boolean; plan: "free" | "destaque" };

export type PartnerPlace = {
  id: string;
  name: string;
  category: PlaceCategory;
  subcategory: string | null;
  neighborhood: string | null;
  featured_until: string | null;
  city_id: string;
  stay_policy: StayPolicy;
  stay_note: string | null;
};

export type PartnerOffer = {
  id: string;
  kind: OfferKind;
  title: string;
  description: string | null;
  code: string;
  valid_from: string | null;
  valid_to: string | null;
  capacity: number | null;
  active: boolean;
  created_at: string;
  redemptions: number;
  redemptions_today: number;
};

export type PartnerRedemption = { offer_id: string; offer_title: string; first_name: string; redeemed_on: string; created_at: string };

const PLACE_COLUMNS = "id, name, category, subcategory, neighborhood, featured_until, city_id, stay_policy, stay_note";

export async function getMyPartner(userId: string): Promise<MyPartner | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("partners").select("id, business_name, approved, plan").eq("owner_id", userId).maybeSingle();
  return (data as MyPartner | null) ?? null;
}

export async function getPartnerPlaces(partnerId: string): Promise<PartnerPlace[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("places").select(PLACE_COLUMNS).eq("partner_id", partnerId).order("name");
  return (data ?? []) as PartnerPlace[];
}

/** One of the partner's places with its offers (codes included) and redemptions. */
export async function getPartnerPlace(partnerId: string, placeId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(placeId)) return null;
  const supabase = await createClient();
  const { data: place } = await supabase.from("places").select(PLACE_COLUMNS).eq("id", placeId).eq("partner_id", partnerId).maybeSingle();
  if (!place) return null;
  const [offers, redemptions] = await Promise.all([
    supabase.rpc("partner_offers", { p_place_id: placeId }),
    supabase.rpc("partner_redemptions", { p_place_id: placeId }),
  ]);
  return {
    place: place as PartnerPlace,
    offers: (offers.data ?? []) as PartnerOffer[],
    redemptions: (redemptions.data ?? []) as PartnerRedemption[],
  };
}

/** Imported places nobody manages yet, by name, for "Reivindicar". */
export async function searchClaimablePlaces(cityId: string, q: string): Promise<PartnerPlace[]> {
  const term = q.trim().replace(/[%_,()]/g, " ").slice(0, 60);
  if (term.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("places")
    .select(PLACE_COLUMNS)
    .eq("city_id", cityId)
    .is("partner_id", null)
    .eq("is_demo", false)
    .ilike("name", `%${term}%`)
    .order("name")
    .limit(20);
  return (data ?? []) as PartnerPlace[];
}

export function isFeatured(p: { featured_until: string | null }, now = Date.now()): boolean {
  return p.featured_until != null && new Date(p.featured_until).getTime() > now;
}
