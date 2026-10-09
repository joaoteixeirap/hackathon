/**
 * pnpm demo:refresh — run before a demo (no reset, real data untouched):
 * - demo rodas start again tomorrow (same hours and spacing), reopened if needed;
 * - demo profiles' stay covers today (keeps "Quem está aqui" in Gonzaga);
 * - demo offers valid for 30 more days; demo featured place featured for 30 days.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { addDays, DEMO_PROFILE_IDS, localDay, shiftDemoActivities } from "../src/lib/demo";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local.");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

function fail(what: string, error: { message: string } | null) {
  if (error) {
    console.error(`${what}: ${error.message}`);
    process.exit(1);
  }
}

async function main() {
  const today = localDay(new Date());

  const { data: acts, error: actsError } = await db.from("activities").select("id, starts_at, ends_at").eq("is_demo", true);
  fail("Lendo rodas demo", actsError);
  const { shiftDays, rows } = shiftDemoActivities(acts ?? []);
  for (const r of rows) {
    const { error } = await db.from("activities").update({ starts_at: r.starts_at, ends_at: r.ends_at, status: "open" }).eq("id", r.id);
    fail(`Atualizando roda ${r.id}`, error);
  }
  console.log(`Rodas demo: ${rows.length} (${shiftDays === 0 ? "já estavam em dia" : `movidas ${shiftDays} dia(s)`}).`);

  const { error: profError } = await db
    .from("profiles")
    .update({ stay_from: addDays(today, -5), stay_to: addDays(today, 30) })
    .in("id", DEMO_PROFILE_IDS);
  fail("Atualizando perfis demo", profError);
  console.log("Perfis demo: estadia renovada.");

  const { data: demoPlaces } = await db.from("places").select("id").eq("is_demo", true);
  const placeIds = (demoPlaces ?? []).map((p) => p.id);
  const { error: offerError } = await db.from("offers").update({ valid_from: today, valid_to: addDays(today, 30), active: true }).in("place_id", placeIds);
  fail("Atualizando ofertas demo", offerError);
  const { error: featError } = await db
    .from("places")
    .update({ featured_until: new Date(Date.now() + 30 * 86_400_000).toISOString() })
    .in("id", placeIds)
    .not("featured_until", "is", null);
  fail("Renovando destaque demo", featError);
  console.log(`Ofertas e destaque demo renovados (${placeIds.length} lugares demo).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
