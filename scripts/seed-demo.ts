/**
 * pnpm seed:demo — makes the demo accounts usable in any environment (production included)
 * through the Supabase Admin API, instead of inserting into auth.users with SQL:
 * - creates or updates Ana, Bruno and Parceiro (Demo) with DEMO_LOGIN_PASSWORD;
 * - keeps them verified, non-admin and the partner's business approved.
 * Demo places, offers and activities come from supabase/seed.sql; `pnpm demo:refresh` re-dates them.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { DEMO_PERSONAS } from "../src/lib/demoAccounts";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_LOGIN_PASSWORD;
if (!url || !serviceKey || !password || password.length < 12) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e DEMO_LOGIN_PASSWORD (12+ caracteres) em .env.local.");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  for (const [key, p] of Object.entries(DEMO_PERSONAS)) {
    const attrs = { email: p.email, password: password!, email_confirm: true, user_metadata: { display_name: p.name } };
    const existing = await db.auth.admin.getUserById(p.id);
    const { error } = existing.data.user
      ? await db.auth.admin.updateUserById(p.id, attrs)
      : await db.auth.admin.createUser({ ...attrs, id: p.id });
    if (error) throw new Error(`${key}: ${error.message}`);

    const role = key === "partner" ? "partner" : "nomad"; // never admin
    const { error: profileError } = await db.from("profiles").update({ display_name: p.name, verified: true, role }).eq("id", p.id);
    if (profileError) throw new Error(`${key} profile: ${profileError.message}`);
    console.log(`${p.label}: ${p.email} pronto.`);
  }
  const { error } = await db.from("partners").update({ approved: true }).eq("owner_id", DEMO_PERSONAS.partner.id);
  if (error) throw new Error(`partner business: ${error.message}`);
  console.log("Contas demo prontas. Ative NEXT_PUBLIC_DEMO_LOGIN=true para mostrar os botões de login de demonstração.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
