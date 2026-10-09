import { createClient } from "@supabase/supabase-js";
import { devices, expect, test, type Browser, type Page } from "@playwright/test";
import { existsSync } from "node:fs";
import { signInAsAdmin } from "./admin";
import { anonymousSignInsEnabled } from "./anon";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const CITY_ID = "00000000-0000-4000-8000-000000000001";
const admin = () => createClient(url, serviceKey, { auth: { persistSession: false } });
const phone = async (browser: Browser) => (await browser.newContext({ ...devices["Pixel 7"] })).newPage();

async function openMap(page: Page, isMobile: boolean) {
  await page.goto("/mapa/santos");
  await expect(page.locator("[data-map-ready=true]")).toBeVisible({ timeout: 30_000 });
  if (isMobile) await page.getByRole("button", { name: "Expandir painel" }).click();
}

test.describe("M7: Wi-Fi, presence, route, moderation", () => {
  test.skip(!url || !serviceKey, "Supabase not configured");

  test("two visitors' Wi-Fi tests update the place card and its source", async ({ browser, isMobile }) => {
    test.skip(!isMobile, "Two phones in their own contexts; runs once, in the mobile project");
    test.skip(!(await anonymousSignInsEnabled()), "Enable anonymous sign-ins in Supabase");
    test.setTimeout(120_000);
    const { data: place } = await admin()
      .from("places")
      .insert({ city_id: CITY_ID, name: `Café Wi-Fi E2E ${Date.now().toString(36)}`, category: "work", subcategory: "cafe", lat: -23.966, lng: -46.333, has_power_outlets: true })
      .select("id")
      .single();

    try {
      for (const [i, page] of [await phone(browser), await phone(browser)].entries()) {
        await page.goto(`/lugar/${place!.id}`);
        await expect(page.getByText(i === 0 ? "Nenhuma medição de nômades ainda." : "1 medição de nômades.", { exact: false })).toBeVisible();
        await page.getByRole("button", { name: "Medir Wi-Fi" }).click();
        await expect(page.getByTestId("wifi-result")).toBeVisible({ timeout: 15_000 }); // SPEC: under 15 s
        await expect(page.getByTestId("wifi-result")).toContainText("Mbps");
        await page.getByRole("button", { name: "Sim, salvar medição" }).click();
        await expect(page.getByText("Obrigado! Sua medição entrou na ficha.")).toBeVisible();
      }
      // After the second test the card shows the measured median and its source.
      const page = await phone(browser);
      await page.goto(`/lugar/${place!.id}`);
      await expect(page.getByText("medido por 2 nômades")).toBeVisible();
      const { data: saved } = await admin().from("places").select("wifi_source, wifi_mbps").eq("id", place!.id).single();
      expect(saved!.wifi_source).toBe("user_test");
      expect(Number(saved!.wifi_mbps)).toBeGreaterThan(0);
    } finally {
      await admin().from("places").delete().eq("id", place!.id);
    }
  });

  test("'Quem está aqui' shows a neighborhood only from 3 people on", async ({ page, isMobile }) => {
    test.setTimeout(90_000);
    const db = admin();
    const anon = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: hoods } = await anon.rpc("city_neighborhoods", { p_city_id: CITY_ID });
    const { data: taken } = await anon.rpc("presence_map", { p_city_id: CITY_ID });
    const busy = new Set((taken ?? []).map((t: { neighborhood: string }) => t.neighborhood));
    // Each project (mobile/desktop runs in parallel) takes a different free neighborhood.
    const hood = (hoods as { neighborhood: string }[]).filter((h) => !busy.has(h.neighborhood))[isMobile ? 0 : 1].neighborhood;
    const ids: string[] = [];
    const addPerson = async () => {
      const { data } = await db.auth.admin.createUser({ email: `e2e-presence-${Date.now()}-${ids.length}-${isMobile ? "m" : "d"}@example.com`, email_confirm: true });
      ids.push(data.user!.id);
      await db.from("profiles").update({ current_city_id: CITY_ID, neighborhood: hood, share_presence: true }).eq("id", data.user!.id);
    };
    const layerOn = async () => {
      await page.getByRole("button", { name: "Camadas do mapa" }).click();
      await page.getByRole("switch", { name: "Quem está aqui" }).click();
      await expect(page.getByRole("switch", { name: "Quem está aqui" })).toHaveAttribute("aria-checked", "true");
    };

    try {
      await addPerson();
      await addPerson();
      await openMap(page, isMobile);
      await layerOn();
      await expect(page.getByRole("img", { name: /nômades na cidade$/ }).first()).toBeAttached();
      await expect(page.getByRole("img", { name: `${hood}: 2 nômades na cidade` })).toHaveCount(0);

      await addPerson();
      await page.reload();
      await expect(page.locator("[data-map-ready=true]")).toBeVisible({ timeout: 30_000 });
      await layerOn();
      await expect(page.getByRole("img", { name: `${hood}: 3 nômades na cidade` })).toBeAttached();

      // Regression: DOM markers must keep maplibre's absolute positioning, or each one is
      // pushed down by the height of the markers before it.
      const positions = await page.evaluate(() => [...document.querySelectorAll(".presence, .roda")].map((el) => getComputedStyle(el).position));
      expect(positions.length).toBeGreaterThan(1);
      expect(new Set(positions)).toEqual(new Set(["absolute"]));
    } finally {
      for (const id of ids) await db.auth.admin.deleteUser(id);
    }
  });

  test("route of the day: two stops, distance and walking time, kept on the device", async ({ page }) => {
    // Demo places (seed): Cowork Demo Gonzaga and Cowork Demo Ponta da Praia, opened by link.
    for (const [id, name] of [
      ["00000000-0000-4000-8000-0000000000c1", "Cowork Demo Gonzaga"],
      ["00000000-0000-4000-8000-0000000000c3", "Cowork Demo Ponta da Praia"],
    ]) {
      await page.goto(`/mapa/santos?lugar=${id}`);
      await expect(page.locator("[data-map-ready=true]")).toBeVisible({ timeout: 30_000 });
      const card = page.getByRole("article", { name: new RegExp(name) });
      await card.getByRole("button", { name: "Rota do dia" }).click();
      await expect(card.getByRole("button", { name: "Na rota do dia" })).toHaveAttribute("aria-pressed", "true");
    }
    const tray = page.getByRole("region", { name: "Rota do dia" });
    await expect(tray.getByText("Rota do dia · 2 paradas")).toBeVisible();
    await expect(tray.getByTestId("route-summary")).toHaveText(/km em linha reta · ~\d+ min a pé/);

    await page.reload();
    await expect(page.getByRole("region", { name: "Rota do dia" }).getByText("Rota do dia · 2 paradas")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("region", { name: "Rota do dia" }).getByRole("button", { name: /Rota do dia/ }).click();
    await page.getByRole("button", { name: "Limpar" }).click();
    await expect(page.getByRole("region", { name: "Rota do dia" })).toHaveCount(0);
  });

  test("admins see reports with their target and can resolve them", async ({ page, context, baseURL, isMobile }) => {
    test.skip(isMobile, "Admin screen; desktop is enough");
    const db = admin();
    const { data: place } = await db.from("places").select("id, name").eq("is_demo", true).limit(1).single();
    const { data: reporter } = await db.auth.admin.createUser({ email: `e2e-reporter-${Date.now()}@example.com`, email_confirm: true });
    const reason = "Outro motivo";
    await db.from("reports").insert({ reporter_id: reporter.user!.id, target_type: "place", target_id: place!.id, reason });
    const cleanup = await signInAsAdmin(context, baseURL!);

    try {
      await page.goto("/admin/denuncias");
      const item = page.getByRole("listitem").filter({ hasText: place!.name });
      await expect(item.getByText(reason)).toBeVisible();
      await expect(item.getByRole("link", { name: place!.name })).toHaveAttribute("href", `/lugar/${place!.id}`);
      await item.getByRole("button", { name: "Resolver sem ação" }).click();
      await expect(page.getByRole("listitem").filter({ hasText: place!.name })).toHaveCount(0);
    } finally {
      await cleanup();
      await db.auth.admin.deleteUser(reporter.user!.id); // cascades the report
    }
  });
});
