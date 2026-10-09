/**
 * RLS integration tests against a real Supabase project (local or hosted).
 * Skipped unless NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY are set (loaded from .env.local). Creates throwaway
 * @example.com users and deletes them afterwards.
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
const run = Date.now().toString(36);
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

type TestUser = { id: string; client: SupabaseClient };

describe.skipIf(!enabled)("RLS", () => {
  const admin = enabled ? createClient(url, serviceKey, opts) : (null as unknown as SupabaseClient);
  const anon = enabled ? createClient(url, anonKey, opts) : (null as unknown as SupabaseClient);
  const users: Record<"creator" | "member" | "outsider" | "extra", TestUser> = {} as never;
  let activityId = "";

  async function makeUser(name: string, verified: boolean): Promise<TestUser> {
    const email = `rls-${name}-${run}@example.com`;
    const password = `pw-${run}-${name}-Aa1!`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: `RLS ${name}` },
    });
    if (error) throw error;
    if (verified) {
      const { error: e } = await admin.from("profiles").update({ verified: true }).eq("id", data.user.id);
      if (e) throw e;
    }
    const client = createClient(url, anonKey, opts);
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    return { id: data.user.id, client };
  }

  beforeAll(async () => {
    users.creator = await makeUser("creator", true);
    users.member = await makeUser("member", true);
    users.outsider = await makeUser("outsider", false);
    users.extra = await makeUser("extra", true);
  }, 60_000);

  afterAll(async () => {
    await admin.from("waitlist").delete().eq("email", `rls-${run}@example.com`);
    for (const u of Object.values(users)) if (u?.id) await admin.auth.admin.deleteUser(u.id);
  });

  it("anon reads public tables but not admin-only ones", async () => {
    const { data: cities } = await anon.from("cities").select("slug").eq("id", CITY_ID);
    expect(cities).toHaveLength(1);
    const { data: waitlist } = await anon.from("waitlist").select("id");
    expect(waitlist).toEqual([]);
    const { error } = await anon.from("waitlist").insert({ email: `rls-${run}@example.com` });
    expect(error).toBeNull();
  });

  it("a profile is created on sign-up and users cannot verify themselves", async () => {
    const { client, id } = users.outsider;
    const { data: me } = await client.rpc("get_my_profile");
    expect(me).toMatchObject({ id, verified: false, role: "nomad" });

    const { error } = await client.from("profiles").update({ verified: true }).eq("id", id);
    expect(error?.code).toBe("42501");
    const { error: roleError } = await client.from("profiles").update({ role: "admin" }).eq("id", id);
    expect(roleError?.code).toBe("42501");
  });

  it("private profile columns are hidden from other users", async () => {
    const { error } = await users.member.client
      .from("profiles")
      .select("neighborhood, stay_from")
      .eq("id", users.creator.id);
    expect(error).not.toBeNull();
    const { data } = await users.member.client
      .from("profiles")
      .select("display_name, verified")
      .eq("id", users.creator.id)
      .single();
    expect(data).toMatchObject({ display_name: "RLS creator", verified: true });
  });

  it("only verified users create activities", async () => {
    const base = {
      city_id: CITY_ID,
      title: "RLS test activity",
      category: "meetup",
      starts_at: new Date(Date.now() + 86_400_000).toISOString(),
      ends_at: new Date(Date.now() + 90_000_000).toISOString(),
      meeting_lat: -27.6,
      meeting_lng: -48.55,
      capacity: 2,
    };
    const denied = await users.outsider.client
      .from("activities")
      .insert({ ...base, creator_id: users.outsider.id });
    expect(denied.error).not.toBeNull();

    const spoof = await users.member.client
      .from("activities")
      .insert({ ...base, creator_id: users.creator.id });
    expect(spoof.error).not.toBeNull();

    const ok = await users.creator.client
      .from("activities")
      .insert({ ...base, creator_id: users.creator.id })
      .select("id")
      .single();
    expect(ok.error).toBeNull();
    activityId = ok.data!.id;
  });

  it("join flow: unverified cannot request, creator approves within capacity", async () => {
    const unverified = await users.outsider.client.rpc("request_join", { p_activity_id: activityId });
    expect(unverified.error?.message).toMatch(/verification pending/);

    expect((await users.member.client.rpc("request_join", { p_activity_id: activityId })).data).toBe("requested");
    expect((await users.extra.client.rpc("request_join", { p_activity_id: activityId })).data).toBe("requested");

    // Members cannot approve themselves.
    const self = await users.member.client.rpc("decide_join", {
      p_activity_id: activityId,
      p_user_id: users.member.id,
      p_decision: "approved",
    });
    expect(self.error).not.toBeNull();
    const direct = await users.member.client
      .from("activity_members")
      .update({ status: "approved" })
      .eq("activity_id", activityId)
      .eq("user_id", users.member.id)
      .select();
    expect(direct.data ?? []).toEqual([]);

    const approve = await users.creator.client.rpc("decide_join", {
      p_activity_id: activityId,
      p_user_id: users.member.id,
      p_decision: "approved",
    });
    expect(approve.error).toBeNull();

    // capacity 2 = creator + 1 member: the next approval must fail.
    const overflow = await users.creator.client.rpc("decide_join", {
      p_activity_id: activityId,
      p_user_id: users.extra.id,
      p_decision: "approved",
    });
    expect(overflow.error?.message).toMatch(/full/);

    const { data: act } = await anon.from("activities").select("status").eq("id", activityId).single();
    expect(act?.status).toBe("full");

    // Creator sees the whole queue; a requester sees only their own row.
    const { data: queue } = await users.creator.client
      .from("activity_members")
      .select("user_id")
      .eq("activity_id", activityId);
    expect(queue).toHaveLength(2);
    const { data: own } = await users.extra.client
      .from("activity_members")
      .select("user_id")
      .eq("activity_id", activityId);
    expect(own).toEqual([{ user_id: users.extra.id }]);
  });

  it("chat is limited to the creator and approved members", async () => {
    const send = (u: TestUser, body: string) =>
      u.client.from("messages").insert({ activity_id: activityId, user_id: u.id, body });

    expect((await send(users.creator, "Oi, grupo!")).error).toBeNull();
    expect((await send(users.member, "Oi!")).error).toBeNull();
    expect((await send(users.extra, "Posso entrar?")).error).not.toBeNull();
    expect((await send(users.outsider, "Intruso")).error).not.toBeNull();

    // Impersonation is blocked.
    const spoof = await users.member.client
      .from("messages")
      .insert({ activity_id: activityId, user_id: users.creator.id, body: "fake" });
    expect(spoof.error).not.toBeNull();

    const read = (u: TestUser) => u.client.from("messages").select("body").eq("activity_id", activityId);
    expect((await read(users.member)).data).toHaveLength(2);
    expect((await read(users.extra)).data).toEqual([]);
    expect((await read(users.outsider)).data).toEqual([]);
  });

  it("presence only reports neighborhoods with 3+ people", async () => {
    const hood = `Bairro RLS ${run}`;
    const share = (u: TestUser) =>
      u.client
        .from("profiles")
        .update({ current_city_id: CITY_ID, neighborhood: hood, share_presence: true })
        .eq("id", u.id);

    await share(users.creator);
    await share(users.member);
    const two = await anon.rpc("presence_by_neighborhood", { p_city_id: CITY_ID });
    expect((two.data ?? []).find((r: { neighborhood: string }) => r.neighborhood === hood)).toBeUndefined();

    await share(users.extra);
    const three = await anon.rpc("presence_by_neighborhood", { p_city_id: CITY_ID });
    expect(three.data).toContainEqual({ neighborhood: hood, people: 3 });
  });

  it("wifi tests are rate limited and raw rows stay private", async () => {
    const { data: place } = await anon.from("places").select("id").eq("is_demo", true).limit(1).single();
    const insert = (u: TestUser) =>
      u.client.from("wifi_tests").insert({ place_id: place!.id, user_id: u.id, download_mbps: 50 });

    expect((await insert(users.member)).error).toBeNull();
    expect((await insert(users.member)).error?.message).toMatch(/per hour/);

    const { data: others } = await users.extra.client.from("wifi_tests").select("id").eq("place_id", place!.id);
    expect(others).toEqual([]);
    const { data: stats } = await anon.rpc("place_wifi_stats", { p_place_id: place!.id }).single();
    expect((stats as { tests: number }).tests).toBeGreaterThanOrEqual(3);
  });
});
