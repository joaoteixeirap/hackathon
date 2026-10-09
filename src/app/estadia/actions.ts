"use server";

import { revalidatePath } from "next/cache";
import { ensureUser, getUser } from "@/lib/auth";
import { parseRoutine } from "@/lib/interests";
import { getCityNeighborhoods } from "@/lib/neighborhoods";
import { todayInBrasilia } from "@/lib/offers";
import { parseStayForm, PHASE_ORDER, type Phase } from "@/lib/stay";
import { createClient } from "@/lib/supabase/server";

export type StayFormState = { status: "idle" | "error" | "saved"; message?: string };
export type Result = { ok: true } | { ok: false; message: string };

const UUID_RE = /^[0-9a-f-]{36}$/i;
const SESSION_LOST = "Sessão expirada. Recarregue a página.";

/** E1: create or update the active stay (also syncs the profile and the checklist). */
export async function saveStay(_prev: StayFormState, formData: FormData): Promise<StayFormState> {
  const parsed = parseStayForm(formData, todayInBrasilia());
  if (!parsed.ok) return { status: "error", message: parsed.message };
  const user = await ensureUser();
  if (!user) return { status: "error", message: SESSION_LOST };
  const supabase = await createClient();
  const d = parsed.data;
  const { error } = await supabase.rpc("set_stay", { p_city_id: d.city_id, p_arrive: d.arrive_on, p_leave: d.leave_on, p_audience: d.audience });
  if (error) return { status: "error", message: "Não foi possível salvar a estadia. Tente de novo." };
  // No revalidation here: any revalidatePath in a server action re-renders the current page,
  // which would swap the onboarding (steps 2–3) for the stay view. The client refreshes when
  // done; /perfil is dynamic and needs none.
  return { status: "saved" };
}

export async function endStay(): Promise<Result> {
  if (!(await getUser())) return { ok: false, message: SESSION_LOST };
  const supabase = await createClient();
  const { error } = await supabase.rpc("end_stay");
  if (error) return { ok: false, message: "Não foi possível encerrar." };
  revalidatePath("/estadia");
  return { ok: true };
}

/**
 * S1 mini-onboarding / profile: routine, interests, and the two SEPARATE opt-ins
 * (share_presence and discoverable), both off unless switched on here.
 */
export async function saveRoutine(_prev: StayFormState, formData: FormData): Promise<StayFormState> {
  const parsed = parseRoutine(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };
  const user = await ensureUser();
  if (!user) return { status: "error", message: SESSION_LOST };
  const supabase = await createClient();

  const update: Record<string, unknown> = {
    ...parsed.data,
    discoverable: formData.get("discoverable") === "on",
    share_presence: formData.get("share_presence") === "on",
  };
  const hood = String(formData.get("neighborhood") ?? "").trim();
  if (hood) {
    const { data: me } = await supabase.rpc("get_my_profile");
    const cityId = (me as { current_city_id: string | null } | null)?.current_city_id;
    if (!cityId || !(await getCityNeighborhoods(cityId)).includes(hood)) return { status: "error", message: "Escolha um bairro da lista." };
    update.neighborhood = hood;
  }
  if (update.share_presence && !hood) {
    const { data: me } = await supabase.rpc("get_my_profile");
    if (!(me as { neighborhood: string | null } | null)?.neighborhood) {
      return { status: "error", message: "Para aparecer em \"Quem está aqui\", escolha seu bairro." };
    }
  }
  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) return { status: "error", message: "Não foi possível salvar. Tente de novo." };
  revalidatePath("/estadia");
  revalidatePath("/perfil");
  return { status: "saved" };
}

export async function toggleTask(taskId: string, done: boolean): Promise<Result> {
  if (!UUID_RE.test(taskId)) return { ok: false, message: "Tarefa inválida." };
  if (!(await getUser())) return { ok: false, message: SESSION_LOST };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stay_tasks")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", taskId)
    .select("id");
  if (error || !data?.length) return { ok: false, message: "Não foi possível salvar." };
  revalidatePath("/estadia");
  return { ok: true };
}

export async function addTask(_prev: StayFormState, formData: FormData): Promise<StayFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const phase = String(formData.get("phase") ?? "ongoing") as Phase;
  const due = String(formData.get("due_on") ?? "") || null;
  if (title.length < 2 || title.length > 120) return { status: "error", message: "De 2 a 120 caracteres." };
  if (!PHASE_ORDER.includes(phase)) return { status: "error", message: "Fase inválida." };
  if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return { status: "error", message: "Prazo inválido." };
  const user = await getUser();
  if (!user) return { status: "error", message: SESSION_LOST };
  const supabase = await createClient();
  const { data: stay } = await supabase.from("stays").select("id").eq("user_id", user.id).eq("active", true).maybeSingle();
  if (!stay) return { status: "error", message: "Crie sua estadia primeiro." };
  const { error } = await supabase.from("stay_tasks").insert({ stay_id: stay.id, user_id: user.id, title, phase, due_on: due, area: "work" });
  if (error) return { status: "error", message: "Não foi possível adicionar." };
  revalidatePath("/estadia");
  return { status: "saved" };
}

export async function deleteTask(taskId: string): Promise<Result> {
  if (!UUID_RE.test(taskId)) return { ok: false, message: "Tarefa inválida." };
  if (!(await getUser())) return { ok: false, message: SESSION_LOST };
  const supabase = await createClient();
  const { error } = await supabase.from("stay_tasks").delete().eq("id", taskId);
  if (error) return { ok: false, message: "Não foi possível remover." };
  revalidatePath("/estadia");
  return { ok: true };
}

/** E3: star a place (private). Returns the new state. */
export async function toggleFavorite(placeId: string, on: boolean): Promise<{ ok: true; on: boolean } | { ok: false; message: string }> {
  if (!UUID_RE.test(placeId)) return { ok: false, message: "Lugar inválido." };
  const user = await ensureUser();
  if (!user) return { ok: false, message: SESSION_LOST };
  const supabase = await createClient();
  const { error } = on
    ? await supabase.from("place_favorites").upsert({ user_id: user.id, place_id: placeId })
    : await supabase.from("place_favorites").delete().eq("user_id", user.id).eq("place_id", placeId);
  if (error) return { ok: false, message: "Não foi possível salvar." };
  revalidatePath("/estadia");
  return { ok: true, on };
}

export async function saveFavoriteNote(placeId: string, note: string): Promise<Result> {
  if (!UUID_RE.test(placeId) || note.length > 140) return { ok: false, message: "Nota de até 140 caracteres." };
  const user = await getUser();
  if (!user) return { ok: false, message: SESSION_LOST };
  const supabase = await createClient();
  const { error } = await supabase.from("place_favorites").update({ note: note.trim() || null }).eq("user_id", user.id).eq("place_id", placeId);
  if (error) return { ok: false, message: "Não foi possível salvar." };
  revalidatePath("/estadia");
  return { ok: true };
}

/** S2: block someone (they disappear from your people list and you from theirs). */
export async function blockPerson(userId: string): Promise<Result> {
  if (!UUID_RE.test(userId)) return { ok: false, message: "Pessoa inválida." };
  const user = await getUser();
  if (!user) return { ok: false, message: SESSION_LOST };
  const supabase = await createClient();
  const { error } = await supabase.from("user_blocks").upsert({ blocker_id: user.id, blocked_id: userId });
  if (error) return { ok: false, message: "Não foi possível bloquear." };
  revalidatePath("/estadia");
  return { ok: true };
}
