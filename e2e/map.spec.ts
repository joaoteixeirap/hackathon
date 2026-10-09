import { expect, test, type Page } from "@playwright/test";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

const countLine = (page: Page) => page.getByText(/\d+ lugare?s? · \d+ rodas? nesta área/).first();
const count = async (page: Page) => Number((await countLine(page).textContent())!.match(/^([\d.]+)/)![1].replace(".", ""));

async function openMap(page: Page, isMobile: boolean) {
  await page.goto("/mapa/santos");
  await expect(page.locator("[data-map-ready=true]")).toBeVisible({ timeout: 30_000 });
  if (isMobile) await page.getByRole("button", { name: "Expandir painel" }).click();
}

test.describe("map (F1, F2)", () => {
  test.skip(!configured, "Supabase not configured");

  test("shows hundreds of real places and filters by chip, search and toggles", async ({ page, isMobile }) => {
    await openMap(page, isMobile);
    await expect(countLine(page)).toBeVisible();
    // Zoom out to the whole city so the count covers everything.
    const all = await count(page);
    expect(all).toBeGreaterThan(100);

    const work = page.getByRole("button", { name: "Trabalhar", exact: true });
    await work.click();
    await expect(work).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => count(page)).toBeLessThan(all);
    await work.click();

    await page.getByRole("searchbox").fill("cowork demo");
    await expect.poll(() => count(page)).toBeLessThanOrEqual(3);
    await page.getByRole("button", { name: "Limpar busca" }).click();

    const seal = page.getByRole("button", { name: "Com Selo" });
    await seal.click();
    await expect(seal).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => count(page)).toBeLessThanOrEqual(3);
  });

  test("opening a place shows its card; closing returns to the list", async ({ page, isMobile }) => {
    await openMap(page, isMobile);
    await page.getByRole("button", { name: "Com Selo" }).click();
    await page.getByRole("button", { name: /^Cowork Demo Gonzaga/ }).click();

    const detail = page.getByRole("article", { name: /Cowork Demo Gonzaga/ });
    await expect(detail).toBeVisible();
    await expect(detail.getByText("Amigo do Nômade.")).toBeVisible();
    await expect(detail.getByText(/Mbps/)).toBeVisible();
    await expect(detail.getByRole("link", { name: "Como chegar" })).toHaveAttribute("href", /google\.com\/maps\/dir/);

    await detail.getByRole("button", { name: "Fechar" }).click();
    await expect(detail).toBeHidden();
  });

  test("place page is shareable with Open Graph tags", async ({ page, isMobile }) => {
    await openMap(page, isMobile);
    await page.getByRole("button", { name: "Com Selo" }).click();
    await page.getByRole("button", { name: /^Cowork Demo Gonzaga/ }).click();
    await page.getByRole("link", { name: "Abrir ficha" }).click();

    await expect(page).toHaveURL(/\/lugar\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: /Cowork Demo Gonzaga/ })).toBeVisible();
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /Cowork Demo Gonzaga/);
  });

  test("demo activities appear as rodas on the map", async ({ page, isMobile }) => {
    await openMap(page, isMobile);
    await page.getByRole("button", { name: "Atividades", exact: true }).click();
    await expect(page.locator(".roda").first()).toBeAttached();
    await expect(page.getByRole("button", { name: /Dia de trabalho conjunto/ }).first()).toBeVisible();
  });
});
