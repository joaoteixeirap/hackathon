import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { testAccount } from "./account";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

test("database completion: real compatibility counts and emergency metadata reach the UI", async ({ page, context, baseURL, isMobile }) => {
  test.skip(!isMobile || !process.env.SUPABASE_SERVICE_ROLE_KEY, "Configured phone flow");
  const u = await testAccount(context, baseURL);
  const city = "00000000-0000-4000-8000-000000000001";
  const activity = "00000000-0000-4000-8000-0000000000d8";
  let place = "";
  try {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const leave = new Date(Date.parse(`${today}T12:00:00Z`) + 30 * 86400000).toISOString().slice(0, 10);
    expect((await u.client.rpc("set_stay", { p_city_id: city, p_arrive: today, p_leave: leave, p_audience: "br" })).error).toBeNull();
    expect((await u.admin.from("profiles").update({ work_rhythm: "morning" }).eq("id", u.id)).error).toBeNull();
    const { data: counts, error } = await u.client.rpc("activity_compats", { p_activity_ids: [activity] });
    expect(error).toBeNull();
    expect(counts[activity].same_rhythm).toBeGreaterThanOrEqual(2);
    expect(counts[activity].overlap).toBeGreaterThanOrEqual(2);
    const routine = `${counts[activity].same_rhythm} pessoas com a mesma rotina que você`;
    const overlap = `${counts[activity].overlap} estarão na cidade nas suas datas`;
    await page.goto("/mapa/santos");
    await page.getByRole("button", { name: "Expandir painel" }).click();
    const card = page.getByRole("region", { name: "Atividades nesta área" }).getByRole("button").filter({ hasText: "Passe de grupo liberado" });
    await expect(card.getByText(routine, { exact: false })).toBeVisible();
    await card.click();
    const detail = page.getByRole("region", { name: "Detalhes", exact: true });
    await expect(detail.getByText(routine, { exact: false })).toBeVisible();
    await expect(detail.getByText(overlap, { exact: false })).toBeVisible();

    const osmId = `node/test-${crypto.randomUUID()}`;
    const p = await u.admin.from("places").insert({ city_id: city, name: "Emergência sem horário (Teste Demo)", osm_id: osmId, category: "health", subcategory: "hospital", lat: -23.964, lng: -46.329, is_demo: true }).select("id").single();
    expect(p.error).toBeNull(); place = p.data!.id;
    expect((await u.admin.rpc("import_osm_emergency", { p_city_id: city, p_rows: [{ osm_id: osmId, emergency: true }] })).error).toBeNull();
    await page.goto(`/lugar/${place}`);
    await expect(page.getByText("Emergência informada no OSM")).toBeVisible();
    await expect(page.getByText("Horário 24h não confirmado; confira com o local.")).toBeVisible();
    await expect(page.getByText(/OpenStreetMap \(importado/)).toBeVisible();
    expect((await u.client.from("places").select("opening_hours").eq("id", place).single()).data?.opening_hours).toBeNull();
  } finally {
    if (place) expect((await u.admin.from("places").delete().eq("id", place)).error).toBeNull();
    await u.cleanup();
  }
});
