import { expect,test } from "@playwright/test";
import { existsSync } from "node:fs";
import { testAccount } from "./account";
if(existsSync(".env.local"))process.loadEnvFile(".env.local");

test("V7: new pages fit small phones and navigation keeps 44px targets",async({page,context,baseURL,isMobile})=>{
  test.skip(!isMobile||!process.env.SUPABASE_SERVICE_ROLE_KEY,"Configured phone review");
  test.setTimeout(120_000);
  const u=await testAccount(context,baseURL);
  try {
    const today=new Date().toLocaleDateString("en-CA",{timeZone:"America/Sao_Paulo"});
    const leave=new Date(Date.parse(`${today}T12:00:00Z`)+30*86400000).toISOString().slice(0,10);
    expect((await u.client.rpc("set_stay",{p_city_id:"00000000-0000-4000-8000-000000000001",p_arrive:today,p_leave:leave,p_audience:"br"})).error).toBeNull();
    for(const width of [360,375,390]) {
      await page.setViewportSize({width,height:740});
      for(const route of ["/estadia?aba=gastos","/estadia?aba=tarefas","/estadia?aba=pessoas","/cidade/santos","/serie/00000000-0000-4000-8000-0000000000e2","/atividade/00000000-0000-4000-8000-0000000000d8"]) {
        await page.goto(route);
        await expect(page.getByRole("heading",{level:1})).toBeVisible();
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`${width}px ${route}`).toBe(true);
      }
      await page.goto("/estadia?aba=agenda");
      for(const link of await page.getByRole("navigation",{name:"Seções da estadia"}).getByRole("link").all()) {
        const box=await link.boundingBox();expect(box?.height).toBeGreaterThanOrEqual(44);
      }
    }
  } finally {await u.cleanup();}
});
