"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { ensureUser, getUser } from "@/lib/auth";
import { MAP_DATA_TAG } from "@/lib/mapData";
import { joinErrorMessage, REPORT_REASONS } from "@/lib/membership";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; message: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function done(activityId: string, mapChanged = false): ActionResult {
  revalidatePath(`/atividade/${activityId}`);
  if (mapChanged) revalidateTag(MAP_DATA_TAG); // "lotada" shows on the map
  return { ok: true };
}

/** Ask to join (F4). Starts a guest session first when the visitor has none. */
export async function requestJoin(activityId: string): Promise<ActionResult> {
  if (!UUID_RE.test(activityId)) return { ok: false, message: "Roda inválida." };
  const user = await ensureUser();
  if (!user) return { ok: false, message: "Não foi possível abrir sua sessão de visitante. Recarregue a página." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_join", { p_activity_id: activityId });
  return error ? { ok: false, message: joinErrorMessage(error.message) } : done(activityId);
}

/** Cancel a pending request or leave the group. */
export async function leaveActivity(activityId: string): Promise<ActionResult> {
  if (!UUID_RE.test(activityId)) return { ok: false, message: "Roda inválida." };
  if (!(await getUser())) return { ok: false, message: "Sessão expirada. Recarregue a página." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_activity", { p_activity_id: activityId });
  return error ? { ok: false, message: joinErrorMessage(error.message) } : done(activityId, true);
}

/** Creator approves or declines a request; capacity is enforced in the database. */
export async function decideJoin(activityId: string, userId: string, decision: "approved" | "declined"): Promise<ActionResult> {
  if (!UUID_RE.test(activityId) || !UUID_RE.test(userId) || !["approved", "declined"].includes(decision)) {
    return { ok: false, message: "Pedido inválido." };
  }
  if (!(await getUser())) return { ok: false, message: "Sessão expirada. Recarregue a página." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_join", { p_activity_id: activityId, p_user_id: userId, p_decision: decision });
  return error ? { ok: false, message: joinErrorMessage(error.message) } : done(activityId, decision === "approved");
}

/** Post-activity review of another participant (F7). The database checks who may review whom. */
export async function reviewPerson(activityId: string, targetId: string, formData: FormData): Promise<ActionResult> {
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim() || null;
  if (!UUID_RE.test(activityId) || !UUID_RE.test(targetId)) return { ok: false, message: "Avaliação inválida." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, message: "Escolha de 1 a 5 estrelas." };
  if (comment && comment.length > 300) return { ok: false, message: "Comentário de até 300 caracteres." };

  const user = await getUser();
  if (!user) return { ok: false, message: "Sessão expirada. Recarregue a página." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("reviews")
    .insert({ author_id: user.id, target_type: "profile", target_id: targetId, rating, comment });
  if (error?.code === "23505") return { ok: false, message: "Você já avaliou esta pessoa." };
  if (error) return { ok: false, message: "Avaliação liberada só entre participantes, depois da roda." };
  revalidatePath(`/perfil/${targetId}`);
  return done(activityId);
}

/** "Denunciar" (F5/F14): goes to the admin queue; nothing is hidden automatically. */
export async function report(targetType: "message" | "activity" | "profile", targetId: string, reason: string): Promise<ActionResult> {
  if (!["message", "activity", "profile"].includes(targetType) || !UUID_RE.test(targetId)) {
    return { ok: false, message: "Denúncia inválida." };
  }
  if (!(REPORT_REASONS as readonly string[]).includes(reason)) return { ok: false, message: "Escolha um motivo." };
  const user = await ensureUser();
  if (!user) return { ok: false, message: "Sessão expirada. Recarregue a página." };
  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({ reporter_id: user.id, target_type: targetType, target_id: targetId, reason });
  return error ? { ok: false, message: "Não foi possível enviar a denúncia. Tente de novo." } : { ok: true };
}
