"use server";

import { revalidatePath } from "next/cache";
import { ensureUser } from "@/lib/auth";
import { parseProfileForm, type ProfileErrors } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = { status: "idle" | "saved" | "error"; errors?: ProfileErrors; message?: string };

export async function updateProfile(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const parsed = parseProfileForm(formData);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };

  const user = await ensureUser();
  if (!user) return { status: "error", message: "Não foi possível identificar sua sessão. Recarregue a página." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { status: "error", message: "Não foi possível salvar. Tente de novo." };

  revalidatePath("/perfil");
  return { status: "saved" };
}
