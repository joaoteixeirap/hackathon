import { createClient } from "@supabase/supabase-js";
import type { BrowserContext } from "@playwright/test";
export async function testAccount(context?: BrowserContext, baseURL?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);
  const email = `e2e-${crypto.randomUUID()}@example.com`, password = `Aa1!${crypto.randomUUID()}`;
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const id = created.user.id;
  await admin.from("profiles").update({ verified: true }).eq("id", id);
  const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, options);
  const auth = await client.auth.signInWithPassword({ email, password });
  if (auth.error || !auth.data.session) { await admin.auth.admin.deleteUser(id); throw auth.error ?? new Error("no session"); }
  if (context && baseURL) {
    const name = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
    const value = `base64-${Buffer.from(JSON.stringify(auth.data.session)).toString("base64url")}`;
    const chunks = value.length <= 3180 ? [[name,value]] : Array.from({ length: Math.ceil(value.length/3180) }, (_,i) => [`${name}.${i}`, value.slice(i*3180,(i+1)*3180)]);
    await context.addCookies(chunks.map(([name,value]) => ({ name,value,url:baseURL,sameSite:"Lax" as const })));
  }
  return { id, client, admin, cleanup: async () => { const r = await admin.auth.admin.deleteUser(id); if (r.error) throw r.error; } };
}
