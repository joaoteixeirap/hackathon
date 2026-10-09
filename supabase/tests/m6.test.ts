/**
 * M6 RLS integration tests: partner sign-up, claiming places, offers, redemption and featuring.
 * Same setup as rls.test.ts (skipped without keys; throwaway @example.com users).
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
const DEMO_PLACE = "00000000-0000-4000-8000-0000000000c1";
const run = `m6${Date.now().toString(36)}`;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

type TestUser = { id: string; client: SupabaseClient };
type Role = "owner" | "rival" | "nomad" | "nomad2";

describe.skipIf(!enabled)("M6 RLS", () => {
  const service = enabled ? createClient(url, serviceKey, opts) : (null as unknown as SupabaseClient);
  const anon = enabled ? createClient(url, anonKey, opts) : (null as unknown as SupabaseClient);
  const u: Record<Role, TestUser> = {} as never;
  let partnerApprovalRequired = true;
  let osmPlaceId = "";
  let ownPlaceId = "";
  let offerId = "";
  let tinyOfferId = "";

  async function makeUser(name: Role): Promise<TestUser> {
    const email = `rls-${name}-${run}@example.com`;
    const password = `pw-${run}-${name}-Aa1!`;
    const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: `Nina ${name} Silva` } });
    if (error) throw error;
    await service.from("profiles").update({ verified: true }).eq("id", data.user.id);
    const client = createClient(url, anonKey, opts);
    const { error: e } = await client.auth.signInWithPassword({ email, password });
    if (e) throw e;
    return { id: data.user.id, client };
  }

  beforeAll(async () => {
    for (const r of ["owner", "rival", "nomad", "nomad2"] as Role[]) u[r] = await makeUser(r);
    partnerApprovalRequired = (await anon.rpc("require_partner_approval")).data !== false;
    const { data } = await service
      .from("places")
      .insert({ city_id: CITY_ID, name: `OSM place ${run}`, category: "eat", subcategory: "cafe", lat: -23.96, lng: -46.33, osm_id: `node/${run}` })
      .select("id")
      .single();
    osmPlaceId = data!.id;
  }, 60_000);

  afterAll(async () => {
    await service.from("places").delete().in("id", [osmPlaceId, ownPlaceId].filter(Boolean));
    for (const x of Object.values(u)) if (x?.id) await service.auth.admin.deleteUser(x.id);
  });

  it("partners sign up as themselves, once, and cannot approve themselves", async () => {
    const signUp = (who: TestUser, extra: Record<string, unknown> = {}) =>
      who.client.from("partners").insert({ owner_id: who.id, business_name: `Negócio ${run}`, ...extra }).select("approved, plan").single();

    const ok = await signUp(u.owner, { approved: false, plan: "destaque" });
    expect(ok.error).toBeNull();
    expect(ok.data).toEqual({ approved: !partnerApprovalRequired, plan: "free" });
    expect((await signUp(u.owner)).error).not.toBeNull(); // one per owner
    expect((await u.nomad.client.from("partners").insert({ owner_id: u.owner.id, business_name: "Spoof" })).error).not.toBeNull();

    expect((await signUp(u.rival)).error).toBeNull();
    if (partnerApprovalRequired) {
      await service.from("partners").update({ approved: true }).in("owner_id", [u.owner.id, u.rival.id]);
    }
    const self = await u.owner.client.from("partners").update({ plan: "destaque" }).eq("owner_id", u.owner.id);
    expect(self.error?.code).toBe("42501");
  });

  it("an imported place can be claimed once; demo places cannot", async () => {
    expect((await u.nomad.client.rpc("claim_place", { p_place_id: osmPlaceId })).error).not.toBeNull(); // not a partner
    expect((await u.owner.client.rpc("claim_place", { p_place_id: osmPlaceId })).error).toBeNull();
    expect((await u.rival.client.rpc("claim_place", { p_place_id: osmPlaceId })).error?.message).toMatch(/already claimed/);
    expect((await u.rival.client.rpc("claim_place", { p_place_id: DEMO_PLACE })).error).not.toBeNull();

    // Owners edit their place; others cannot.
    const edit = (who: TestUser) => who.client.from("places").update({ has_power_outlets: true }).eq("id", osmPlaceId).select("id");
    expect((await edit(u.owner)).data).toHaveLength(1);
    expect((await edit(u.rival)).data ?? []).toEqual([]);

    // A partner can also add a brand-new place under their business.
    const { data: partner } = await u.owner.client.from("partners").select("id").eq("owner_id", u.owner.id).single();
    const created = await u.owner.client
      .from("places")
      .insert({ city_id: CITY_ID, partner_id: partner!.id, name: `Novo ${run}`, category: "work", lat: -23.97, lng: -46.32, nomad_seal: true })
      .select("id, nomad_seal, is_demo")
      .single();
    expect(created.error).toBeNull();
    expect(created.data).toMatchObject({ nomad_seal: false, is_demo: false });
    ownPlaceId = created.data!.id;
  });

  it("only the owner creates offers; the code stays hidden from everyone else", async () => {
    const offer = (who: TestUser, extra: Record<string, unknown> = {}) =>
      who.client.from("offers").insert({ place_id: osmPlaceId, kind: "discount", title: `10% off ${run}`, code: "SEGREDO10", ...extra }).select("id").single();

    expect((await offer(u.rival)).error).not.toBeNull();
    const ok = await offer(u.owner);
    expect(ok.error).toBeNull();
    offerId = ok.data!.id;
    tinyOfferId = (await offer(u.owner, { title: `Uma vaga ${run}`, code: "UNICA", capacity: 1 })).data!.id;

    expect((await anon.from("offers").select("title").eq("id", offerId).single()).data).toEqual({ title: `10% off ${run}` });
    expect((await anon.from("offers").select("code").eq("id", offerId)).error).not.toBeNull();
    expect((await u.nomad.client.from("offers").select("code").eq("id", offerId)).error).not.toBeNull();

    expect((await u.rival.client.rpc("partner_offers", { p_place_id: osmPlaceId })).error?.code).toBe("42501");
    const { data } = await u.owner.client.rpc("partner_offers", { p_place_id: osmPlaceId });
    expect(data.map((o: { code: string }) => o.code).sort()).toEqual(["SEGREDO10", "UNICA"]);
  });

  it("redemption: code on redeem, same code inside 10 minutes, once per day, capacity respected", async () => {
    const redeem = (who: TestUser, id = offerId) => who.client.rpc("redeem_offer", { p_offer_id: id });

    const first = await redeem(u.nomad);
    expect(first.error).toBeNull();
    expect(first.data.code).toBe("SEGREDO10");
    expect(new Date(first.data.expires_at).getTime() - new Date(first.data.redeemed_at).getTime()).toBe(600_000);
    expect((await redeem(u.nomad)).data.redeemed_at).toBe(first.data.redeemed_at);

    // After the window closes, the same user cannot redeem again today.
    await service.from("offer_redemptions").update({ created_at: new Date(Date.now() - 11 * 60_000).toISOString() }).eq("offer_id", offerId).eq("user_id", u.nomad.id);
    expect((await redeem(u.nomad)).error?.message).toMatch(/already redeemed today/);

    // Direct inserts are closed: redeem_offer is the only way in.
    expect((await u.nomad2.client.from("offer_redemptions").insert({ offer_id: offerId, user_id: u.nomad2.id })).error).not.toBeNull();

    expect((await redeem(u.nomad, tinyOfferId)).error).toBeNull();
    expect((await redeem(u.nomad2, tinyOfferId)).error?.message).toMatch(/sold out/);

    await u.owner.client.from("offers").update({ active: false }).eq("id", offerId);
    expect((await redeem(u.nomad2)).error?.message).toMatch(/not available/);
  });

  it("partners see who redeemed by first name only", async () => {
    expect((await u.rival.client.rpc("partner_redemptions", { p_place_id: osmPlaceId })).error?.code).toBe("42501");
    const { data } = await u.owner.client.rpc("partner_redemptions", { p_place_id: osmPlaceId });
    expect(data).toHaveLength(2);
    expect(data[0].first_name).toBe("Nina");
    expect(Object.keys(data[0]).sort()).toEqual(["created_at", "first_name", "offer_id", "offer_title", "redeemed_on"]);
  });

  it("featuring is owner-only and lasts 30 days", async () => {
    expect((await u.rival.client.rpc("feature_place", { p_place_id: osmPlaceId })).error?.code).toBe("42501");
    const { data, error } = await u.owner.client.rpc("feature_place", { p_place_id: osmPlaceId });
    expect(error).toBeNull();
    const days = (new Date(data).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    const { data: place } = await anon.from("places").select("featured_until").eq("id", osmPlaceId).single();
    expect(place!.featured_until).not.toBeNull();
    const { data: partner } = await u.owner.client.from("partners").select("plan").eq("owner_id", u.owner.id).single();
    expect(partner!.plan).toBe("destaque");
  });
});
