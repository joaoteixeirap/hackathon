/**
 * pnpm demo:refresh — run before a demo (no reset, real data untouched):
 * - demo rodas start again tomorrow (same hours and spacing), reopened if needed;
 * - demo profiles' stay covers today (keeps "Quem está aqui" in Gonzaga);
 * - demo offers valid for 30 more days; demo featured place featured for 30 days.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { addDays, DEMO_PROFILE_IDS, localDay, shiftDemoActivities } from "../src/lib/demo";
import { DEMO_CHECKIN_PLACES, demoCheckinRows } from "../src/lib/demoCheckins";
import { DEMO_SERIES } from "../src/lib/demoSeries";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local.");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const CITY = "00000000-0000-4000-8000-000000000001";
const PLACE = "00000000-0000-4000-8000-0000000000c1";
const GROUP_OFFER = "00000000-0000-4000-8000-0000000000f4";
const POST_SESSION = "00000000-0000-4000-8000-0000000000d9";
const GROUP_SESSION = "00000000-0000-4000-8000-0000000000d8";

function fail(what: string, error: { message: string } | null) {
  if (error) {
    console.error(`${what}: ${error.message}`);
    process.exit(1);
  }
}

async function main() {
  const today = localDay(new Date());

  // One-off demo rodas only: series occurrences keep their weekday and are refreshed below.
  const { data: acts, error: actsError } = await db.from("activities").select("id, starts_at, ends_at").eq("is_demo", true).is("series_id", null).neq("id", POST_SESSION).neq("id", GROUP_SESSION);
  fail("Lendo rodas demo", actsError);
  const { shiftDays, rows } = shiftDemoActivities(acts ?? []);
  for (const r of rows) {
    const { error } = await db.from("activities").update({ starts_at: r.starts_at, ends_at: r.ends_at, status: "open" }).eq("id", r.id);
    fail(`Atualizando roda ${r.id}`, error);
  }
  console.log(`Rodas demo: ${rows.length} (${shiftDays === 0 ? "já estavam em dia" : `movidas ${shiftDays} dia(s)`}).`);

  const { error: profError } = await db
    .from("profiles")
    .update({ stay_from: addDays(today, -5), stay_to: addDays(today, 30), current_city_id: CITY,
      neighborhood: "Gonzaga", share_presence: true, discoverable: true, verified: true,
      work_rhythm: "morning", work_style: "mixed", interests: ["coffee", "surf", "deep_work"], social_goals: ["friends", "cowork"] })
    .in("id", DEMO_PROFILE_IDS);
  fail("Atualizando perfis demo", profError);
  console.log("Perfis demo: estadia renovada.");

  const templates = await db.from("stay_task_templates").select("id,title,area,phase,audience,city_id").eq("active",true);
  fail("Lendo modelos",templates.error);
  for (const user_id of DEMO_PROFILE_IDS) {
    const audience = user_id.endsWith("a3") ? "foreign" : "br";
    const existing = await db.from("stays").select("id").eq("user_id",user_id).eq("active",true).maybeSingle();
    fail("Lendo estadia demo",existing.error);
    const payload = { user_id, city_id:CITY, arrive_on:addDays(today,-5), leave_on:addDays(today,30), audience, active:true };
    const result = existing.data
      ? await db.from("stays").update(payload).eq("id",existing.data.id).select("id").single()
      : await db.from("stays").insert(payload).select("id").single();
    fail("Renovando estadia demo",result.error);
    const stay_id=result.data!.id;
    const tasks=await db.from("stay_tasks").select("template_id").eq("stay_id",stay_id);
    fail("Lendo tarefas demo",tasks.error);
    const present=new Set((tasks.data??[]).map(t=>t.template_id));
    const missing=(templates.data??[]).filter(t=>!present.has(t.id) && (!t.city_id||t.city_id===CITY) && (t.audience==="all"||t.audience===audience));
    if(missing.length) fail("Criando tarefas demo",(await db.from("stay_tasks").insert(missing.map(t=>({stay_id,user_id,template_id:t.id,title:t.title,area:t.area,phase:t.phase})))).error);
  }
  fail("Favoritos demo",(await db.from("place_favorites").upsert([{user_id:DEMO_PROFILE_IDS[0],place_id:PLACE},{user_id:DEMO_PROFILE_IDS[0],place_id:"00000000-0000-4000-8000-0000000000c3"}])).error);

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

  fail("Benefício demo",(await db.from("offers").upsert({id:GROUP_OFFER,place_id:PLACE,kind:"day_pass",title:"Passe de grupo com 20% de desconto (Demo)",description:"Benefício fictício, liberado com quatro participantes aprovados.",code:"DEMO4",min_group:4,valid_from:today,valid_to:addDays(today,30),active:true,capacity:null})).error);
  fail("Horários demo",(await db.from("place_idle_slots").upsert([
    {id:"00000000-0000-4000-8000-0000000000f5",place_id:PLACE,weekday:2,start_time:"14:00",end_time:"18:00",seats:6,note:"Horário fictício (Demo)",active:true},
    {id:"00000000-0000-4000-8000-0000000000f6",place_id:PLACE,weekday:4,start_time:"14:00",end_time:"18:00",seats:6,note:"Horário fictício (Demo)",active:true},
  ])).error);

  // Demo check-ins in three freshness states (SPEC_V2 §11), re-dated relative to today.
  const { error: delError } = await db.from("place_checkins").delete().in("place_id", DEMO_CHECKIN_PLACES).in("user_id", DEMO_PROFILE_IDS);
  fail("Limpando check-ins demo", delError);
  const { error: insError } = await db.from("place_checkins").insert(demoCheckinRows());
  fail("Criando check-ins demo", insError);
  for (const id of DEMO_CHECKIN_PLACES) {
    const { error: rcError } = await db.rpc("recompute_place", { p_place_id: id });
    fail(`Recalculando ${id}`, rcError);
  }
  console.log("Check-ins demo: Gonzaga recente (Selo + chamadas), Ponta da Praia há 70 dias, Centro há 120 dias.");

  // Weekly demo series and the official welcome meetup (S3/S5), with their next 6 dates.
  const { error: seriesError } = await db.from("activity_series").upsert(DEMO_SERIES.map((s) => ({ ...s, active: true, offer_id:s.id.endsWith("e2") ? GROUP_OFFER : null })));
  fail("Criando séries demo", seriesError);
  fail("Seguidores demo",(await db.from("series_members").upsert(DEMO_PROFILE_IDS.slice(3).map(user_id=>({series_id:DEMO_SERIES[1].id,user_id,status:"approved"})))).error);
  for (const s of DEMO_SERIES) {
    const { error: rsError } = await db.rpc("refresh_series", { p_series_id: s.id });
    fail(`Datas da série ${s.title}`, rsError);
  }
  console.log(`Séries demo: ${DEMO_SERIES.length} (inclui o encontro oficial de boas-vindas).`);
  fail("Vinculando benefício nas datas existentes",(await db.from("activities").update({offer_id:GROUP_OFFER}).eq("series_id",DEMO_SERIES[1].id).gt("starts_at",new Date().toISOString())).error);
  fail("Sessão de grupo demo",(await db.from("activities").upsert({id:GROUP_SESSION,city_id:CITY,creator_id:DEMO_PROFILE_IDS[0],place_id:PLACE,offer_id:GROUP_OFFER,title:"Passe de grupo liberado (Demo)",description:"Sessão fictícia com quatro pessoas para demonstrar o benefício.",category:"work_together",starts_at:new Date(Date.now()+15*60000).toISOString(),ends_at:new Date(Date.now()+3*3600000).toISOString(),meeting_lat:-23.9655,meeting_lng:-46.3338,meeting_label:"Cowork Demo Gonzaga",capacity:6,is_demo:true,status:"open"})).error);
  fail("Participantes do grupo demo",(await db.from("activity_members").upsert(DEMO_PROFILE_IDS.slice(3).map(user_id=>({activity_id:GROUP_SESSION,user_id,status:"approved"})))).error);

  // A clearly fictional ended session makes the 24h post-session prompt reviewable.
  fail("Pós-sessão demo",(await db.from("activities").upsert({id:POST_SESSION,city_id:CITY,creator_id:DEMO_PROFILE_IDS[0],place_id:PLACE,title:"Trabalho conjunto encerrado (Demo)",description:"Sessão fictícia para demonstrar o relato após a atividade.",category:"work_together",starts_at:new Date(Date.now()-3*3600000).toISOString(),ends_at:new Date(Date.now()-3600000).toISOString(),meeting_lat:-23.9655,meeting_lng:-46.3338,meeting_label:"Cowork Demo Gonzaga",capacity:6,is_demo:true,status:"open"})).error);
  console.log("Estadias, tarefas, favoritos, benefício de grupo, horários e pós-sessão demo prontos.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
