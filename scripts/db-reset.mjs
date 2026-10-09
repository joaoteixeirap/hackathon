// pnpm db:reset — applies supabase/migrations and supabase/seed.sql.
// Uses SUPABASE_DB_URL (from .env.local) when set (hosted project); otherwise the local Docker stack.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const dbUrl = process.env.SUPABASE_DB_URL;
const args = ["exec", "supabase", "db", "reset", "--yes"];
if (dbUrl) args.push("--db-url", dbUrl);
else args.push("--local");

console.log(dbUrl ? "Resetting hosted database (SUPABASE_DB_URL)…" : "Resetting local database…");
const res = spawnSync("pnpm", [...args, ...process.argv.slice(2)], { stdio: "inherit", shell: true });
process.exit(res.status ?? 1);
