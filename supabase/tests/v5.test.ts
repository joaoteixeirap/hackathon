import { existsSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { testAccount } from "../../e2e/account";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("V5 group benefit enforcement", () => {
  const users: Awaited<ReturnType<typeof testAccount>>[] = [];
  let partner = "", place = "", offer = "", activity = "";
  beforeAll(async () => {
    for (let i=0;i<5;i++) users.push(await testAccount());
    const db=users[0].admin;
    partner=(await db.from("partners").insert({ owner_id: users[0].id, business_name: "V5 test partner", approved:true }).select("id").single()).data!.id;
    place=(await db.from("places").insert({ partner_id:partner, city_id:"00000000-0000-4000-8000-000000000001",name:"V5 test place",category:"work",lat:-23.96,lng:-46.33,is_demo:true }).select("id").single()).data!.id;
    offer=(await db.from("offers").insert({ place_id:place,kind:"discount",title:"V5 group",code:"TEST4",min_group:4 }).select("id").single()).data!.id;
    activity=(await db.from("activities").insert({ city_id:"00000000-0000-4000-8000-000000000001",creator_id:users[0].id,place_id:place,offer_id:offer,title:"V5 session",category:"work_together",meeting_lat:-23.96,meeting_lng:-46.33,capacity:6,starts_at:new Date(Date.now()+20*60_000).toISOString(),ends_at:new Date(Date.now()+3*3600_000).toISOString(),is_demo:true }).select("id").single()).data!.id;
  },90_000);
  afterAll(async () => {
    if (users[0]) {
      const db=users[0].admin;
      if(offer) await db.from("offer_redemptions").delete().eq("offer_id",offer);
      if(activity) await db.from("activities").delete().eq("id",activity);
      if(place) await db.from("places").delete().eq("id",place);
      if(partner) await db.from("partners").delete().eq("id",partner);
      for(const u of users) await u.cleanup();
    }
  });
  it("rejects direct redemption, outsiders, undersized groups and wrong time window", async () => {
    const redeem=(i:number, id:string|null=activity) => users[i].client.rpc("redeem_offer",{p_offer_id:offer,p_activity_id:id});
    expect((await redeem(0,null)).error?.message).toMatch(/membership/);
    expect((await redeem(4)).error?.message).toMatch(/membership/);
    expect((await redeem(0)).error?.message).toMatch(/too small/);
    for(let i=1;i<=3;i++) {
      expect((await users[i].client.rpc("request_join",{p_activity_id:activity})).error).toBeNull();
      expect((await users[0].client.rpc("decide_join",{p_activity_id:activity,p_user_id:users[i].id,p_decision:"approved"})).error).toBeNull();
    }
    const first=await redeem(1);
    expect(first.error).toBeNull(); expect(first.data.code).toBe("TEST4");
    expect((await redeem(1)).data).toEqual(first.data);
    expect((await users[0].admin.from("offer_redemptions").select("activity_id").eq("offer_id",offer)).data).toEqual([{activity_id:activity}]);
    await users[0].admin.from("activities").update({ starts_at:new Date(Date.now()+2*3600_000).toISOString(),ends_at:new Date(Date.now()+4*3600_000).toISOString() }).eq("id",activity);
    expect((await redeem(2)).error?.message).toMatch(/outside group window/);
  });
  it("idle slots can be written only by the owning partner; metrics are owner-only", async () => {
    const row={place_id:place,weekday:4,start_time:"14:00",end_time:"17:00",seats:6};
    expect((await users[1].client.from("place_idle_slots").insert(row)).error).not.toBeNull();
    expect((await users[0].client.from("place_idle_slots").insert(row)).error).toBeNull();
    expect((await users[1].client.rpc("partner_sessions",{p_place_id:place})).error?.code).toBe("42501");
    const s=await users[0].client.rpc("partner_sessions",{p_place_id:place});
    expect(s.error).toBeNull(); expect(s.data.upcoming[0].people).toBe(4);
    expect(JSON.stringify(s.data)).not.toMatch(/user_id|email/);
  });
});
