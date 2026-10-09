import { createClient } from "@supabase/supabase-js";
import type { BrowserContext } from "@playwright/test";

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const CHUNK = 3180; // @supabase/ssr cookie chunk size

/**
 * Creates a throwaway admin (@example.com) and signs the browser context in by writing the
 * session cookie the way @supabase/ssr does ("base64-" + base64url JSON, chunked).
 * Returns a cleanup function that deletes the user.
 */
export async function signInAsAdmin(context: BrowserContext, baseURL: string): Promise<() => Promise<void>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, opts);
  const email = `e2e-admin-${Date.now().toString(36)}@example.com`;
  const password = `pw-${Date.now()}-Aa1!`;

  const { data: created, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  await service.from("profiles").update({ role: "admin", verified: true }).eq("id", created.user.id);

  const { data, error: signInError } = await createClient(url, anonKey, opts).auth.signInWithPassword({ email, password });
  if (signInError || !data.session) throw signInError ?? new Error("no session");

  const ref = new URL(url).hostname.split(".")[0];
  const name = `sb-${ref}-auth-token`;
  const value = `base64-${Buffer.from(JSON.stringify(data.session)).toString("base64url")}`;
  const chunks = value.length <= CHUNK ? [[name, value]] : Array.from({ length: Math.ceil(value.length / CHUNK) }, (_, i) => [`${name}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK)]);
  await context.addCookies(chunks.map(([n, v]) => ({ name: n, value: v, url: baseURL, sameSite: "Lax" as const })));

  return async () => {
    await service.auth.admin.deleteUser(created.user.id);
  };
}
