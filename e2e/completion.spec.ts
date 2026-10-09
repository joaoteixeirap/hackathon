import { expect,test } from "@playwright/test";
import { existsSync } from "node:fs";
import { testAccount } from "./account";
if(existsSync(".env.local"))process.loadEnvFile(".env.local");
const CITY="00000000-0000-4000-8000-000000000001";
test("completion: city directory filters destinations and links to routine tools",async({page,isMobile})=>{
  if(isMobile)await page.setViewportSize({width:360,height:740});
  await page.goto("/mapa/santos");
  if(isMobile)await page.getByRole("button",{name:"Expandir painel"}).click();
  await page.getByRole("link",{name:"Cidades e ferramentas"}).click();
  await expect(page.getByRole("heading",{name:"Cidades e ferramentas"})).toBeVisible();
  await page.getByLabel("Buscar cidade").fill("sAnToS");
  await expect(page.getByRole("region",{name:"Cidades cadastradas"}).getByRole("listitem")).toHaveCount(1);
  await expect(page.getByRole("link",{name:"Dados da cidade"})).toHaveAttribute("href","/cidade/santos");
  await page.getByLabel("Buscar cidade").fill("sem-cobertura");
  await expect(page.getByText("Nenhuma cidade encontrada. Tente outro nome.")).toBeVisible();
  await page.getByLabel("Buscar cidade").fill("florianopolis");
  await expect(page.getByRole("link",{name:"Abrir mapa de Florianópolis"})).toBeVisible();
  await expect(page.getByRole("link",{name:/World Time Buddy/})).toHaveAttribute("href","https://www.worldtimebuddy.com/");
  await expect(page.getByRole("link",{name:"Agenda e exportação para calendário"})).toHaveAttribute("href","/estadia?aba=agenda");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
async function stay(u:Awaited<ReturnType<typeof testAccount>>) {
  const today=new Date().toLocaleDateString("en-CA",{timeZone:"America/Sao_Paulo"});
  const leave=new Date(Date.parse(`${today}T12:00:00Z`)+30*86400000).toISOString().slice(0,10);
  expect((await u.client.rpc("set_stay",{p_city_id:CITY,p_arrive:today,p_leave:leave,p_audience:"br"})).error).toBeNull();
}
test("completion: map cards and details render the compatibility RPC response (UI contract)",async({page,isMobile})=>{
  await page.route("**/rest/v1/rpc/activity_compats",async route=>{
    const ids=route.request().postDataJSON().p_activity_ids as string[];
    await route.fulfill({json:Object.fromEntries(ids.map(id=>[id,{same_rhythm:2,overlap:3}]))});
  });
  await page.goto("/mapa/santos");
  if(isMobile)await page.getByRole("button",{name:"Expandir painel"}).click();
  const card=page.getByRole("region",{name:"Atividades nesta área"}).getByRole("button").filter({hasText:"2 pessoas com a mesma rotina que você"}).first();
  await expect(card).toBeVisible();await card.click();
  const detail=isMobile ? page.getByRole("region",{name:"Detalhes",exact:true}) : page.getByRole("complementary",{name:"Painel do mapa"});
  await expect(detail.getByText("2 pessoas com a mesma rotina que você")).toBeVisible();
  await expect(detail.getByText("3 estarão na cidade nas suas datas")).toBeVisible();
});
test("completion: checklist opens a map filtered by subcategory",async({page,context,baseURL,isMobile})=>{
  test.skip(!isMobile||!process.env.SUPABASE_SERVICE_ROLE_KEY,"Configured phone flow");
  const u=await testAccount(context,baseURL);let template="";
  try {
    const result=await u.admin.from("stay_task_templates").insert({title:"Farmácia de referência (Teste)",audience:"all",phase:"first_week",area:"health",map_category:"health",map_subcategory:"pharmacy",city_id:CITY}).select("id").single();
    expect(result.error).toBeNull();template=result.data!.id;await stay(u);
    await page.goto("/estadia?aba=tarefas");
    await page.getByRole("listitem").filter({hasText:"Farmácia de referência (Teste)"}).getByRole("link",{name:"Abrir no mapa"}).click();
    await expect(page).toHaveURL(/cat=health&sub=pharmacy/);
    await expect(page.getByRole("button",{name:"Limpar filtro de serviços essenciais"})).toBeVisible();
  } finally {await u.cleanup();if(template)await u.admin.from("stay_task_templates").delete().eq("id",template);}
});
test("completion: request an activity directly from a compatible person",async({page,context,baseURL,isMobile})=>{
  test.skip(!isMobile||!process.env.SUPABASE_SERVICE_ROLE_KEY,"Configured phone flow");
  const u=await testAccount(context,baseURL),v=await testAccount();let activity="";
  const personName=`Pessoa compatível (Teste) ${v.id.slice(0,8)}`;
  try {
    await stay(u);await stay(v);
    expect((await u.admin.from("profiles").update({discoverable:true,work_rhythm:"morning",interests:["coffee"]}).in("id",[u.id,v.id])).error).toBeNull();
    await u.admin.from("profiles").update({display_name:personName}).eq("id",v.id);
    const a=await u.admin.from("activities").insert({city_id:CITY,creator_id:v.id,title:"Café compartilhado (Teste)",category:"work_together",meeting_lat:-23.9655,meeting_lng:-46.3338,capacity:6,starts_at:new Date(Date.now()+3600000).toISOString(),ends_at:new Date(Date.now()+7200000).toISOString(),is_demo:true}).select("id").single();
    expect(a.error).toBeNull();activity=a.data!.id;
    await page.goto("/estadia?aba=pessoas");
    await page.getByRole("button").filter({hasText:personName}).click();
    const row=page.getByRole("listitem").filter({has:page.getByRole("link",{name:/Café compartilhado/})}).last();
    await row.getByRole("button",{name:"Pedir para entrar"}).click();
    await expect(row.getByRole("button",{name:"Pedido enviado"})).toBeDisabled();
    await expect.poll(async()=>(await u.client.from("activity_members").select("status").eq("activity_id",activity).eq("user_id",u.id)).data).toEqual([{status:"requested"}]);
  } finally {if(activity)await u.admin.from("activities").delete().eq("id",activity);await u.cleanup();await v.cleanup();}
});
test("completion: post-session check-in leads to participant review and persists",async({page,context,baseURL,isMobile})=>{
  test.skip(!isMobile||!process.env.SUPABASE_SERVICE_ROLE_KEY,"Configured phone flow");
  const u=await testAccount(context,baseURL),v=await testAccount();let place="",activity="";
  try {
    await stay(u);await u.admin.from("profiles").update({display_name:"Participante (Teste)"}).eq("id",v.id);
    const p=await u.admin.from("places").insert({city_id:CITY,name:"Local pós-sessão (Teste)",category:"work",lat:-23.9655,lng:-46.3338,is_demo:true}).select("id").single();expect(p.error).toBeNull();place=p.data!.id;
    const a=await u.admin.from("activities").insert({city_id:CITY,creator_id:u.id,place_id:place,title:"Sessão encerrada (Teste)",category:"work_together",meeting_lat:-23.9655,meeting_lng:-46.3338,capacity:6,starts_at:new Date(Date.now()-3*3600000).toISOString(),ends_at:new Date(Date.now()-3600000).toISOString(),is_demo:true}).select("id").single();expect(a.error).toBeNull();activity=a.data!.id;
    expect((await u.admin.from("activity_members").insert({activity_id:activity,user_id:v.id,status:"approved"})).error).toBeNull();
    await page.goto("/estadia");await page.getByRole("button",{name:"Registrar",exact:true}).click();
    const sheet=page.getByRole("dialog",{name:/Medir agora/});
    await sheet.getByRole("button",{name:"Só relatar, sem medir"}).click();
    await sheet.getByRole("radiogroup",{name:"Tomadas"}).getByRole("radio",{name:"Muitas"}).click();
    await sheet.getByRole("button",{name:"Salvar check-in"}).click();
    const review=page.getByRole("region",{name:"Avaliação pós-sessão"});
    await expect(review.getByRole("heading",{name:"Como foi participar desta roda?"})).toBeVisible();
    await page.reload();
    await expect(review).toBeVisible();
    expect((await u.client.from("place_checkins").select("activity_id").eq("activity_id",activity)).data).toHaveLength(1);
    await review.locator("label").filter({has:page.getByRole("radio",{name:"5 estrelas"})}).click();await review.getByRole("button",{name:"Enviar",exact:true}).click();
    await expect.poll(async()=>(await u.client.from("reviews").select("rating").eq("author_id",u.id).eq("target_id",v.id)).data).toEqual([{rating:5}]);
    await page.reload();await expect(page.getByText(/Como foi trabalhar no Local pós-sessão/)).toHaveCount(0);
  } finally {
    if(place)await u.admin.from("place_checkins").delete().eq("place_id",place);
    if(activity)await u.admin.from("activities").delete().eq("id",activity);
    if(place)await u.admin.from("places").delete().eq("id",place);
    await u.cleanup();await v.cleanup();
  }
});
