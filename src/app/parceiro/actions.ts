"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { ensureUser, getUser } from "@/lib/auth";
import { getCity } from "@/lib/cities";
import { MAP_DATA_TAG } from "@/lib/mapData";
import { parseOfferForm, todayInBrasilia, type OfferErrors } from "@/lib/offers";
import { getMyPartner } from "@/lib/partner";
import { parsePartnerForm, parsePlaceForm, type PartnerErrors, type PlaceErrors } from "@/lib/placeForm";
import { createClient } from "@/lib/supabase/server";

export type FormState<E> = { status: "idle" | "error" | "saved"; errors?: E; message?: string };
export type ActionResult = { ok: true } | { ok: false; message: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION_LOST = "Sessão expirada. Recarregue a página.";

async function approvedPartner() {
  const user = await getUser();
  if (!user) return null;
  const partner = await getMyPartner(user.id);
  return partner?.approved ? partner : null;
}

export async function signUpPartner(_prev: FormState<PartnerErrors>, formData: FormData): Promise<FormState<PartnerErrors>> {
  const parsed = parsePartnerForm(formData);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  const user = await ensureUser();
  if (!user) return { status: "error", message: SESSION_LOST };
  const supabase = await createClient();
  const { error } = await supabase.from("partners").insert({ ...parsed.data, owner_id: user.id });
  if (error?.code === "23505") return { status: "error", message: "Você já tem um negócio cadastrado." };
  if (error) return { status: "error", message: "Não foi possível cadastrar agora. Tente de novo." };
  revalidatePath("/parceiro");
  return { status: "saved" };
}

export async function claimPlace(placeId: string): Promise<ActionResult> {
  if (!UUID_RE.test(placeId)) return { ok: false, message: "Lugar inválido." };
  if (!(await approvedPartner())) return { ok: false, message: "Seu cadastro de parceiro ainda não foi aprovado." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_place", { p_place_id: placeId });
  if (error) return { ok: false, message: /already claimed/.test(error.message) ? "Outro parceiro já gerencia este lugar." : "Não foi possível reivindicar agora." };
  revalidateTag(MAP_DATA_TAG);
  redirect(`/parceiro/lugar/${placeId}`);
}

export async function createPlace(_prev: FormState<PlaceErrors>, formData: FormData): Promise<FormState<PlaceErrors>> {
  const city = await getCity(String(formData.get("city") ?? ""));
  if (!city?.id) return { status: "error", message: "Cidade inválida." };
  const parsed = parsePlaceForm(formData, city.bbox);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  const partner = await approvedPartner();
  if (!partner) return { status: "error", message: "Seu cadastro de parceiro ainda não foi aprovado." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("places")
    .insert({ ...parsed.data, city_id: city.id, partner_id: partner.id })
    .select("id")
    .single();
  if (error || !data) return { status: "error", message: "Não foi possível cadastrar o lugar. Tente de novo." };
  revalidateTag(MAP_DATA_TAG);
  redirect(`/parceiro/lugar/${data.id}?novo=1`);
}

export async function createOffer(placeId: string, _prev: FormState<OfferErrors>, formData: FormData): Promise<FormState<OfferErrors>> {
  if (!UUID_RE.test(placeId)) return { status: "error", message: "Lugar inválido." };
  const parsed = parseOfferForm(formData, todayInBrasilia());
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  if (!(await approvedPartner())) return { status: "error", message: SESSION_LOST };

  const supabase = await createClient();
  const { error } = await supabase.from("offers").insert({ ...parsed.data, place_id: placeId });
  if (error) return { status: "error", message: "Não foi possível criar a oferta. Confira se o lugar é seu." };
  revalidateTag(MAP_DATA_TAG);
  revalidatePath(`/parceiro/lugar/${placeId}`);
  return { status: "saved" };
}

export async function setOfferActive(placeId: string, offerId: string, active: boolean): Promise<ActionResult> {
  if (!UUID_RE.test(placeId) || !UUID_RE.test(offerId)) return { ok: false, message: "Oferta inválida." };
  if (!(await approvedPartner())) return { ok: false, message: SESSION_LOST };
  const supabase = await createClient();
  const { data, error } = await supabase.from("offers").update({ active }).eq("id", offerId).eq("place_id", placeId).select("id");
  if (error || !data?.length) return { ok: false, message: "Não foi possível alterar a oferta." };
  revalidateTag(MAP_DATA_TAG);
  revalidatePath(`/parceiro/lugar/${placeId}`);
  return { ok: true };
}

/** "Destacar no mapa" (simulated charge): 30 days of bigger pin and top of the list. */
export async function featurePlace(placeId: string): Promise<ActionResult> {
  if (!UUID_RE.test(placeId)) return { ok: false, message: "Lugar inválido." };
  if (!(await approvedPartner())) return { ok: false, message: SESSION_LOST };
  const supabase = await createClient();
  const { error } = await supabase.rpc("feature_place", { p_place_id: placeId });
  if (error) return { ok: false, message: "Não foi possível destacar agora." };
  revalidateTag(MAP_DATA_TAG);
  revalidatePath(`/parceiro/lugar/${placeId}`);
  revalidatePath("/parceiro");
  return { ok: true };
}

const STAY_POLICIES = ["free", "min_consumption", "time_limit", "pass_required", "unknown"];

/** R5: the venue declares its stay policy (wins over check-in reports). */
export async function setStayPolicy(placeId: string, _prev: FormState<never>, formData: FormData): Promise<FormState<never>> {
  const policy = String(formData.get("stay_policy") ?? "");
  const note = String(formData.get("stay_note") ?? "").trim();
  if (!UUID_RE.test(placeId) || !STAY_POLICIES.includes(policy)) return { status: "error", message: "Escolha uma opção." };
  if (note.length > 140) return { status: "error", message: "Observação de até 140 caracteres." };
  if (!(await approvedPartner())) return { status: "error", message: SESSION_LOST };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_stay_policy", { p_place_id: placeId, p_policy: policy, p_note: note || null });
  if (error) return { status: "error", message: "Não foi possível salvar a política." };
  revalidateTag(MAP_DATA_TAG);
  revalidatePath(`/parceiro/lugar/${placeId}`);
  revalidatePath(`/lugar/${placeId}`);
  return { status: "saved" };
}
