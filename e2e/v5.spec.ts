import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { testAccount } from "./account";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
test("V5: place to publish without filling fields, then export calendar", async ({ page, context, baseURL, isMobile }) => {
  test.skip(!isMobile || !process.env.SUPABASE_SERVICE_ROLE_KEY, "Configured mobile flow");
  const u=await testAccount(context,baseURL);
  let id="";
  try {
    await page.goto("/lugar/00000000-0000-4000-8000-0000000000c1");
    await page.getByRole("link",{name:"Marcar sessão aqui"}).click();
    await expect(page.getByLabel("O que vamos fazer?")).toHaveValue(/Dia de trabalho no/);
    await expect(page.getByLabel("Início",{exact:true})).toHaveValue("14:00");
    await page.getByRole("button",{name:"Criar roda"}).click();
    await expect(page).toHaveURL(/\/atividade\/[0-9a-f-]{36}/);
    id=page.url().match(/atividade\/([0-9a-f-]{36})/)![1];
    const dl=page.waitForEvent("download");
    await page.getByRole("button",{name:"Adicionar ao calendário"}).click();
    expect((await dl).suggestedFilename()).toBe("solorota.ics");
  } finally {
    if(id) await u.admin.from("activities").delete().eq("id",id);
    else await u.admin.from("activities").delete().eq("creator_id",u.id);
    await u.cleanup();
  }
});

test("V5: group benefit unlocks at four people and issues a ticket", async ({ page, context, baseURL, isMobile }) => {
  test.skip(!isMobile || !process.env.SUPABASE_SERVICE_ROLE_KEY, "Configured mobile flow");
  const accounts: Awaited<ReturnType<typeof testAccount>>[] = [];
  let partner="", place="", offer="", activity="";
  try {
    accounts.push(await testAccount(context,baseURL));
    for(let i=0;i<3;i++) accounts.push(await testAccount());
    const db=accounts[0].admin;
    partner=(await db.from("partners").insert({owner_id:accounts[0].id,business_name:"Group E2E",approved:true}).select("id").single()).data!.id;
    place=(await db.from("places").insert({partner_id:partner,city_id:"00000000-0000-4000-8000-000000000001",name:"Group E2E Demo",category:"work",lat:-23.96,lng:-46.33,is_demo:true}).select("id").single()).data!.id;
    offer=(await db.from("offers").insert({place_id:place,kind:"discount",title:"Café para o grupo",code:"GROUP4",min_group:4}).select("id").single()).data!.id;
    activity=(await db.from("activities").insert({creator_id:accounts[0].id,city_id:"00000000-0000-4000-8000-000000000001",place_id:place,offer_id:offer,title:"Group E2E Demo",category:"work_together",meeting_lat:-23.96,meeting_lng:-46.33,capacity:6,starts_at:new Date(Date.now()+20*60_000).toISOString(),ends_at:new Date(Date.now()+3*3600_000).toISOString(),is_demo:true}).select("id").single()).data!.id;
    await page.goto(`/atividade/${activity}`);
    await expect(page.getByText(/faltam 3/)).toBeVisible();
    await expect(page.getByRole("button",{name:"Usar benefício do grupo"})).toBeDisabled();
    for(let i=1;i<=3;i++) {
      expect((await accounts[i].client.rpc("request_join",{p_activity_id:activity})).error).toBeNull();
      expect((await accounts[0].client.rpc("decide_join",{p_activity_id:activity,p_user_id:accounts[i].id,p_decision:"approved"})).error).toBeNull();
    }
    await page.reload();
    await expect(page.getByRole("button",{name:"Usar benefício do grupo"})).toBeEnabled();
    await page.getByRole("button",{name:"Usar benefício do grupo"}).click();
    await expect(page.getByText("GROUP4",{exact:true})).toBeVisible();
  } finally {
    if(accounts[0]) {
      const db=accounts[0].admin;
      if(offer) await db.from("offer_redemptions").delete().eq("offer_id",offer);
      if(activity) await db.from("activities").delete().eq("id",activity);
      if(place) await db.from("places").delete().eq("id",place);
      if(partner) await db.from("partners").delete().eq("id",partner);
      for(const a of accounts) await a.cleanup();
    }
  }
});
