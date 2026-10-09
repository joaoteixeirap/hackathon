/**
 * M5 RLS integration tests: join queue visibility, reviews, reports and verification files.
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
const run = `m5${Date.now().toString(36)}`;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
// 1×1 transparent PNG
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="), (c) => c.charCodeAt(0));

type TestUser = { id: string; client: SupabaseClient };
type Role = "creator" | "member" | "requester" | "outsider" | "admin";

describe.skipIf(!enabled)("M5 RLS", () => {
  const service = enabled ? createClient(url, serviceKey, opts) : (null as unknown as SupabaseClient);
  const u: Record<Role, TestUser> = {} as never;
  let upcomingId = "";
  let pastId = "";

  async function makeUser(name: Role): Promise<TestUser> {
    const email = `rls-${name}-${run}@example.com`;
    const password = `pw-${run}-${name}-Aa1!`;
    const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: `M5 ${name}` } });
    if (error) throw error;
    await service.from("profiles").update({ verified: name !== "outsider", role: name === "admin" ? "admin" : "nomad" }).eq("id", data.user.id);
    const client = createClient(url, anonKey, opts);
    const { error: e } = await client.auth.signInWithPassword({ email, password });
    if (e) throw e;
    return { id: data.user.id, client };
  }

  async function makeActivity(startsInMs: number): Promise<string> {
    const { data, error } = await service
      .from("activities")
      .insert({
        city_id: CITY_ID,
        creator_id: u.creator.id,
        title: `M5 ${run}`,
        category: "meetup",
        starts_at: new Date(Date.now() + startsInMs).toISOString(),
        ends_at: new Date(Date.now() + startsInMs + 3_600_000).toISOString(),
        meeting_lat: -27.6,
        meeting_lng: -48.55,
        capacity: 5,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  }

  beforeAll(async () => {
    for (const r of ["creator", "member", "requester", "outsider", "admin"] as Role[]) u[r] = await makeUser(r);
    upcomingId = await makeActivity(86_400_000);
    pastId = await makeActivity(-3 * 3_600_000);
    await service.from("activity_members").insert([
      { activity_id: upcomingId, user_id: u.member.id, status: "approved" },
      { activity_id: upcomingId, user_id: u.requester.id, status: "requested" },
      { activity_id: pastId, user_id: u.member.id, status: "approved" },
    ]);
  }, 60_000);

  afterAll(async () => {
    await service.from("activities").delete().in("id", [upcomingId, pastId].filter(Boolean));
    for (const x of Object.values(u)) if (x?.id) await service.auth.admin.deleteUser(x.id);
  });

  const people = async (who: TestUser) => {
    const { data, error } = await who.client.rpc("activity_people", { p_activity_id: upcomingId });
    expect(error).toBeNull();
    return (data as { user_id: string; status: string; review_count: number }[]).map((p) => p.status).sort();
  };

  it("creator sees the queue with reputation; members see the group; others see nothing", async () => {
    expect(await people(u.creator)).toEqual(["approved", "creator", "requested"]);
    expect(await people(u.member)).toEqual(["approved", "creator"]);
    expect(await people(u.requester)).toEqual([]);
    expect(await people(u.outsider)).toEqual([]);

    const { data } = await u.creator.client.rpc("activity_people", { p_activity_id: upcomingId });
    expect(data[0]).toHaveProperty("review_count");
    expect(data[0]).not.toHaveProperty("neighborhood");

    const anon = createClient(url, anonKey, opts);
    expect((await anon.rpc("activity_people", { p_activity_id: upcomingId })).error).not.toBeNull();
  });

  it("reviews only between participants and only after the activity ends", async () => {
    const review = (who: TestUser, target: string, rating = 5) =>
      who.client.from("reviews").insert({ author_id: who.id, target_type: "profile", target_id: target, rating });

    // Upcoming activity only: member ↔ requester never shared a finished roda.
    expect((await review(u.member, u.requester.id)).error).not.toBeNull();
    expect((await review(u.outsider, u.creator.id)).error).not.toBeNull();
    expect((await review(u.member, u.member.id)).error).not.toBeNull();

    expect((await review(u.member, u.creator.id, 4)).error).toBeNull();
    expect((await review(u.member, u.creator.id, 5)).error?.code).toBe("23505"); // once per person

    const { data } = await u.outsider.client.rpc("profile_rating", { p_profile_id: u.creator.id }).single();
    expect(data).toMatchObject({ review_count: 1 });
    expect(Number((data as { avg_rating: number }).avg_rating)).toBe(4);
  });

  it("anyone signed in can report; only admins read reports", async () => {
    const { error } = await u.outsider.client
      .from("reports")
      .insert({ reporter_id: u.outsider.id, target_type: "activity", target_id: upcomingId, reason: "Golpe ou spam" });
    expect(error).toBeNull();
    const spoof = await u.outsider.client
      .from("reports")
      .insert({ reporter_id: u.member.id, target_type: "activity", target_id: upcomingId, reason: "Golpe ou spam" });
    expect(spoof.error).not.toBeNull();

    expect((await u.outsider.client.from("reports").select("id").eq("target_id", upcomingId)).data).toEqual([]);
    const { data: seen } = await u.admin.client.from("reports").select("id").eq("target_id", upcomingId);
    expect(seen).toHaveLength(1);
    await service.from("reports").delete().eq("target_id", upcomingId);
  });

  it("verification selfies: own folder only, admin-only reads, decision deletes the request", async () => {
    const bucket = (who: TestUser) => who.client.storage.from("verifications");
    const path = `${u.outsider.id}/${run}.png`;

    expect((await bucket(u.outsider).upload(`${u.member.id}/${run}.png`, PNG, { contentType: "image/png" })).error).not.toBeNull();
    expect((await bucket(u.outsider).upload(path, PNG, { contentType: "image/png" })).error).toBeNull();

    // Requests must point into the user's own folder.
    const bad = await u.outsider.client.from("verification_requests").insert({ user_id: u.outsider.id, file_path: `${u.member.id}/x.png` });
    expect(bad.error).not.toBeNull();
    expect((await u.outsider.client.from("verification_requests").insert({ user_id: u.outsider.id, file_path: path })).error).toBeNull();

    // Nobody but admins can read the file or the queue.
    expect((await bucket(u.outsider).download(path)).error).not.toBeNull();
    expect((await bucket(u.member).createSignedUrl(path, 60)).error).not.toBeNull();
    expect((await u.member.client.from("verification_requests").select("user_id")).data).toEqual([]);
    expect((await bucket(u.admin).createSignedUrl(path, 60)).error).toBeNull();

    // Only admins decide.
    expect((await u.outsider.client.rpc("decide_verification", { p_user_id: u.outsider.id, p_approve: true })).error?.code).toBe("42501");
    const decided = await u.admin.client.rpc("decide_verification", { p_user_id: u.outsider.id, p_approve: true });
    expect(decided.data).toBe(path);
    expect((await bucket(u.admin).remove([path])).error).toBeNull();

    const { data: me } = await u.outsider.client.rpc("get_my_profile");
    expect(me.verified).toBe(true);
    expect((await service.from("verification_requests").select("user_id").eq("user_id", u.outsider.id)).data).toEqual([]);
    expect((await service.storage.from("verifications").list(u.outsider.id)).data).toEqual([]);
  });
});
