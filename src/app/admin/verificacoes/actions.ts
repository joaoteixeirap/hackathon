"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { VERIFICATION_BUCKET } from "@/lib/verification";

export type DecideResult = { ok: true } | { ok: false; message: string };

/** Admin approves or rejects; the selfie is deleted right after the decision (LGPD). */
export async function decideVerification(userId: string, approve: boolean): Promise<DecideResult> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { ok: false, message: "Pedido inválido." };
  const supabase = await createClient();
  const { data: path, error } = await supabase.rpc("decide_verification", { p_user_id: userId, p_approve: approve });
  if (error || typeof path !== "string") {
    return { ok: false, message: error?.code === "42501" ? "Só admins podem decidir." : "Este pedido já foi decidido." };
  }
  const { error: rmError } = await supabase.storage.from(VERIFICATION_BUCKET).remove([path]);
  revalidatePath("/admin/verificacoes");
  return rmError ? { ok: false, message: "Decisão salva, mas a foto não foi apagada. Apague no Storage." } : { ok: true };
}
