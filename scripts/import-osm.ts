/**
 * pnpm import:osm <city_slug> [--refresh]
 * Imports real places from OpenStreetMap (Overpass) into `places`, upserting by osm_id.
 * One Overpass request per run; the response is cached in .cache/ for 24 h.
 * Data © OpenStreetMap contributors (ODbL).
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { bboxToOverpass, type BBox } from "../src/lib/geo";
import { buildOverpassQuery, extractSuburbs, toPlace, type OsmElement, type OsmPlace } from "./osm";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const CACHE_TTL_MS = 24 * 3600 * 1000;
const BATCH = 500;

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--")) ?? process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "santos";
const refresh = args.includes("--refresh");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local.");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchOverpass(query: string): Promise<OsmElement[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    const endpoint = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "SoloRota/0.1 (hackathon prototype; import:osm)",
        },
        body: new URLSearchParams({ data: query }),
      });
      if (!res.ok) throw new Error(`Overpass ${res.status} em ${endpoint}`);
      const json = (await res.json()) as { elements: OsmElement[] };
      return json.elements;
    } catch (err) {
      lastError = err;
      const wait = 5000 * 2 ** attempt;
      console.warn(`Falha (${(err as Error).message}). Nova tentativa em ${wait / 1000}s…`);
      await sleep(wait);
    }
  }
  throw lastError;
}

async function main() {
  const { data: city, error } = await db.from("cities").select("id, name, bbox").eq("slug", slug).single();
  if (error || !city) throw new Error(`Cidade "${slug}" não encontrada na tabela cities.`);

  mkdirSync(".cache", { recursive: true });
  const cacheFile = `.cache/osm-${slug}.json`;
  let elements: OsmElement[];
  if (!refresh && existsSync(cacheFile) && Date.now() - statSync(cacheFile).mtimeMs < CACHE_TTL_MS) {
    elements = JSON.parse(readFileSync(cacheFile, "utf8"));
    console.log(`Usando cache ${cacheFile} (${elements.length} elementos).`);
  } else {
    console.log(`Consultando Overpass para ${city.name}…`);
    elements = await fetchOverpass(buildOverpassQuery(bboxToOverpass(city.bbox as BBox)));
    writeFileSync(cacheFile, JSON.stringify(elements));
  }

  const suburbs = extractSuburbs(elements);
  const places = elements.map((e) => toPlace(e, suburbs)).filter((p): p is OsmPlace => p !== null);
  const unique = [...new Map(places.map((p) => [p.osm_id, p])).values()];

  // Do not overwrite partner-claimed places or measured Wi-Fi.
  const { data: existing, error: exErr } = await db
    .from("places")
    .select("osm_id, partner_id, wifi_source")
    .eq("city_id", city.id)
    .not("osm_id", "is", null);
  if (exErr) throw exErr;
  const byOsm = new Map(existing.map((p) => [p.osm_id as string, p]));

  const full: object[] = [];
  const keepWifi: object[] = [];
  let skipped = 0;
  for (const p of unique) {
    const prev = byOsm.get(p.osm_id);
    if (prev?.partner_id) {
      skipped++;
      continue;
    }
    const {emergency:_emergency,...columns}=p;
    void _emergency;
    const row = { ...columns, city_id: city.id };
    if (prev && (prev.wifi_source === "user_test" || prev.wifi_source === "partner")) {
      const { wifi_source: _ignored, ...rest } = row;
      void _ignored;
      keepWifi.push(rest);
    } else {
      full.push(row);
    }
  }

  for (const rows of [full, keepWifi]) {
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error: upErr } = await db.from("places").upsert(rows.slice(i, i + BATCH), { onConflict: "osm_id" });
      if (upErr) throw upErr;
    }
  }

  const emergencyRows=unique.filter(p=>p.category==="health"&&!byOsm.get(p.osm_id)?.partner_id).map(p=>({osm_id:p.osm_id,emergency:p.emergency}));
  if(emergencyRows.length) {
    const {error}=await db.rpc("import_osm_emergency",{p_city_id:city.id,p_rows:emergencyRows});
    if(error)throw error;
  }

  const counts = unique.reduce<Record<string, number>>((acc, p) => ((acc[p.category] = (acc[p.category] ?? 0) + 1), acc), {});
  const withWifi = unique.filter((p) => p.wifi_source).length;
  console.log(`${unique.length} lugares de ${city.name} importados (${skipped} reivindicados por parceiros mantidos).`);
  console.log("Por categoria:", counts);
  console.log(`Com indício de Wi-Fi no OSM: ${withWifi} (${((withWifi / Math.max(unique.length, 1)) * 100).toFixed(1)}%).`);
  console.log(`Bairros de referência: ${suburbs.length}. Dados © OpenStreetMap contributors.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
