"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { ensureUser } from "@/lib/auth";
import { MAP_DATA_TAG } from "@/lib/mapData";
import { redeemErrorMessage } from "@/lib/offers";
import { createClient } from "@/lib/supabase/server";
import { validWifiResult } from "@/lib/wifi";

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

export type WifiSaveResult =
  | { ok: true; wifi_mbps: number | null; wifi_source: "osm" | "partner" | "user_test" | null; nomad_seal: boolean; tests: number }
  | { ok: false; message: string };

/** Saves a confirmed Wi-Fi test (F12); the database recomputes the median and the Selo. */
export async function saveWifiTest(placeId: string, downloadMbps: number, pingMs: number | null): Promise<WifiSaveResult> {
  if (!/^[0-9a-f-]{36}$/i.test(placeId)) return { ok: false, message: "Lugar inválido." };
  const result = validWifiResult(downloadMbps, pingMs);
  if (!result) return { ok: false, message: "Medição inválida. Tente de novo." };
  const user = await ensureUser();
  if (!user) return { ok: false, message: "Não foi possível abrir sua sessão de visitante. Recarregue a página." };

  const supabase = await createClient();
  const { error } = await supabase.from("wifi_tests").insert({ place_id: placeId, user_id: user.id, ...result });
  if (error) {
    return { ok: false, message: /per hour/.test(error.message) ? "Você já mediu este lugar na última hora." : "Não foi possível salvar a medição." };
  }
  const [{ data: place }, { data: stats }] = await Promise.all([
    supabase.from("places").select("wifi_mbps, wifi_source, nomad_seal").eq("id", placeId).single(),
    supabase.rpc("place_wifi_stats", { p_place_id: placeId }).single(),
  ]);
  revalidateTag(MAP_DATA_TAG);
  revalidatePath(`/lugar/${placeId}`);
  return {
    ok: true,
    wifi_mbps: place?.wifi_mbps == null ? null : Number(place.wifi_mbps),
    wifi_source: place?.wifi_source ?? null,
    nomad_seal: place?.nomad_seal ?? false,
    tests: (stats as { tests: number } | null)?.tests ?? 0,
  };
}
