import { existsSync } from "node:fs";
import { afterAll,beforeAll,describe,expect,it } from "vitest";
import { testAccount } from "../../e2e/account";
if(existsSync(".env.local"))process.loadEnvFile(".env.local");
describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("V6 private expenses and aggregates",()=>{
 const users:Awaited<ReturnType<typeof testAccount>>[]=[];let stay="";
 beforeAll(async()=>{users.push(await testAccount(),await testAccount());const r=await users[0].client.rpc("set_stay",{p_city_id:"00000000-0000-4000-8000-000000000001",p_arrive:"2026-10-09",p_leave:"2026-11-09",p_audience:"br"});expect(r.error).toBeNull();stay=r.data;},60000);
 afterAll(async()=>{for(const u of users)await u.cleanup();});
 it("budgets and expenses are private; other users cannot attach expenses to someone else's stay",async()=>{
  const row={stay_id:stay,user_id:users[0].id,category:"food",amount_cents:1500};
  expect((await users[0].client.from("stay_expenses").insert(row)).error).toBeNull();
  expect((await users[0].client.from("stay_budgets").upsert({stay_id:stay,monthly_budget_cents:300000})).error).toBeNull();
  expect((await users[1].client.from("stay_expenses").select("id").eq("stay_id",stay)).data).toEqual([]);
  expect((await users[1].client.from("stay_budgets").select("stay_id").eq("stay_id",stay)).data).toEqual([]);
  expect((await users[1].client.from("stay_expenses").insert({...row,user_id:users[1].id})).error).not.toBeNull();
  expect((await users[1].client.from("stay_budgets").upsert({stay_id:stay,monthly_budget_cents:0})).error).not.toBeNull();
 });
 it("retention is admin-only and city presence suppresses counts smaller than three",async()=>{
  expect((await users[0].client.rpc("engagement_totals",{p_since:null})).error?.code).toBe("42501");
  const r=await users[0].client.rpc("city_presence_count",{p_city_id:"00000000-0000-4000-8000-ffffffffffff"});
  expect(r.error).toBeNull();expect(r.data).toBeNull();
 });
});
