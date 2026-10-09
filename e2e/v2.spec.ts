import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

// SPEC_V2 V2: Radar ordered by criteria, "Modo chamada" changes the list, cards show date and source.
test.describe("V2: Radar", () => {
  test.skip(!configured, "Supabase not configured");

  test("Radar lists work places by criteria; 'Modo chamada' narrows it; cards show source and date", async ({ page, isMobile }) => {
    await page.goto("/mapa/santos");
    await expect(page.locator("[data-map-ready=true]")).toBeVisible({ timeout: 30_000 });
    if (isMobile) await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Radar" }).click();
    else await page.getByRole("link", { name: "Radar" }).first().click();

    await expect(page).toHaveURL(/\/radar\/santos$/);
    await expect(page.getByRole("heading", { name: "Onde trabalhar agora" })).toBeVisible();
    const count = async () => Number((await page.getByText(/^\d+ lugares? em Santos, pela adequação$/).textContent())!.match(/^(\d+)/)![1]);
    const all = await count();
    expect(all).toBeGreaterThan(3);

    // The top card is the demo coworking with fresh measurements; its criteria carry source and date.
    const first = page.locator("[data-radar-card]").first();
    await expect(first.getByRole("heading")).toContainText("Cowork Demo Gonzaga");
    await expect(first.getByText(/^nômades · há \d+ dias? · 2 pessoas$/).first()).toBeVisible();
    await expect(first.getByTestId("radar-score")).toHaveText(/Adequação \d+\/100/);

    await page.getByRole("button", { name: "Modo chamada" }).click();
    await expect(page.getByRole("button", { name: "Modo chamada" })).toHaveAttribute("aria-pressed", "true");
    await expect.poll(count).toBeLessThan(all);
    await expect(page.locator("[data-radar-card]").first().getByText("Pronto para chamadas")).toBeVisible();

    await page.getByRole("radio", { name: "Mapa" }).click();
    await expect(page.getByRole("button", { name: /^1\. Cowork Demo Gonzaga/ })).toBeAttached({ timeout: 30_000 });
  });

  test("map chips 'Modo chamada' and 'Dados recentes' filter the map list", async ({ page, isMobile }) => {
    await page.goto("/mapa/santos");
    await expect(page.locator("[data-map-ready=true]")).toBeVisible({ timeout: 30_000 });
    if (isMobile) await page.getByRole("button", { name: "Expandir painel" }).click();
    const countLine = page.getByText(/\d+ lugare?s? · \d+ rodas? nesta área/).first();
    const count = async () => Number((await countLine.textContent())!.match(/^([\d.]+)/)![1].replace(".", ""));
    const all = await count();
    if (!isMobile) await page.getByRole("button", { name: "Filtros", exact: true }).click();
    await page.getByRole("button", { name: "Dados recentes" }).click();
    await expect.poll(count).toBeLessThan(all);
    const recent = await count();
    expect(recent).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Modo chamada" }).click();
    await expect.poll(count).toBeLessThanOrEqual(recent);
  });
});
