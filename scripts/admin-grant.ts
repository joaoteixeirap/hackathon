/**
 * pnpm admin:grant <email> — makes an existing account (signed in once via /entrar) an admin.
 * Uses the service role; run it only from a trusted machine.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const email = process.argv[2]?.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!email || !email.includes("@") || !url || !serviceKey) {
  console.error("Uso: pnpm admin:grant voce@email.com (com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local)");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === email);
    if (user) {
      const { error: e } = await db.from("profiles").update({ role: "admin", verified: true }).eq("id", user.id);
      if (e) throw e;
      console.log(`${email} agora é admin.`);
      return;
    }
    if (data.users.length < 200) break;
  }
  console.error(`Nenhuma conta com ${email}. Entre uma vez em /entrar com esse e-mail e rode de novo.`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
