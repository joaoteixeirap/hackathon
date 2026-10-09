/**
 * SPEC_V2 V1 RLS/RPC tests: anonymous check-ins, cooldown, seals with validity,
 * fact votes (partner self-vote blocked) and place_trust without identities.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const enabled = Boolean(url && anonKey && serviceKey);

const CITY_ID = "00000000-0000-4000-8000-000000000001";
const run = `v1${Date.now().toString(36)}`;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const DAY = 86_400_000;

type TestUser = { id: string; client: SupabaseClient };
type Role = "a" | "b" | "c" | "owner";

describe.skipIf(!enabled)("V1 data and trust", () => {
  const service = enabled ? createClient(url, serviceKey, opts) : (null as unknown as SupabaseClient);
  const anon = enabled ? createClient(url, anonKey, opts) : (null as unknown as SupabaseClient);
  const u: Record<Role, TestUser> = {} as never;
  let placeId = "";
  let ownedPlaceId = "";

  async function makeUser(name: Role): Promise<TestUser> {
    const email = `rls-${name}-${run}@example.com`;
    const password = `pw-${run}-${name}-Aa1!`;
    const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: `V1 ${name}` } });
    if (error) throw error;
    const client = createClient(url, anonKey, opts);
    const { error: e } = await client.auth.signInWithPassword({ email, password });
    if (e) throw e;
    return { id: data.user.id, client };
  }

  const checkin = (x: TestUser, extra: Record<string, unknown> = {}, id = placeId) =>
    x.client.rpc("submit_checkin", {
      p: { place_id: id, download_mbps: 60, upload_mbps: 12, ping_ms: 25, jitter_ms: 4, loss_pct: 0, on_venue_wifi: true, near_place: true, outlets_level: "many", noise_level: 4, call_result: "ok", ...extra },
    });
  const trust = async (id = placeId) => (await anon.rpc("place_trust", { p_place_id: id })).data as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- test reads nested JSON

  beforeAll(async () => {
    for (const r of ["a", "b", "c", "owner"] as Role[]) u[r] = await makeUser(r);
    const { data: p } = await service.from("places").insert({ city_id: CITY_ID, name: `Café V1 ${run}`, category: "eat", subcategory: "cafe", lat: -23.96, lng: -46.33 }).select("id").single();
    placeId = p!.id;
    const { data: partner } = await service.from("partners").insert({ owner_id: u.owner.id, business_name: `V1 ${run}`, approved: true }).select("id").single();
    const { data: owned } = await service.from("places").insert({ city_id: CITY_ID, partner_id: partner!.id, name: `Cowork V1 ${run}`, category: "work", lat: -23.96, lng: -46.33, price_hint: "$$" }).select("id").single();
    ownedPlaceId = owned!.id;
  }, 60_000);

  afterAll(async () => {
    await service.from("places").delete().in("id", [placeId, ownedPlaceId].filter(Boolean));
    for (const x of Object.values(u)) if (x?.id) await service.auth.admin.deleteUser(x.id);
  });

  it("check-ins go through the RPC only, are private to their author and have a 6 h cooldown", async () => {
    const direct = await u.a.client.from("place_checkins").insert({ place_id: placeId, user_id: u.a.id, measured: true, download_mbps: 99 });
    expect(direct.error).not.toBeNull();

    const first = await checkin(u.a);
    expect(first.error).toBeNull();
    expect(first.data).toMatchObject({ wifi_mbps: 60, wifi_source: "user_test" });
    expect(JSON.stringify(first.data)).not.toContain(u.a.id); // no identities in the result

    expect((await checkin(u.a)).error?.message).toMatch(/checkin cooldown/);

    expect((await u.a.client.from("place_checkins").select("id").eq("place_id", placeId)).data).toHaveLength(1);
    expect((await u.b.client.from("place_checkins").select("id").eq("place_id", placeId)).data).toEqual([]);
    expect((await anon.from("place_checkins").select("id").eq("place_id", placeId)).data ?? []).toEqual([]);
  });

  it("a measurement needs the venue Wi-Fi confirmation; health places take no check-ins", async () => {
    expect((await checkin(u.c, { on_venue_wifi: false })).error?.message).toMatch(/confirm venue wifi/);
    const { data: health } = await anon.from("places").select("id").eq("category", "health").limit(1).single();
    expect((await checkin(u.c, {}, health!.id)).error?.message).toMatch(/work places and cafes/);
  });

  it("the Selo needs 2 distinct people (one near the place) and lasts 60 days after the last qualifying check-in", async () => {
    expect((await trust()).seal_valid_until).toBeNull();
    expect((await checkin(u.b, { near_place: false })).error).toBeNull();
    const t = await trust();
    expect(t.distinct_users_90d).toBe(2);
    const until = new Date(t.seal_valid_until).getTime();
    expect(until).toBeGreaterThan(Date.now() + 59 * DAY);
    expect(until).toBeLessThan(Date.now() + 61 * DAY);
    expect(new Date(t.call_ready_valid_until).getTime()).toBeGreaterThan(Date.now()); // 60/12 Mbps, 25 ms, quiet, calls ok
    expect(t.facts_meta.wifi).toMatchObject({ source: "user", confirmations_90d: 2, outdated_30d: 0 });
    expect(t.facts_meta.outlets.source).toBe("user");

    // Simulate time passing: move the check-ins 61 days back and recompute (via a new report).
    await service.from("place_checkins").update({ created_at: new Date(Date.now() - 61 * DAY).toISOString() }).eq("place_id", placeId);
    expect((await checkin(u.c, { download_mbps: null, upload_mbps: null, ping_ms: null, jitter_ms: null, loss_pct: null, on_venue_wifi: false })).error).toBeNull();
    const expired = await trust();
    expect(new Date(expired.seal_valid_until).getTime()).toBeLessThan(Date.now()); // "Selo vencido", with its date
  });

  it("votes: one per person and field every 7 days; partners cannot vote on their own place", async () => {
    const vote = (x: TestUser, field: string, v: string, id = placeId) => x.client.rpc("vote_fact", { p_place_id: id, p_field: field, p_vote: v });

    const before = (await trust()).facts_meta.noise.confirmations_90d;
    expect((await vote(u.a, "noise", "confirm")).error).toBeNull();
    expect((await trust()).facts_meta.noise.confirmations_90d).toBe(before + 1);
    expect((await vote(u.a, "noise", "outdated")).error?.message).toMatch(/vote cooldown/);

    expect((await vote(u.a, "price", "outdated", ownedPlaceId)).error).toBeNull();
    expect((await vote(u.b, "price", "outdated", ownedPlaceId)).error).toBeNull();
    expect((await trust(ownedPlaceId)).facts_meta.price.outdated_30d).toBe(2); // → "Possivelmente desatualizado"

    expect((await vote(u.owner, "price", "confirm", ownedPlaceId)).error?.message).toMatch(/own place/);
    expect((await u.a.client.from("fact_votes").select("id")).data).toEqual([]); // aggregates only
  });
});
