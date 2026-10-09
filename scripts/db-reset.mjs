// pnpm db:reset — WIPES the app tables and re-applies supabase/migrations + supabase/seed.sql.
// Only ever against a local database: it aborts if SUPABASE_DB_URL points anywhere else.
// For the hosted project use `pnpm db:push` (applies pending migrations, keeps data).
import { existsSync } from "node:fs";
import { isLocalDbUrl } from "./db-guard.mjs";
import { supabase } from "./supabase-cli.mjs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const dbUrl = process.env.SUPABASE_DB_URL;
if (dbUrl && !isLocalDbUrl(dbUrl)) {
  console.error(
    "Abortado: SUPABASE_DB_URL aponta para um banco remoto e `pnpm db:reset` apaga os dados.\n" +
      "Para aplicar migrações novas sem apagar nada, use `pnpm db:push`.",
  );
  process.exit(1);
}

const args = ["db", "reset", "--yes", ...(dbUrl ? ["--db-url", dbUrl] : ["--local"])];
console.log("Resetting local database…");
process.exit(supabase([...args, ...process.argv.slice(2)]));
