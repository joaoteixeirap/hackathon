/**
 * SPEC_V2 V2 RPC tests: the venue's stay policy (R5) wins over reports and only the owner sets it.
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
const run = `v2${Date.now().toString(36)}`;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

type TestUser = { id: string; client: SupabaseClient };

describe.skipIf(!enabled)("V2 stay policy", () => {
  const service = enabled ? createClient(url, serviceKey, opts) : (null as unknown as SupabaseClient);
  const anon = enabled ? createClient(url, anonKey, opts) : (null as unknown as SupabaseClient);
  let owner: TestUser;
  let nomad: TestUser;
  let placeId = "";

  async function makeUser(name: string): Promise<TestUser> {
    const email = `rls-${name}-${run}@example.com`;
    const password = `pw-${run}-${name}-Aa1!`;
    const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    const client = createClient(url, anonKey, opts);
    await client.auth.signInWithPassword({ email, password });
    return { id: data.user.id, client };
  }

  beforeAll(async () => {
    owner = await makeUser("owner");
    nomad = await makeUser("nomad");
    const { data: partner } = await service.from("partners").insert({ owner_id: owner.id, business_name: `V2 ${run}`, approved: true }).select("id").single();
    const { data: p } = await service.from("places").insert({ city_id: CITY_ID, partner_id: partner!.id, name: `Cowork V2 ${run}`, category: "work", lat: -23.96, lng: -46.33 }).select("id").single();
    placeId = p!.id;
  }, 60_000);

  afterAll(async () => {
    await service.from("places").delete().eq("id", placeId);
    for (const u of [owner, nomad]) if (u?.id) await service.auth.admin.deleteUser(u.id);
  });

  it("only the owner declares it, and it wins over check-in reports", async () => {
    const set = (u: TestUser, policy: string, note: string | null = null) => u.client.rpc("set_stay_policy", { p_place_id: placeId, p_policy: policy, p_note: note });

    expect((await set(nomad, "free")).error?.code).toBe("42501");
    expect((await nomad.client.from("places").update({ stay_policy: "free" }).eq("id", placeId).select("id")).data ?? []).toEqual([]);

    const { data, error } = await set(owner, "min_consumption", "R$ 15 a cada 2 h");
    expect(error).toBeNull();
    expect(data).toMatchObject({ stay_policy: "min_consumption", stay_note: "R$ 15 a cada 2 h" });
    expect(data.facts_meta.stay_policy.source).toBe("partner");

    // A nomad reports "free"; the venue's rule still wins.
    expect((await nomad.client.rpc("submit_checkin", { p: { place_id: placeId, on_venue_wifi: false, near_place: false, stay_policy: "free" } })).error).toBeNull();
    const { data: after } = await anon.rpc("place_trust", { p_place_id: placeId });
    expect(after).toMatchObject({ stay_policy: "min_consumption" });

    // Withdrawing the declaration falls back to the reports.
    const { data: withdrawn } = await set(owner, "unknown");
    expect(withdrawn).toMatchObject({ stay_policy: "free" });
    expect(withdrawn.facts_meta.stay_policy.source).toBe("user");
  });
});
