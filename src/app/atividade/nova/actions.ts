"use server";

import { redirect } from "next/navigation";
import { ensureUser } from "@/lib/auth";
import { parseActivityForm, type ActivityErrors } from "@/lib/activityForm";
import { getCity } from "@/lib/cities";
import { createClient } from "@/lib/supabase/server";

export type CreateActivityState = { status: "idle" | "error"; errors?: ActivityErrors; message?: string };

export async function createActivity(_prev: CreateActivityState, formData: FormData): Promise<CreateActivityState> {
  const city = await getCity(String(formData.get("city") ?? ""));
  if (!city?.id) return { status: "error", message: "Cidade inválida." };

  const parsed = parseActivityForm(formData, { bbox: city.bbox });
  if (!parsed.ok) return { status: "error", errors: parsed.errors };

  const user = await ensureUser();
  if (!user) {
    return { status: "error", message: "Não foi possível abrir sua sessão de visitante. Recarregue a página e tente de novo." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .insert({ ...parsed.data, city_id: city.id, creator_id: user.id })
    .select("id")
    .single();

  if (error || !data) {
    return { status: "error", message: "Não foi possível criar a atividade agora. Tente de novo." };
  }
  redirect(`/atividade/${data.id}?nova=1`);
}
