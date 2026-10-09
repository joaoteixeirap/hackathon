import { expect,test } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { testAccount } from "../../e2e/account";
if(existsSync(".env.local"))process.loadEnvFile(".env.local");
test.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("completion: OSM emergency survives recompute and only importers can write it",async()=>{
  const u=await testAccount();let place="";
  try {
    const osm_id=`node/test-${crypto.randomUUID()}`,city="00000000-0000-4000-8000-000000000001";
    const p=await u.admin.from("places").insert({city_id:city,name:"Emergency (Test Demo)",osm_id,category:"health",subcategory:"hospital",lat:-23.96,lng:-46.33,is_demo:true}).select("id").single();expect(p.error).toBeNull();place=p.data!.id;
    const args={p_city_id:city,p_rows:[{osm_id,emergency:true}]};
    expect((await u.client.rpc("import_osm_emergency",args)).error?.code).toBe("42501");
    const r=await u.admin.rpc("import_osm_emergency",args);expect(r.error).toBeNull();expect(r.data).toBe(1);
    expect((await u.admin.rpc("recompute_place",{p_place_id:place})).error).toBeNull();
    const row=await u.admin.from("places").select("opening_hours,facts_meta").eq("id",place).single();
    expect(row.data?.opening_hours).toBeNull();expect(row.data?.facts_meta.emergency).toMatchObject({value:true,source:"osm",confirmations_90d:0});
    expect((await u.admin.rpc("import_osm_emergency",{...args,p_rows:[{osm_id,emergency:false}]})).error).toBeNull();
    expect((await u.admin.from("places").select("facts_meta").eq("id",place).single()).data?.facts_meta.emergency.value).toBe(false);
  } finally {if(place)await u.admin.from("places").delete().eq("id",place);await u.cleanup();}
});
test.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("completion: batched compatibility uses the current viewer and exposes counts only",async()=>{
  const u=await testAccount();
  try {
    const id="00000000-0000-4000-8000-0000000000d8";
    const r=await u.client.rpc("activity_compats",{p_activity_ids:[id]});expect(r.error).toBeNull();expect(r.data).toEqual({[id]:null});
    const today=new Date().toLocaleDateString("en-CA",{timeZone:"America/Sao_Paulo"});
    const leave=new Date(Date.parse(`${today}T12:00:00Z`)+30*86400000).toISOString().slice(0,10);
    expect((await u.client.rpc("set_stay",{p_city_id:"00000000-0000-4000-8000-000000000001",p_arrive:today,p_leave:leave,p_audience:"br"})).error).toBeNull();
    const single=await u.client.rpc("activity_compat",{p_activity_id:id});expect(single.error).toBeNull();
    const batch=await u.client.rpc("activity_compats",{p_activity_ids:[id,id,null]});expect(batch.error).toBeNull();
    expect(batch.data).toEqual({[id]:single.data});expect(Object.keys(batch.data[id]).sort()).toEqual(["overlap","same_rhythm"]);
    expect((await u.client.rpc("activity_compats",{p_activity_ids:[]})).data).toEqual({});
    const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false}});
    expect((await anon.rpc("activity_compats",{p_activity_ids:[id]})).error?.code).toBe("42501");
  } finally {await u.cleanup();}
});
