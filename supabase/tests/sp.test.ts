import {expect,test} from "vitest";
import {existsSync} from "node:fs";
import {createClient} from "@supabase/supabase-js";
import {testAccount} from "../../e2e/account";
if(existsSync(".env.local"))process.loadEnvFile(".env.local");
const enabled=Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),santos="00000000-0000-4000-8000-000000000001";
test.skipIf(!enabled)("SP planning: private RLS, no implicit presence, arrival keeps old budget/tasks and is idempotent",async()=>{
 const a=await testAccount(),b=await testAccount();
 try{
  const city=await a.client.from("cities").select("id").eq("slug","sao-paulo").single();expect(city.error).toBeNull();
  const today=new Date().toLocaleDateString("en-CA",{timeZone:"America/Sao_Paulo"}),leave=new Date(Date.parse(today)+30*86400000).toISOString().slice(0,10);
  const old=await a.client.rpc("set_stay",{p_city_id:santos,p_arrive:today,p_leave:leave,p_audience:"br"});expect(old.error).toBeNull();
  await a.client.from("stay_budgets").insert({stay_id:old.data,monthly_budget_cents:99900});
  const prior=await a.client.rpc("get_my_profile");
  const p=await a.client.from("destination_plans").insert({user_id:a.id,city_id:city.data!.id,date_mode:"flexible",status:"considering",with_children:true,monthly_budget_cents:450000}).select("id").single();expect(p.error).toBeNull();
  expect((await a.client.rpc("get_my_profile")).data).toEqual(prior.data);
  expect((await b.client.from("destination_plans").select("id").eq("id",p.data!.id)).data).toEqual([]);
  expect((await b.client.from("destination_plans").insert({user_id:a.id,city_id:santos,date_mode:"flexible"})).error).not.toBeNull();
  expect((await a.client.from("destination_plans").update({status:"arrived"}).eq("id",p.data!.id)).error).not.toBeNull();
  expect((await b.client.rpc("arrive_destination",{p_plan_id:p.data!.id,p_arrive:today,p_leave:leave})).error?.code).toBe("42501");
  const arr=await a.client.rpc("arrive_destination",{p_plan_id:p.data!.id,p_arrive:today,p_leave:leave});expect(arr.error).toBeNull();expect(arr.data).not.toBe(old.data);
  const repeat=await a.client.rpc("arrive_destination",{p_plan_id:p.data!.id,p_arrive:today,p_leave:leave});expect(repeat.data).toBe(arr.data);
  const profile=await a.client.rpc("get_my_profile");expect(profile.data).toMatchObject({current_city_id:city.data!.id,share_presence:false,discoverable:false,neighborhood:null});
  expect((await a.client.from("stays").select("active").eq("id",old.data).single()).data?.active).toBe(false);
  expect((await a.client.from("stay_budgets").select("monthly_budget_cents").eq("stay_id",old.data).single()).data?.monthly_budget_cents).toBe(99900);
  expect((await a.client.from("stay_budgets").select("monthly_budget_cents").eq("stay_id",arr.data).single()).data?.monthly_budget_cents).toBe(450000);
  expect((await a.client.from("stay_tasks").select("title").eq("stay_id",arr.data).ilike("title","%filhos%")).data).toHaveLength(1);
 }finally{await a.cleanup();await b.cleanup();}
});
test.skipIf(!enabled)("SP communities: verified opt-in, cross-city validation, member chat, blocks both directions, leave revokes access",async()=>{
 const a=await testAccount(),b=await testAccount();
 try{
  const groups=await a.client.rpc("city_community_counts",{p_city_id:santos});expect(groups.error).toBeNull();expect(groups.data).toHaveLength(6);const id=groups.data[0].id;
  expect((await a.client.rpc("join_city_communities",{p_city_id:santos,p_ids:[id],p_muted:true})).error).toBeNull();
  const sent=await a.client.rpc("send_community_message",{p_community_id:id,p_body:"Mensagem de teste (Demo)"});expect(sent.error).toBeNull();expect(sent.data).toMatchObject({user_id:a.id,body:"Mensagem de teste (Demo)"});
  expect((await b.client.from("community_messages").select("id").eq("id",sent.data.id)).data).toEqual([]);
  expect((await b.client.rpc("send_community_message",{p_community_id:id,p_body:"Denied"})).error?.code).toBe("42501");
  expect((await b.client.rpc("join_city_communities",{p_city_id:santos,p_ids:[id]})).error).toBeNull();
  expect((await b.client.from("community_messages").select("id").eq("id",sent.data.id)).data).toHaveLength(1);
  expect((await b.client.from("community_messages").insert({community_id:id,user_id:a.id,body:"Spoof"})).error?.code).toBe("42501");
  expect((await b.client.from("community_members").update({community_id:crypto.randomUUID()}).eq("community_id",id).eq("user_id",b.id)).error?.code).toBe("42501");
  await a.client.from("user_blocks").insert({blocker_id:a.id,blocked_id:b.id});
  expect((await b.client.from("community_messages").select("id").eq("id",sent.data.id)).data).toEqual([]);
  await a.client.from("user_blocks").delete().eq("blocker_id",a.id).eq("blocked_id",b.id);
  await b.client.from("community_members").delete().eq("community_id",id);
  expect((await b.client.from("community_messages").select("id").eq("id",sent.data.id)).data).toEqual([]);
  await b.admin.from("profiles").update({verified:false}).eq("id",b.id);
  expect((await b.client.rpc("join_city_communities",{p_city_id:santos,p_ids:[id]})).error?.code).toBe("42501");
  const sao=await a.client.from("cities").select("id").eq("slug","sao-paulo").single();expect((await a.client.rpc("join_city_communities",{p_city_id:sao.data!.id,p_ids:[id]})).error).not.toBeNull();
  const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false}});expect((await anon.rpc("city_community_counts",{p_city_id:santos})).data).toHaveLength(6);expect((await anon.from("destination_plans").select("id")).error?.code).toBe("42501");
 }finally{await a.cleanup();await b.cleanup();}
});
