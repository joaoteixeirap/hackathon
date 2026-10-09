"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "./env";

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Points the Realtime socket at the current session before subscribing. A guest session
 * can start in a server action after the page loaded (e.g. "Pedir para entrar"); without
 * this, Realtime keeps the anon token and RLS hides the rows the user may now read.
 */
export async function syncRealtimeAuth(supabase: SupabaseClient): Promise<void> {
  const { data } = await supabase.auth.getSession();
  await supabase.realtime.setAuth(data.session?.access_token ?? null);
}
