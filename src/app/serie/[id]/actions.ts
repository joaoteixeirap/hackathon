"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { ensureUser, getUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { MAP_DATA_TAG } from "@/lib/mapData";
import { joinErrorMessage } from "@/lib/membership";
import { createClient } from "@/lib/supabase/server";

export type SeriesResult = { ok: true } | { ok: false; message: string };
const UUID_RE = /^[0-9a-f-]{36}$/i;

function done(seriesId: string): SeriesResult {
  revalidatePath(`/serie/${seriesId}`);
  revalidateTag(MAP_DATA_TAG);
  return { ok: true };
}

/** S3 "Seguir a série": one request; the creator decides once for all occurrences. */
export async function followSeries(seriesId: string): Promise<SeriesResult> {
  if (!UUID_RE.test(seriesId)) return { ok: false, message: "Série inválida." };
  const user = await ensureUser();
  if (!user) return { ok: false, message: "Não foi possível abrir sua sessão de visitante. Recarregue a página." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("follow_series", { p_series_id: seriesId });
  if (error) return { ok: false, message: /not available/.test(error.message) ? "Esta série não está disponível para você." : joinErrorMessage(error.message) };
  await logEvent("series_follow", { series_id: seriesId });
  return done(seriesId);
}

export async function leaveSeries(seriesId: string): Promise<SeriesResult> {
  if (!UUID_RE.test(seriesId)) return { ok: false, message: "Série inválida." };
  if (!(await getUser())) return { ok: false, message: "Sessão expirada. Recarregue a página." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_series", { p_series_id: seriesId });
  return error ? { ok: false, message: "Não foi possível sair agora." } : done(seriesId);
}

export async function decideSeriesMember(seriesId: string, userId: string, decision: "approved" | "declined"): Promise<SeriesResult> {
  if (!UUID_RE.test(seriesId) || !UUID_RE.test(userId) || !["approved", "declined"].includes(decision)) return { ok: false, message: "Pedido inválido." };
  if (!(await getUser())) return { ok: false, message: "Sessão expirada. Recarregue a página." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_series_member", { p_series_id: seriesId, p_user_id: userId, p_decision: decision });
  return error ? { ok: false, message: joinErrorMessage(error.message) } : done(seriesId);
}
