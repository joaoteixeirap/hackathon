import { createClient } from "@supabase/supabase-js";
import { devices, expect, test, type Browser } from "@playwright/test";
import { existsSync } from "node:fs";
import { anonymousSignInsEnabled } from "./anon";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const CITY_ID = "00000000-0000-4000-8000-000000000001";
const phone = async (browser: Browser) => (await browser.newContext({ ...devices["Pixel 7"] })).newPage();

// SPEC_V2 V1: check-in with measurement → the fact shows source and "today"; a second person confirms.
test.describe("V1: check-in and facts", () => {
  test.skip(!url || !serviceKey, "Supabase not configured");

  test("a visitor measures a café, the card shows the data dated today, another confirms it", async ({ browser, isMobile }) => {
    test.skip(!isMobile, "Two phones in their own contexts; runs once, in the mobile project");
    test.skip(!(await anonymousSignInsEnabled()), "Enable anonymous sign-ins in Supabase");
    test.setTimeout(120_000);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: place } = await admin
      .from("places")
      .insert({ city_id: CITY_ID, name: `Café Check-in E2E ${Date.now().toString(36)}`, category: "eat", subcategory: "cafe", lat: -23.966, lng: -46.333 })
      .select("id")
      .single();

    try {
      const a = await phone(browser);
      await a.goto(`/lugar/${place!.id}`);
      const wifi = a.locator("[data-fact=wifi]");
      await expect(wifi.getByText("Sem verificação ainda").first()).toBeVisible();

      await a.getByRole("button", { name: /Medir agora/ }).click();
      const sheet = a.getByRole("dialog", { name: /Medir agora/ });
      await expect(sheet.getByRole("button", { name: "Medir a conexão" })).toBeDisabled();
      await sheet.getByText("Estou no Wi-Fi deste local").click();
      await sheet.getByRole("button", { name: "Medir a conexão" }).click();
      await expect(sheet.getByTestId("speed-result")).toBeVisible({ timeout: 20_000 }); // SPEC: ≤ 15 s
      await sheet.getByRole("radiogroup", { name: "Tomadas" }).getByRole("radio", { name: "Muitas" }).click();
      await sheet.getByRole("radiogroup", { name: "Ruído" }).getByRole("radio", { name: "Silencioso" }).click();
      await sheet.getByRole("button", { name: "Salvar check-in" }).click();
      await expect(sheet.getByText("Obrigado!")).toBeVisible();
      await sheet.getByRole("button", { name: "Fechar", exact: true }).last().click();

      await expect(wifi.getByText("Medido por nômades · verificado hoje por 1 pessoa")).toBeVisible();
      await expect(wifi.getByText("Recente")).toBeVisible();
      await expect(a.locator("[data-fact=outlets]").getByText("Muitas")).toBeVisible();

      const b = await phone(browser);
      await b.goto(`/lugar/${place!.id}`);
      await b.locator("[data-fact=wifi]").getByRole("button", { name: "Confirmar wi-fi" }).click();
      await expect(b.locator("[data-fact=wifi]").getByText("verificado hoje por 2 pessoas", { exact: false })).toBeVisible();
    } finally {
      await admin.from("places").delete().eq("id", place!.id);
    }
  });
});
