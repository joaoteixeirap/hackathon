"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { ensureUser } from "@/lib/auth";
import { parseCheckin, trustErrorMessage } from "@/lib/checkin";
import { MAP_DATA_TAG } from "@/lib/mapData";
import { redeemErrorMessage } from "@/lib/offers";
import { toPlaceTrust, type PlaceTrust } from "@/lib/placeTrust";
import { createClient } from "@/lib/supabase/server";
import type { FactField } from "@/lib/trust";

export type RedeemResult = { ok: true; code: string; expiresAt: string } | { ok: false; message: string };

/** "Usar oferta" (F11): records the redemption and reveals the code for 10 minutes. */
export async function redeemOffer(offerId: string): Promise<RedeemResult> {
  if (!/^[0-9a-f-]{36}$/i.test(offerId)) return { ok: false, message: "Oferta inválida." };
  const user = await ensureUser();
  if (!user) return { ok: false, message: "Não foi possível abrir sua sessão de visitante. Recarregue a página." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_offer", { p_offer_id: offerId });
  if (error || !data) return { ok: false, message: redeemErrorMessage(error?.message) };
  const r = data as { code: string; expires_at: string };
  return { ok: true, code: r.code, expiresAt: r.expires_at };
}

export type TrustResult = { ok: true; trust: PlaceTrust; helped?: number } | { ok: false; message: string };

function refreshPlace(placeId: string) {
  revalidateTag(MAP_DATA_TAG);
  revalidatePath(`/lugar/${placeId}`);
}

/** Work check-in (SPEC_V2 R1): measurement and/or quick report; the database recomputes the place. */
export async function submitCheckin(input: unknown): Promise<TrustResult> {
  const parsed = parseCheckin(input);
  if (!parsed.ok) return { ok: false, message: parsed.message };
  const user = await ensureUser();
  if (!user) return { ok: false, message: "Não foi possível abrir sua sessão de visitante. Recarregue a página." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_checkin", { p: parsed.data });
  if (error || !data) return { ok: false, message: trustErrorMessage(error?.message) };
  refreshPlace(parsed.data.place_id);
  const trust = toPlaceTrust(data)!;
  const helped = Number((data as { helped?: number }).helped ?? 0);
  return { ok: true, trust, helped };
}

const FIELDS: FactField[] = ["wifi", "outlets", "noise", "calls", "stay_policy", "opening_hours", "languages", "price", "health_info", "offer"];

/** "Confirmar" / "Desatualizado" on one fact (SPEC_V2 T1). */
export async function voteFact(placeId: string, field: FactField, vote: "confirm" | "outdated"): Promise<TrustResult> {
  if (!/^[0-9a-f-]{36}$/i.test(placeId) || !FIELDS.includes(field) || !["confirm", "outdated"].includes(vote)) {
    return { ok: false, message: "Voto inválido." };
  }
  const user = await ensureUser();
  if (!user) return { ok: false, message: "Não foi possível abrir sua sessão de visitante. Recarregue a página." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("vote_fact", { p_place_id: placeId, p_field: field, p_vote: vote });
  if (error || !data) return { ok: false, message: trustErrorMessage(error?.message) };
  refreshPlace(placeId);
  return { ok: true, trust: toPlaceTrust(data)! };
}
