/**
 * SPEC_V2 V3 RLS/RPC tests: stays, tasks and favorites are private; set_stay builds the right
 * checklist and syncs the profile; micro-survey answers are write-only; routine fields are hidden.
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
const run = `v3${Date.now().toString(36)}`;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

type TestUser = { id: string; client: SupabaseClient };

describe.skipIf(!enabled)("V3 stay", () => {
  const service = enabled ? createClient(url, serviceKey, opts) : (null as unknown as SupabaseClient);
  const anon = enabled ? createClient(url, anonKey, opts) : (null as unknown as SupabaseClient);
  let a: TestUser;
  let b: TestUser;

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
    a = await makeUser("a");
    b = await makeUser("b");
  }, 60_000);

  afterAll(async () => {
    await service.from("micro_answers").delete().like("session_id", `${run}%`);
    for (const u of [a, b]) if (u?.id) await service.auth.admin.deleteUser(u.id);
  });

  it("set_stay builds the checklist for the audience and syncs the profile", async () => {
    const { count: allCount } = await anon.from("stay_task_templates").select("id", { count: "exact", head: true }).eq("audience", "all").eq("active", true);
    const { count: foreignCount } = await anon.from("stay_task_templates").select("id", { count: "exact", head: true }).eq("audience", "foreign").eq("active", true);

    const { data: stayId, error } = await a.client.rpc("set_stay", { p_city_id: CITY_ID, p_arrive: "2026-10-09", p_leave: "2026-11-08", p_audience: "foreign" });
    expect(error).toBeNull();
    const { data: tasks } = await a.client.from("stay_tasks").select("title").eq("stay_id", stayId);
    expect(tasks).toHaveLength(allCount! + foreignCount!);
    expect(tasks!.map((t) => t.title)).toContain("Confirmar o seguro-saúde exigido pelo seu visto e guardar a apólice");

    const { data: me } = await a.client.rpc("get_my_profile");
    expect(me).toMatchObject({ current_city_id: CITY_ID, stay_from: "2026-10-09", stay_to: "2026-11-08" });

    // Updating the stay keeps one active stay and does not duplicate tasks.
    expect((await a.client.rpc("set_stay", { p_city_id: CITY_ID, p_arrive: "2026-10-10", p_leave: "2026-11-20", p_audience: "foreign" })).data).toBe(stayId);
    expect((await a.client.from("stay_tasks").select("id").eq("stay_id", stayId)).data).toHaveLength(allCount! + foreignCount!);

    const { data: brStay } = await b.client.rpc("set_stay", { p_city_id: CITY_ID, p_arrive: "2026-10-09", p_leave: "2026-11-08", p_audience: "br" });
    const { data: brTasks } = await b.client.from("stay_tasks").select("id").eq("stay_id", brStay);
    expect(brTasks).toHaveLength(allCount!);
  });

  it("stays, tasks and favorites are invisible to other people", async () => {
    expect((await a.client.from("place_favorites").insert({ user_id: a.id, place_id: DEMO_PLACE })).error).toBeNull();
    expect((await b.client.from("place_favorites").insert({ user_id: a.id, place_id: DEMO_PLACE })).error).not.toBeNull(); // not as someone else

    expect((await b.client.from("stays").select("id").eq("user_id", a.id)).data).toEqual([]);
    expect((await b.client.from("stay_tasks").select("id").eq("user_id", a.id)).data).toEqual([]);
    expect((await b.client.from("place_favorites").select("place_id").eq("user_id", a.id)).data).toEqual([]);
    expect((await anon.from("place_favorites").select("place_id")).data ?? []).toEqual([]);
    expect((await a.client.from("place_favorites").select("place_id")).data).toEqual([{ place_id: DEMO_PLACE }]);

    const { data: someTask } = await a.client.from("stay_tasks").select("id").limit(1).single();
    const hijack = await b.client.from("stay_tasks").update({ done: true }).eq("id", someTask!.id).select("id");
    expect(hijack.data ?? []).toEqual([]);
  });

  it("routine fields are not readable by other people", async () => {
    await a.client.from("profiles").update({ interests: ["surf"], work_rhythm: "morning", discoverable: true }).eq("id", a.id);
    expect((await b.client.from("profiles").select("interests").eq("id", a.id)).error).not.toBeNull();
    expect((await b.client.from("profiles").select("discoverable").eq("id", a.id)).error).not.toBeNull();
  });

  it("micro-survey: anyone answers once per session; only admins read", async () => {
    const answer = (client: SupabaseClient, sid: string) =>
      client.from("micro_answers").insert({ question_key: "q_bet", answer_key: "work", session_id: sid, origin: "espera" });
    expect((await answer(anon, `${run}-s1`)).error).toBeNull();
    expect((await answer(anon, `${run}-s1`)).error?.code).toBe("23505");
    expect((await answer(anon, `${run}-s2`)).error).toBeNull();
    expect((await a.client.from("micro_answers").insert({ question_key: "q_bet", answer_key: "work", session_id: `${run}-s3`, user_id: b.id })).error).not.toBeNull();
    expect((await a.client.from("micro_answers").select("id")).data ?? []).toEqual([]);
  });
});
