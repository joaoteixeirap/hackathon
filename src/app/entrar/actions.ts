"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth";
import { DEMO_PERSONAS, demoLoginEnabled, isDemoPersona } from "@/lib/demoAccounts";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type SignInState = { status: "idle" | "sent" | "error"; message?: string; email?: string };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function sendMagicLink(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(String(formData.get("next") ?? ""), "/perfil");

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { status: "error", message: "Digite um e-mail válido.", email };
  }
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "Login indisponível: Supabase não configurado.", email };
  }

  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error) {
    const rateLimited = error.status === 429;
    return {
      status: "error",
      message: rateLimited
        ? "Muitas tentativas. Aguarde um minuto e tente de novo."
        : "Não foi possível enviar o link agora. Tente de novo.",
      email,
    };
  }
  return { status: "sent", email };
}

export type DemoLoginState = { status: "idle" | "error"; message?: string };

/**
 * Demo login (SPEC_V2 V0): a safety net when e-mail delivery fails during the pitch.
 * Only when NEXT_PUBLIC_DEMO_LOGIN=true; the password stays on the server; no demo account is admin.
 */
export async function signInAsDemo(persona: string, next: string): Promise<DemoLoginState> {
  const password = process.env.DEMO_LOGIN_PASSWORD;
  if (!demoLoginEnabled() || !password || !isDemoPersona(persona)) {
    return { status: "error", message: "Login de demonstração desativado." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: DEMO_PERSONAS[persona].email, password });
  if (error) return { status: "error", message: "Conta de demonstração indisponível. Rode `pnpm seed:demo`." };
  redirect(safeNext(next, "/perfil"));
}
