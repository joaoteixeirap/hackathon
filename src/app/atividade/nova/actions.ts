"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { ensureUser } from "@/lib/auth";
import { parseActivityForm, type ActivityErrors } from "@/lib/activityForm";
import { getCity } from "@/lib/cities";
import { logEvent } from "@/lib/events";
import { MAP_DATA_TAG } from "@/lib/mapData";
import { seriesSlot } from "@/lib/series";
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

  // S3: "Repetir toda semana" creates a weekly series and its next occurrences.
  if (formData.get("repeat") === "on") {
    const d = parsed.data;
    if (d.capacity > 12) return { status: "error", errors: { capacity: "Séries semanais têm de 2 a 12 vagas." } };
    const date = String(formData.get("date"));
    const time = String(formData.get("time"));
    const { data: series, error: seriesError } = await supabase
      .from("activity_series")
      .insert({
        city_id: city.id,
        creator_id: user.id,
        place_id: d.place_id,
        title: d.title,
        description: d.description,
        category: d.category,
        ...seriesSlot(date, time),
        duration_min: Math.round((new Date(d.ends_at).getTime() - new Date(d.starts_at).getTime()) / 60_000),
        meeting_lat: d.meeting_lat,
        meeting_lng: d.meeting_lng,
        meeting_label: d.meeting_label,
        capacity: d.capacity,
      })
      .select("id")
      .single();
    if (seriesError || !series) return { status: "error", message: "Não foi possível criar a série agora. Tente de novo." };
    await supabase.rpc("refresh_series", { p_series_id: series.id });
    revalidateTag(MAP_DATA_TAG);
    await logEvent("series_create", { series_id: series.id, city: city.slug });
    redirect(`/serie/${series.id}?nova=1`);
  }

  const { data, error } = await supabase
    .from("activities")
    .insert({ ...parsed.data, city_id: city.id, creator_id: user.id })
    .select("id")
    .single();

  if (error || !data) {
    return { status: "error", message: "Não foi possível criar a atividade agora. Tente de novo." };
  }
  revalidateTag(MAP_DATA_TAG);
  await logEvent("create_activity", { activity_id: data.id, city: city.slug });
  redirect(`/atividade/${data.id}?nova=1`);
}
