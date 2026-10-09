import "server-only";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";

export type MyProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  home_country: string | null;
  languages: string[] | null;
  role: "nomad" | "partner" | "admin";
  verified: boolean;
  current_city_id: string | null;
  stay_from: string | null;
  stay_to: string | null;
  neighborhood: string | null;
  share_presence: boolean;
  created_at: string;
};

export async function getUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/** Redirects to /entrar when signed out. */
export async function requireUser(next: string) {
  const user = await getUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  return user;
}

export async function getMyProfile(): Promise<MyProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_profile");
  if (error || !data) return null;
  return data as MyProfile;
}

/** Only same-origin relative paths are accepted as post-login destinations. */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
