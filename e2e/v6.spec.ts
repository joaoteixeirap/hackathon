import { expect,test } from "@playwright/test";
import { existsSync } from "node:fs";
import { testAccount } from "./account";
if(existsSync(".env.local"))process.loadEnvFile(".env.local");
test("V6: private budget persists, essential links filter the map and city panel opens",async({page,context,baseURL,isMobile})=>{
 test.skip(!isMobile||!process.env.SUPABASE_SERVICE_ROLE_KEY,"Configured phone flow");
 const u=await testAccount(context,baseURL);try {
  const today=new Date().toLocaleDateString("en-CA",{timeZone:"America/Sao_Paulo"});
  const leave=new Date(Date.parse(`${today}T12:00:00Z`)+30*86400000).toISOString().slice(0,10);
  const r=await u.client.rpc("set_stay",{p_city_id:"00000000-0000-4000-8000-000000000001",p_arrive:today,p_leave:leave,p_audience:"foreign"});expect(r.error).toBeNull();
  await page.goto("/estadia?aba=gastos");
  await page.getByLabel("Orçamento mensal (R$)").fill("3000,00");await page.getByRole("button",{name:"Salvar orçamento"}).click();await expect(page.getByText("Orçamento salvo.")).toBeVisible();
  await page.getByRole("combobox",{name:/^Categoria/}).selectOption("food");await page.getByLabel("Valor (R$)").fill("25,50");await page.getByRole("button",{name:"Registrar gasto",exact:true}).click();await expect(page.getByText("Gasto registrado.")).toBeVisible();
  await page.reload();await expect(page.getByText("Gasto registrado: R$ 25,50")).toBeVisible();
  await page.getByRole("link",{name:"Tarefas",exact:true}).click();await page.getByRole("link",{name:"Farmácia",exact:true}).click();await expect(page).toHaveURL(/sub=pharmacy/);await expect(page.getByRole("button",{name:"Limpar filtro de serviços essenciais"})).toBeVisible();
  await page.goto("/cidade/santos");await expect(page.getByRole("heading",{name:"A cidade · Santos"})).toBeVisible();await expect(page.getByRole("heading",{name:"Frescor dos dados de trabalho"})).toBeVisible();
 } finally {await u.cleanup();}
});
