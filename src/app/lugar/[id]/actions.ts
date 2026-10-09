"use server";

import { ensureUser } from "@/lib/auth";
import { redeemErrorMessage } from "@/lib/offers";
import { createClient } from "@/lib/supabase/server";

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
