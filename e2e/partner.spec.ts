import { createClient } from "@supabase/supabase-js";
import { devices, expect, test, type Browser } from "@playwright/test";
import { existsSync } from "node:fs";
import { anonymousSignInsEnabled } from "./anon";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const phone = async (browser: Browser) => (await browser.newContext({ ...devices["Pixel 7"] })).newPage();

// M6 acceptance: an offer created by a partner shows on the map; redemption is once per day.
test.describe("partner panel and offers (M6)", () => {
  test.skip(!url, "Supabase not configured");

  test("partner publishes an offer; a nomad finds it on the map and redeems it once", async ({ browser, isMobile }) => {
    test.skip(!isMobile, "Two phones in their own contexts; runs once, in the mobile project");
    test.skip(!(await anonymousSignInsEnabled()), "Enable anonymous sign-ins in Supabase (Authentication → Sign In / Providers)");
    test.setTimeout(150_000);

    const tag = Date.now().toString(36);
    const business = `Negócio E2E ${tag}`;
    const placeName = `Café E2E ${tag}`;
    const offerTitle = `Café grátis E2E ${tag}`;
    const partner = await phone(browser);
    const nomad = await phone(browser);
    let placeId = "";

    try {
      // Partner signs up (auto-approved in hackathon mode) and adds a new place.
      await partner.goto("/parceiro");
      await partner.getByLabel("Nome do negócio").fill(business);
      await partner.getByRole("button", { name: "Cadastrar meu negócio" }).click();
      await expect(partner.getByRole("heading", { name: business })).toBeVisible({ timeout: 15_000 });
      await partner.getByRole("link", { name: "Adicionar lugar" }).click();

      await partner.getByLabel("Nome do lugar").fill(placeName);
      await partner.getByLabel("Categoria").selectOption("eat");
      await partner.getByLabel("Bairro").fill("Gonzaga");
      await partner.getByRole("button", { name: "Cadastrar lugar" }).click();
      await expect(partner).toHaveURL(/\/parceiro\/lugar\/[0-9a-f-]{36}\?novo=1$/, { timeout: 20_000 });
      placeId = partner.url().match(/lugar\/([0-9a-f-]{36})/)![1];

      // Publish an offer with a known code and a simulated feature.
      await partner.getByLabel("Título").fill(offerTitle);
      await partner.getByLabel("Código").fill("e2ecafe");
      await partner.getByRole("button", { name: "Publicar oferta" }).click();
      await expect(partner.getByText("Oferta publicada.")).toBeVisible();
      await expect(partner.getByText("E2ECAFE")).toBeVisible();
      await partner.getByRole("button", { name: /Destacar no mapa/ }).click();
      await expect(partner.getByText(/Em destaque até/)).toBeVisible();
      await expect(partner.getByText("Cobrança simulada", { exact: false })).toBeVisible();

      // A nomad finds it on the map with "Tem oferta".
      await nomad.goto("/mapa/santos");
      await expect(nomad.locator("[data-map-ready=true]")).toBeVisible({ timeout: 30_000 });
      await nomad.getByRole("button", { name: "Expandir painel" }).click();
      await nomad.getByRole("button", { name: "Tem oferta" }).click();
      await nomad.getByRole("searchbox").fill(placeName);
      await nomad.getByRole("button", { name: new RegExp(`^${placeName}`) }).click();

      const card = nomad.getByRole("article", { name: new RegExp(placeName) });
      await expect(card.getByText(offerTitle)).toBeVisible();
      await expect(card.getByText("E2ECAFE")).toHaveCount(0); // code hidden until redeemed

      await card.getByRole("button", { name: "Usar oferta" }).click();
      await card.getByRole("button", { name: "Mostrar código" }).click();
      await expect(card.getByTestId("offer-code")).toHaveText("E2ECAFE");
      await expect(card.getByRole("img", { name: /QR code/ })).toBeVisible();
      await expect(card.getByText(/Vale por mais 0\d:\d{2}/)).toBeVisible();

      // The partner sees the redemption by first name.
      await partner.reload();
      await expect(partner.getByText(/1 resgate · 1 hoje/)).toBeVisible();
      await expect(partner.getByRole("region", { name: "Resgates" }).getByText(offerTitle)).toBeVisible();

      // Once the 10-minute window has passed, the same nomad cannot redeem again today.
      const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
      const { data: offer } = await admin.from("offers").select("id").eq("place_id", placeId).single();
      await admin.from("offer_redemptions").update({ created_at: new Date(Date.now() - 11 * 60_000).toISOString() }).eq("offer_id", offer!.id);
      await nomad.reload();
      await nomad.goto(`/lugar/${placeId}`);
      await nomad.getByRole("button", { name: "Usar oferta" }).click();
      await nomad.getByRole("button", { name: "Mostrar código" }).click();
      await expect(nomad.getByText("Você já usou esta oferta hoje. Volte amanhã.")).toBeVisible();
    } finally {
      if (serviceKey) {
        const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
        await admin.from("places").delete().eq("name", placeName); // also when the id was never read
        await admin.from("partners").delete().eq("business_name", business);
      }
    }
  });
});
