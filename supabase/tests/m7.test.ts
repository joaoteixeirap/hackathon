/**
 * M7 RLS integration tests: aggregated presence, collaborative Wi-Fi + Selo, moderation.
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
const run = `m7${Date.now().toString(36)}`;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

type TestUser = { id: string; client: SupabaseClient };
type Role = "a" | "b" | "c" | "admin";

describe.skipIf(!enabled)("M7 RLS", () => {
  const service = enabled ? createClient(url, serviceKey, opts) : (null as unknown as SupabaseClient);
  const anon = enabled ? createClient(url, anonKey, opts) : (null as unknown as SupabaseClient);
  const u: Record<Role, TestUser> = {} as never;
  let hood = "";
  let placeId = "";
  let activityId = "";

  async function makeUser(name: Role): Promise<TestUser> {
    const email = `rls-${name}-${run}@example.com`;
    const password = `pw-${run}-${name}-Aa1!`;
    const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: `M7 ${name}` } });
    if (error) throw error;
    await service.from("profiles").update({ verified: true, role: name === "admin" ? "admin" : "nomad" }).eq("id", data.user.id);
    const client = createClient(url, anonKey, opts);
    const { error: e } = await client.auth.signInWithPassword({ email, password });
    if (e) throw e;
    return { id: data.user.id, client };
  }

  beforeAll(async () => {
    for (const r of ["a", "b", "c", "admin"] as Role[]) u[r] = await makeUser(r);
    // A real neighborhood with nobody sharing presence yet.
    const { data: hoods } = await anon.rpc("city_neighborhoods", { p_city_id: CITY_ID });
    const { data: taken } = await anon.rpc("presence_map", { p_city_id: CITY_ID });
    const busy = new Set((taken ?? []).map((t: { neighborhood: string }) => t.neighborhood));
    hood = (hoods as { neighborhood: string }[]).find((h) => !busy.has(h.neighborhood))!.neighborhood;

    const { data: place } = await service
      .from("places")
      .insert({ city_id: CITY_ID, name: `Wi-Fi ${run}`, category: "work", lat: -23.965, lng: -46.333, has_power_outlets: true })
      .select("id")
      .single();
    placeId = place!.id;
    const { data: act } = await service
      .from("activities")
      .insert({
        city_id: CITY_ID, creator_id: u.a.id, title: `M7 ${run}`, category: "meetup",
        starts_at: new Date(Date.now() + 86_400_000).toISOString(), ends_at: new Date(Date.now() + 90_000_000).toISOString(),
        meeting_lat: -23.96, meeting_lng: -46.33, capacity: 4,
      })
      .select("id")
      .single();
    activityId = act!.id;
  }, 60_000);

  afterAll(async () => {
    await service.from("places").delete().eq("id", placeId);
    await service.from("activities").delete().eq("id", activityId);
    await service.from("reports").delete().eq("target_id", activityId);
    for (const x of Object.values(u)) if (x?.id) await service.auth.admin.deleteUser(x.id);
  });

  it("neighborhoods come from mapped places and are public", async () => {
    const { data, error } = await anon.rpc("city_neighborhoods", { p_city_id: CITY_ID });
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(5);
    expect(data[0]).toEqual({ neighborhood: expect.any(String), lat: expect.any(Number), lng: expect.any(Number), places: expect.any(Number) });
  });

  it("presence shows a neighborhood only with 3+ people, at its centroid, with no identities", async () => {
    const share = (x: TestUser) => x.client.from("profiles").update({ current_city_id: CITY_ID, neighborhood: hood, share_presence: true }).eq("id", x.id);
    const spot = async () => ((await anon.rpc("presence_map", { p_city_id: CITY_ID })).data ?? []).find((s: { neighborhood: string }) => s.neighborhood === hood);

    await share(u.a);
    await share(u.b);
    expect(await spot()).toBeUndefined();

    await share(u.c);
    const s = await spot();
    expect(s).toMatchObject({ neighborhood: hood, people: 3 });
    expect(Object.keys(s).sort()).toEqual(["lat", "lng", "neighborhood", "people"]);
    const { data: centroid } = await anon.rpc("city_neighborhoods", { p_city_id: CITY_ID });
    expect(centroid.find((c: { neighborhood: string }) => c.neighborhood === hood)).toMatchObject({ lat: s.lat, lng: s.lng });

    // Opting out drops the count back below the minimum.
    await u.c.client.from("profiles").update({ share_presence: false }).eq("id", u.c.id);
    expect(await spot()).toBeUndefined();
  });

  it("two check-ins from different people set the median, the source and the Selo", async () => {
    const checkin = (x: TestUser, mbps: number) =>
      x.client.rpc("submit_checkin", {
        p: { place_id: placeId, download_mbps: mbps, upload_mbps: 10, ping_ms: 20, jitter_ms: 3, loss_pct: 0, on_venue_wifi: true, near_place: true, outlets_level: "many", noise_level: 4 },
      });
    expect((await checkin(u.a, 30)).error).toBeNull();
    let { data: place } = await anon.from("places").select("wifi_mbps, wifi_source, seal_valid_until").eq("id", placeId).single();
    expect(place).toMatchObject({ wifi_mbps: 30, wifi_source: "user_test", seal_valid_until: null }); // one person is not enough

    expect((await checkin(u.b, 40)).error).toBeNull();
    ({ data: place } = await anon.from("places").select("wifi_mbps, wifi_source, seal_valid_until").eq("id", placeId).single());
    expect(place).toMatchObject({ wifi_mbps: 35, wifi_source: "user_test" });
    expect(new Date(place!.seal_valid_until).getTime()).toBeGreaterThan(Date.now() + 59 * 86_400_000);

    // Users cannot fake the result by writing the place directly.
    const fake = await u.a.client.from("places").update({ wifi_mbps: 999 }).eq("id", placeId).select("id");
    expect(fake.data ?? []).toEqual([]);
  });

  it("only admins read and resolve reports or delete messages", async () => {
    const { error } = await u.b.client
      .from("reports")
      .insert({ reporter_id: u.b.id, target_type: "activity", target_id: activityId, reason: "Golpe ou spam" });
    expect(error).toBeNull();
    expect((await u.b.client.from("reports").select("id").eq("target_id", activityId)).data).toEqual([]); // write-only for users
    const { data: queue } = await u.admin.client.from("reports").select("id, resolved").eq("target_id", activityId);
    expect(queue).toHaveLength(1);

    expect((await u.b.client.from("reports").update({ resolved: true }).eq("target_id", activityId).select("id")).data ?? []).toEqual([]);
    expect((await u.admin.client.from("reports").update({ resolved: true }).eq("id", queue![0].id).select("id")).data).toHaveLength(1);

    const { data: msg } = await u.a.client.from("messages").insert({ activity_id: activityId, user_id: u.a.id, body: "oi" }).select("id").single();
    expect((await u.a.client.from("messages").delete().eq("id", msg!.id).select("id")).data ?? []).toEqual([]);
    expect((await u.admin.client.from("messages").delete().eq("id", msg!.id).select("id")).data).toHaveLength(1);
  });
});
