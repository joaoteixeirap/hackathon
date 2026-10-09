"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { defaultCitySlug } from "@/lib/cities";
import { parseProfileForm, type ProfileErrors } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = { status: "idle" | "saved" | "error"; errors?: ProfileErrors; message?: string };

export async function updateProfile(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const parsed = parseProfileForm(formData);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/entrar?next=/perfil");

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", auth.user.id);
  if (error) return { status: "error", message: "Não foi possível salvar. Tente de novo." };

  revalidatePath("/perfil");
  return { status: "saved" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Not "/": that route is itself a redirect, which server actions cannot follow.
  redirect(`/mapa/${defaultCitySlug}`);
}
