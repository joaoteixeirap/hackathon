/**
 * SPEC_V2 V4 RLS/RPC tests: weekly series (materialization, follow → approve → all future
 * occurrences, capacity), compatibility counts and compatible_people privacy rules.
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
const run = `v4${Date.now().toString(36)}`;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const plusDays = (n: number) => new Date(Date.parse(`${today}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

type TestUser = { id: string; client: SupabaseClient };
type Role = "creator" | "f1" | "f2" | "p1" | "p2" | "p3" | "p4";

describe.skipIf(!enabled)("V4 bonds", () => {
  const service = enabled ? createClient(url, serviceKey, opts) : (null as unknown as SupabaseClient);
  const u: Record<Role, TestUser> = {} as never;
  let seriesId = "";

  async function makeUser(name: Role): Promise<TestUser> {
    const email = `rls-${name}-${run}@example.com`;
    const password = `pw-${run}-${name}-Aa1!`;
    const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: `V4 ${name}` } });
    if (error) throw error;
    await service.from("profiles").update({ verified: true }).eq("id", data.user.id);
    const client = createClient(url, anonKey, opts);
    await client.auth.signInWithPassword({ email, password });
    return { id: data.user.id, client };
  }

  beforeAll(async () => {
    for (const r of ["creator", "f1", "f2", "p1", "p2", "p3", "p4"] as Role[]) u[r] = await makeUser(r);
  }, 90_000);

  afterAll(async () => {
    if (seriesId) await service.from("activities").delete().eq("series_id", seriesId);
    if (seriesId) await service.from("activity_series").delete().eq("id", seriesId);
    for (const x of Object.values(u)) if (x?.id) await service.auth.admin.deleteUser(x.id);
  });

  it("a series materializes 6 future weekly occurrences at the local time; official is admin-only", async () => {
    const { data, error } = await u.creator.client
      .from("activity_series")
      .insert({
        city_id: CITY_ID, creator_id: u.creator.id, title: `Série ${run}`, category: "work_together",
        weekday: 4, start_time: "14:00", duration_min: 180, meeting_lat: -23.96, meeting_lng: -46.33, capacity: 2, is_official: true,
      })
      .select("id, is_official")
      .single();
    expect(error).toBeNull();
    expect(data!.is_official).toBe(false); // forced off for non-admins
    seriesId = data!.id;

    expect((await u.f1.client.rpc("refresh_series", { p_series_id: seriesId })).error).toBeNull();
    const { data: occ } = await service.from("activities").select("starts_at, ends_at").eq("series_id", seriesId).order("starts_at");
    expect(occ).toHaveLength(6);
    for (const o of occ!) {
      const local = new Date(o.starts_at).toLocaleString("en-US", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
      expect(local).toMatch(/^Thu,? 14:00$/);
      expect(Date.parse(o.ends_at) - Date.parse(o.starts_at)).toBe(3 * 3_600_000);
    }
    // Idempotent
    await u.f1.client.rpc("refresh_series", { p_series_id: seriesId });
    expect((await service.from("activities").select("id").eq("series_id", seriesId)).data).toHaveLength(6);
  });

  it("follow → approve once → member of every future occurrence, within capacity", async () => {
    expect((await u.f1.client.rpc("follow_series", { p_series_id: seriesId })).data).toBe("requested");
    expect((await u.f2.client.rpc("follow_series", { p_series_id: seriesId })).data).toBe("requested");
    expect((await u.f1.client.rpc("decide_series_member", { p_series_id: seriesId, p_user_id: u.f1.id, p_decision: "approved" })).error?.code).toBe("42501");

    // Other followers cannot see the queue (and the policy must not recurse).
    const peek = await u.f2.client.from("series_members").select("user_id").eq("series_id", seriesId);
    expect(peek.error).toBeNull();
    expect(peek.data).toEqual([{ user_id: u.f2.id }]);

    expect((await u.creator.client.rpc("decide_series_member", { p_series_id: seriesId, p_user_id: u.f1.id, p_decision: "approved" })).error).toBeNull();
    const { data: occ } = await service.from("activities").select("id").eq("series_id", seriesId);
    const { data: f1rows } = await service.from("activity_members").select("activity_id, status").eq("user_id", u.f1.id).in("activity_id", occ!.map((o) => o.id));
    expect(f1rows).toHaveLength(6);
    expect(f1rows!.every((r) => r.status === "approved")).toBe(true);

    // capacity 2 = creator + f1: f2's approval keeps them out of full occurrences.
    expect((await u.creator.client.rpc("decide_series_member", { p_series_id: seriesId, p_user_id: u.f2.id, p_decision: "approved" })).error).toBeNull();
    expect((await service.from("activity_members").select("activity_id").eq("user_id", u.f2.id).eq("status", "approved").in("activity_id", occ!.map((o) => o.id))).data).toEqual([]);

    // Leaving the series leaves the future occurrences.
    await u.f1.client.rpc("leave_series", { p_series_id: seriesId });
    expect((await service.from("activity_members").select("activity_id").eq("user_id", u.f1.id).eq("status", "approved").in("activity_id", occ!.map((o) => o.id))).data).toEqual([]);
  });

  it("compatible_people: only opt-in, overlapping, unblocked people; requester must opt in too", async () => {
    const stay = (x: TestUser, from: number, to: number) => x.client.rpc("set_stay", { p_city_id: CITY_ID, p_arrive: plusDays(from), p_leave: plusDays(to), p_audience: "br" });
    const profile = (x: TestUser, patch: Record<string, unknown>) => x.client.from("profiles").update(patch).eq("id", x.id);
    const names = async (x: TestUser) => ((await x.client.rpc("compatible_people", { p_city_id: CITY_ID, p_limit: 50 })).data ?? []).map((r: { display_name: string }) => r.display_name);

    await stay(u.p1, 0, 30);
    await stay(u.p2, 5, 40); // overlaps 26 days
    await stay(u.p3, 25, 60); // overlaps 6 days (< 7)
    await stay(u.p4, 0, 30);
    await profile(u.p1, { discoverable: true, interests: ["surf", "coffee"], work_rhythm: "morning" });
    await profile(u.p2, { discoverable: true, interests: ["surf", "tech"], work_rhythm: "morning" });
    await profile(u.p3, { discoverable: true });
    await profile(u.p4, { discoverable: false });

    const response = await u.p1.client.rpc("compatible_people", { p_city_id: CITY_ID, p_limit: 50 });
    expect(response.error).toBeNull();
    const list = response.data as { display_name: string; common_interests: string[]; same_rhythm: boolean; overlap_days: number }[];
    const p2 = list.find((r) => r.display_name === "V4 p2");
    expect(p2).toMatchObject({ common_interests: ["surf"], same_rhythm: true, overlap_days: 26 });
    expect(list.map((r) => r.display_name)).not.toContain("V4 p3"); // short overlap
    expect(list.map((r) => r.display_name)).not.toContain("V4 p4"); // not discoverable
    expect(JSON.stringify(list)).not.toMatch(/neighborhood|stay_from|email/);

    expect(await names(u.p4)).toEqual([]); // requester not discoverable → nothing

    await service.from("profiles").update({ verified: false }).eq("id", u.p2.id);
    expect(await names(u.p1)).not.toContain("V4 p2");
    expect(await names(u.p2)).toEqual([]);
    await service.from("profiles").update({ verified: true }).eq("id", u.p2.id);

    await u.p2.client.from("user_blocks").insert({ blocker_id: u.p2.id, blocked_id: u.p1.id });
    expect(await names(u.p1)).not.toContain("V4 p2"); // blocks work both ways
    expect((await u.p1.client.from("user_blocks").select("blocker_id")).data).toEqual([]); // blocks are private
  });

  it("activity_compat returns counts only, and nothing without an active stay", async () => {
    const { data: occ } = await service.from("activities").select("id").eq("series_id", seriesId).order("starts_at").limit(1).single();
    const res = await u.p1.client.rpc("activity_compat", { p_activity_id: occ!.id });
    expect(res.error).toBeNull();
    expect(Object.keys(res.data).sort()).toEqual(["overlap", "same_rhythm"]);
    expect((await u.f2.client.rpc("activity_compat", { p_activity_id: occ!.id })).data).toBeNull(); // no stay
  });
});
