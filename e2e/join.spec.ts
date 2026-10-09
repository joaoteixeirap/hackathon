import { createClient } from "@supabase/supabase-js";
import { devices, expect, test, type Browser } from "@playwright/test";
import { existsSync } from "node:fs";
import { anonymousSignInsEnabled } from "./anon";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const phone = async (browser: Browser) => (await browser.newContext({ ...devices["Pixel 7"] })).newPage();

// M5 acceptance: end to end with two accounts (F4 join + approve, F5 chat, F6 split).
test.describe("join, approve and chat (M5)", () => {
  test.skip(!url, "Supabase not configured");

  test("one visitor asks to join, the creator approves, both chat and see the split", async ({ browser, isMobile }) => {
    test.skip(!isMobile, "Two phones in their own contexts; runs once, in the mobile project");
    test.skip(!(await anonymousSignInsEnabled()), "Enable anonymous sign-ins in Supabase (Authentication → Sign In / Providers)");
    test.setTimeout(120_000);

    const title = `Roda M5 ${Date.now().toString(36)}`;
    const creator = await phone(browser);
    const joiner = await phone(browser);
    let activityId = "";

    try {
      // Creator opens a roda with a R$ 120 bill split among up to 6 people (R$ 20 each if full).
      await creator.goto("/atividade/nova");
      await expect(creator.locator("[data-ready]")).toBeAttached({ timeout: 30_000 });
      await creator.getByLabel("O que vamos fazer?").fill(title);
      await creator.getByLabel("Custo total").fill("120,00");
      await creator.getByRole("button", { name: "Criar roda" }).click();
      await expect(creator).toHaveURL(/\/atividade\/[0-9a-f-]{36}\?nova=1$/);
      activityId = creator.url().match(/atividade\/([0-9a-f-]{36})/)![1];
      await expect(creator.getByText("R$ 20,00 por pessoa")).toBeVisible();
      await expect(creator.getByText("Nenhum pedido pendente.")).toBeVisible();

      // Another visitor asks to join from the shared link.
      await joiner.goto(`/atividade/${activityId}`);
      await joiner.getByRole("button", { name: "Pedir para entrar" }).click();
      await expect(joiner.getByText("Pedido enviado.")).toBeVisible({ timeout: 15_000 });
      await expect(joiner.getByRole("heading", { name: /Chat do grupo/ })).toHaveCount(0);

      // The creator's queue updates live; approve.
      const approve = creator.getByRole("button", { name: /^Aprovar / });
      await expect(approve).toBeVisible({ timeout: 10_000 });
      await approve.click();
      await expect(creator.getByText("Nenhum pedido pendente.")).toBeVisible({ timeout: 15_000 });
      await expect(creator.getByText("R$ 60,00 por pessoa")).toBeVisible();
      await expect(creator.getByText("com 2 pessoas")).toBeVisible();

      // The joiner is in without reloading.
      await expect(joiner.getByText("Você está no grupo.")).toBeVisible({ timeout: 10_000 });
      await expect(joiner.getByText("R$ 60,00 por pessoa")).toBeVisible();

      // Chat both ways.
      await joiner.getByLabel("Mensagem", { exact: true }).fill("Oi! Levo o notebook.");
      await joiner.getByRole("button", { name: "Enviar mensagem" }).click();
      await expect(creator.getByText("Oi! Levo o notebook.")).toBeVisible({ timeout: 5_000 });

      await creator.getByLabel("Mensagem", { exact: true }).fill("Fechado, até amanhã.");
      await creator.getByLabel("Mensagem", { exact: true }).press("Enter");
      await expect(joiner.getByText("Fechado, até amanhã.")).toBeVisible({ timeout: 5_000 });

      // A message can be reported.
      await joiner.getByRole("button", { name: "Denunciar", exact: true }).first().click();
      await joiner.getByRole("button", { name: "Golpe ou spam" }).click();
      await expect(joiner.getByText("Denúncia enviada")).toBeVisible();
    } finally {
      if (activityId && serviceKey) {
        const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
        await admin.from("reports").delete().eq("target_type", "message").in(
          "target_id",
          ((await admin.from("messages").select("id").eq("activity_id", activityId)).data ?? []).map((m) => m.id),
        );
        await admin.from("activities").delete().eq("id", activityId);
      }
      if (serviceKey) {
        // Also by title, in case the test failed before reading the id.
        await createClient(url, serviceKey, { auth: { persistSession: false } }).from("activities").delete().eq("title", title);
      }
    }
  });
});
