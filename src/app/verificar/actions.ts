"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type SubmitResult = { ok: true } | { ok: false; message: string };

/** Registers an uploaded selfie for admin review. The file itself was uploaded by the browser into `<uid>/…`. */
export async function submitVerification(filePath: string): Promise<SubmitResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: "Sessão expirada. Recarregue a página." };
  if (!new RegExp(`^${user.id}/[\\w.-]+$`).test(filePath)) return { ok: false, message: "Arquivo inválido." };

  const supabase = await createClient();
  const { error } = await supabase.from("verification_requests").upsert({ user_id: user.id, file_path: filePath, created_at: new Date().toISOString() });
  if (error) return { ok: false, message: "Não foi possível registrar o envio. Tente de novo." };
  revalidatePath("/verificar");
  return { ok: true };
}
