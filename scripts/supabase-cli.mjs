// Runs the project's Supabase CLI with node directly (no shell), so connection strings are
// passed verbatim on every OS.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../node_modules/supabase/dist/supabase.js", import.meta.url));

export function supabase(args) {
  const res = spawnSync(process.execPath, [CLI, ...args], { stdio: "inherit" });
  return res.status ?? 1;
}
