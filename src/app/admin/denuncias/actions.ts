"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { MAP_DATA_TAG } from "@/lib/mapData";
import { createClient } from "@/lib/supabase/server";

export type ModerationResult = { ok: boolean; message?: string };

const UUID_RE = /^[0-9a-f-]{36}$/i;

/** Admin-only by RLS (reports_admin, messages_delete, activities_update). */
export async function moderate(
  reportId: string,
  action: "resolve" | "reopen" | "delete_message" | "cancel_activity" | "delete_community_message" | "close_community",
  targetId?: string,
): Promise<ModerationResult> {
  if (!UUID_RE.test(reportId) || (targetId && !UUID_RE.test(targetId))) return { ok: false, message: "Pedido inválido." };
  const supabase = await createClient();
  if(action==="delete_community_message"&&targetId){const r=await supabase.from("community_messages").delete().eq("id",targetId).select("id");if(r.error||!r.data?.length)return {ok:false,message:"Não foi possível apagar a mensagem."};}
  if(action==="close_community"&&targetId){const r=await supabase.from("city_communities").update({active:false}).eq("id",targetId).select("id");if(r.error||!r.data?.length)return {ok:false,message:"Não foi possível fechar a comunidade."};revalidatePath("/comunidades");revalidatePath(`/comunidade/${targetId}`);}

  if (action === "delete_message" && targetId) {
    const { data, error } = await supabase.from("messages").delete().eq("id", targetId).select("id");
    if (error || !data?.length) return { ok: false, message: "Não foi possível apagar a mensagem." };
  }
  if (action === "cancel_activity" && targetId) {
    const { data, error } = await supabase.from("activities").update({ status: "cancelled" }).eq("id", targetId).select("id");
    if (error || !data?.length) return { ok: false, message: "Não foi possível cancelar a roda." };
    revalidateTag(MAP_DATA_TAG);
  }

  const { data, error } = await supabase.from("reports").update({ resolved: action !== "reopen" }).eq("id", reportId).select("id");
  revalidatePath("/admin/denuncias");
  return error || !data?.length ? { ok: false, message: "Só admins podem moderar." } : { ok: true };
}
