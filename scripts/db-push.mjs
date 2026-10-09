// pnpm db:push — applies pending supabase/migrations to the database in SUPABASE_DB_URL
// (the hosted project). Never resets or deletes data.
import { existsSync } from "node:fs";
import { supabase } from "./supabase-cli.mjs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("Defina SUPABASE_DB_URL em .env.local (Connect → Session pooler).");
  process.exit(1);
}
process.exit(supabase(["db", "push", "--db-url", dbUrl, ...process.argv.slice(2)]));
