import {expect,test} from "@playwright/test";
import {existsSync} from "node:fs";
import {testAccount} from "./account";
if(existsSync(".env.local"))process.loadEnvFile(".env.local");
test("SP: manual/GPS fallback, state city search and recoverable area/period fetch",async({page,isMobile})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator,"geolocation",{value:{getCurrentPosition(_success:unknown,error:()=>void){error();}},configurable:true});});
 await page.goto("/");await expect(page.getByRole("heading",{name:"Sua próxima cidade começa aqui"})).toBeVisible();
 await page.getByRole("button",{name:"Usar minha localização"}).click();await expect(page.getByText("Não conseguimos usar sua localização. Escolha a cidade manualmente.")).toBeVisible();
 await page.getByLabel("Ou escolha sua cidade").fill("santos");await page.getByRole("link",{name:"Santos",exact:true}).click();
 await expect(page.locator("[data-map-ready=true]")).toBeVisible({timeout:30000});
 if(isMobile)await page.getByRole("button",{name:"Cidades e datas",exact:true}).click();
 await page.getByLabel("Buscar cidade em SP").fill("sao paulo");await page.getByRole("button",{name:"São Paulo",exact:true}).click();
 if(isMobile)await page.getByRole("button",{name:"Cidades e datas",exact:true}).click();
 await expect(page.getByRole("link",{name:"Avaliar esta cidade"})).toHaveAttribute("href","/cidade/sao-paulo");
 await page.getByRole("button",{name:"Escolher datas",exact:true}).click();
 await page.getByLabel("De",{exact:true}).fill("2026-11-01");await page.getByLabel("Até",{exact:true}).fill("2026-11-30");
 await page.getByRole("button",{name:"Buscar nesta área",exact:true}).click();
 await expect(page.getByRole("status").filter({hasText:/Área atualizada|Há mais resultados/})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const res=await page.request.get("/api/mapa-area?bbox=1,1,2,2");expect(res.status()).toBe(400);
});
test("SP: plan a private flexible stay, join a city group, chat and explicitly arrive",async({page,context,baseURL})=>{
 test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY,"Configured database required");const u=await testAccount(context,baseURL);
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto("/estadias/nova?city=sao-paulo");
  await page.getByRole("button",{name:"Datas flexíveis",exact:false}).click();
  await page.getByRole("button",{name:"Próximo",exact:true}).click();
  await page.getByLabel("Seu plano").selectOption("planned");await page.getByLabel("Orçamento mensal em reais (opcional)").fill("4500,00");await page.getByLabel("Vou com filhos",{exact:true}).check();
  await page.getByRole("button",{name:"Salvar estadia",exact:true}).click();await expect(page).toHaveURL(/\/estadias\/[0-9a-f-]+\?saved=1/);
  await expect(page.getByText("Estadia salva. Você pode entrar nas comunidades agora ou decidir depois.")).toBeVisible();
  const plans=await u.client.from("destination_plans").select("id,status,date_mode,monthly_budget_cents").eq("user_id",u.id);expect(plans.data).toHaveLength(1);expect(plans.data![0]).toMatchObject({status:"planned",date_mode:"flexible",monthly_budget_cents:450000});
  expect((await u.client.from("stays").select("id").eq("user_id",u.id).eq("active",true)).data).toEqual([]);
  await page.getByRole("button",{name:"Entrar em 3 comunidades",exact:true}).click();await expect(page.getByText("Participação salva. Abra seus grupos para conversar.")).toBeVisible();
  const group=page.getByRole("link").filter({hasText:"Trabalho remoto e cafés"}).first();await group.click();await expect(page.getByRole("heading",{name:"Trabalho remoto e cafés em São Paulo"})).toBeVisible();
  const body=`Olá, teste temporário (Demo) ${u.id.slice(0,8)}`;await page.getByLabel("Mensagem para a comunidade").fill(body);await page.getByRole("button",{name:"Enviar mensagem",exact:true}).click();await expect(page.getByText(body,{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Silenciar indicadores",exact:true}).click();await expect(page.getByRole("button",{name:"Mostrar mensagens novas",exact:true})).toBeVisible();
  await page.goto(`/estadias/${plans.data![0].id}`);await page.getByText("Já cheguei em São Paulo",{exact:true}).click();await page.getByLabel("Confirmo que já estou nesta cidade").check();await page.getByRole("button",{name:"Confirmar chegada e abrir minha rotina",exact:true}).click();await expect(page).toHaveURL(/\/estadia$/);
  await expect(page.getByRole("region",{name:"Progresso da estadia"})).toContainText("São Paulo");expect((await u.client.rpc("get_my_profile")).data).toMatchObject({share_presence:false,discoverable:false});
  await page.goto("/");await expect(page).toHaveURL(/\/mapa\/sp\?city=sao-paulo$/);
  expect(errors).toEqual([]);
 }finally{await u.cleanup();}
});
test("SP: GPS identifies Santos without saving coordinates or enabling presence",async({page,context})=>{
 await context.grantPermissions(["geolocation"]);await context.setGeolocation({latitude:-23.964,longitude:-46.329});
 const analytics:string[]=[];page.on("request",r=>{if(r.url().includes("/api/eventos"))analytics.push(r.postData()??"");});
 await page.goto("/");await page.getByRole("button",{name:"Usar minha localização",exact:true}).click();
 await expect(page).toHaveURL(/\/mapa\/sp\?city=santos$/);await expect(page.locator("[data-map-ready=true]")).toBeVisible({timeout:30000});
 const keys=await page.evaluate(()=>Object.keys(localStorage));expect(keys.some(k=>/location|latitude|longitude/i.test(k))).toBe(false);
 expect(analytics.some(s=>s.includes("-23.964")||s.includes("-46.329")||/latitude|longitude/.test(s))).toBe(false);
});
test("SP: edit flexible plans into a residence, then remove only the private plan",async({page,context,baseURL})=>{
 test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY,"Configured database required");const u=await testAccount(context,baseURL);
 try{
  const p=await u.client.from("destination_plans").insert({user_id:u.id,city_id:"00000000-0000-4000-8000-000000000001",date_mode:"flexible"}).select("id").single();expect(p.error).toBeNull();
  await page.goto(`/estadias/${p.data!.id}/editar`);await page.getByLabel("O que quero conferir antes de ir (opcional)").fill("Nota privada (Teste)");await page.getByRole("button",{name:"Voltar",exact:true}).click();await page.getByRole("button",{name:"Moro aqui",exact:false}).click();await page.getByRole("button",{name:"Próximo",exact:true}).click();await page.getByRole("button",{name:"Salvar estadia",exact:true}).click();
  await expect(page.getByText("Moro aqui · sem data de saída",{exact:true})).toBeVisible();expect((await u.client.from("destination_plans").select("date_mode,leave_on,note").eq("id",p.data!.id).single()).data).toMatchObject({date_mode:"resident",leave_on:null,note:"Nota privada (Teste)"});
  await page.getByRole("button",{name:"Remover este planejamento",exact:true}).click();await page.getByRole("button",{name:"Confirmar remoção",exact:true}).click();await expect(page).toHaveURL(/\/estadias$/);expect((await u.client.from("destination_plans").select("id").eq("id",p.data!.id)).data).toEqual([]);
 }finally{await u.cleanup();}
});
