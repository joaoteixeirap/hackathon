"use server";

import { AUDIENCES, cleanUtm, isBlock, type Audience } from "@/lib/analytics";
import { logEvent } from "@/lib/events";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

export type WaitlistState = { status: "idle" | "error" | "done" | "already"; errors?: Partial<Record<"email" | "audience" | "city", string>>; message?: string };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function joinWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const audience = String(formData.get("audience") ?? "") as Audience;
  const city = String(formData.get("city") ?? "").trim().toLowerCase();
  const block = String(formData.get("origin_block") ?? "");
  const errors: WaitlistState["errors"] = {};
  if (!EMAIL_RE.test(email) || email.length > 200) errors.email = "Confira o e-mail.";
  if (!AUDIENCES.includes(audience)) errors.audience = "Escolha uma opção.";
  if (!/^[a-z0-9-]{2,60}$/.test(city)) errors.city = "Escolha uma cidade.";
  if (Object.keys(errors).length > 0) return { status: "error", errors };
  if (!isSupabaseConfigured()) return { status: "error", message: "Cadastro indisponível no momento." };

  const row = {
    email,
    audience,
    city_slug: city,
    origin_block: isBlock(block) ? block : null,
    utm_source: cleanUtm(String(formData.get("utm_source") ?? "")),
    utm_campaign: cleanUtm(String(formData.get("utm_campaign") ?? "")),
  };
  // Anonymous insert (RLS allows insert, never read): no session is created for visitors.
  const { error } = await createPublicClient().from("waitlist").insert(row);
  if (error?.code === "23505") return { status: "already" };
  if (error) return { status: "error", message: "Não foi possível cadastrar agora. Tente de novo." };

  const sid = String(formData.get("sid") ?? "");
  await logEvent("submit_waitlist", {
    ...(sid ? { sid } : {}),
    ...(row.origin_block ? { block: row.origin_block } : {}),
    ...(row.utm_source ? { utm_source: row.utm_source } : {}),
    ...(row.utm_campaign ? { utm_campaign: row.utm_campaign } : {}),
    audience,
  });
  return { status: "done" };
}
