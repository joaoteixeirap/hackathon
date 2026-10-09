import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { existsSync } from "node:fs";
import { anonymousSignInsEnabled } from "./anon";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function openMap(page: Page, isMobile: boolean) {
  await page.goto("/mapa/santos");
  await expect(page.locator("[data-map-ready=true]")).toBeVisible({ timeout: 30_000 });
  if (isMobile) await page.getByRole("button", { name: "Expandir painel" }).click();
}

test.describe("activities (F3)", () => {
  test.skip(!url, "Supabase not configured");

  test("a demo roda opens a shareable page with WhatsApp preview data", async ({ page, isMobile }) => {
    await openMap(page, isMobile);
    await page.getByRole("button", { name: "Atividades", exact: true }).click();
    await page.getByRole("button", { name: /^Dia de trabalho conjunto/ }).first().click();
    await page.getByRole("link", { name: "Ver roda" }).click();

    await expect(page).toHaveURL(/\/atividade\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: "Dia de trabalho conjunto" })).toBeVisible();
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /Dia de trabalho conjunto · Santos/);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", /\d{2}:\d{2}/);
    await expect(page.getByRole("link", { name: "Enviar no WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=/);
  });

  test("a roda created by one visitor shows up on another visitor's map within 5 s", async ({ browser, isMobile }) => {
    test.skip(!(await anonymousSignInsEnabled()), "Enable anonymous sign-ins in Supabase (Authentication → Sign In / Providers)");
    const title = `Roda E2E ${Date.now().toString(36)}`;
    const viewer = await (await browser.newContext({ ...(isMobile ? { viewport: { width: 412, height: 839 }, isMobile: true, hasTouch: true } : {}) })).newPage();
    const creator = await (await browser.newContext()).newPage();
    let createdId = "";

    try {
      await openMap(viewer, isMobile);
      await viewer.getByRole("button", { name: "Atividades", exact: true }).click();

      await creator.goto("/atividade/nova");
      await expect(creator.getByRole("heading", { name: "Criar um rolê em grupo" })).toBeVisible();
      await expect(creator.locator("[data-ready]")).toBeAttached({ timeout: 30_000 });
      await creator.getByLabel("O que vamos fazer?").fill(title);
      await creator.getByText("Encontro", { exact: true }).click();
      await creator.getByLabel("Custo total").fill("120,00");
      await expect(creator.getByText(/por pessoa se lotar/)).toBeVisible();
      await creator.getByRole("button", { name: "Criar roda" }).click();

      await expect(creator).toHaveURL(/\/atividade\/[0-9a-f-]{36}\?nova=1$/);
      createdId = creator.url().match(/atividade\/([0-9a-f-]{36})/)![1];
      await expect(creator.getByText("Roda criada!")).toBeVisible();
      await expect(creator.getByText("R$ 120,00 no total")).toBeVisible();

      await expect(viewer.getByRole("button", { name: new RegExp(`^${title}`) })).toBeVisible({ timeout: 5_000 });
    } finally {
      if (createdId && serviceKey) {
        await createClient(url, serviceKey, { auth: { persistSession: false } }).from("activities").delete().eq("id", createdId);
      }
    }
  });
});
