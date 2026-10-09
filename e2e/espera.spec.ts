import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { signInAsAdmin } from "./admin";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// F13 acceptance: a sign-up records its origin (utm + block) and the funnel events.
test.describe("waitlist /espera (F13)", () => {
  test.skip(!url || !serviceKey, "Supabase not configured");

  test("signing up from a block records the origin and the funnel events", async ({ page }, info) => {
    const campaign = `e2e-${info.project.name}-${Date.now().toString(36)}`;
    const email = `${campaign}@example.com`;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    try {
      await page.goto(`/espera?utm_source=e2e&utm_campaign=${campaign}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      const block = page.getByRole("article").filter({ hasText: "Trabalhar com confiança" });
      await block.getByRole("button", { name: "Quero isso" }).click();
      await expect(block.getByRole("button", { name: "É isso que eu quero" })).toHaveAttribute("aria-pressed", "true");

      await page.getByLabel("Seu e-mail").fill(email);
      await page.getByLabel("Nômade estrangeiro").check();
      await page.getByRole("button", { name: "Quero entrar" }).click();
      await expect(page.getByText("Você está na lista!")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("link", { name: "Enviar no WhatsApp" })).toHaveAttribute("href", /utm_source%3Dwhatsapp/);

      const { data: row } = await admin.from("waitlist").select("origin_block, utm_source, utm_campaign, audience, city_slug").eq("email", email).single();
      expect(row).toEqual({ origin_block: "work", utm_source: "e2e", utm_campaign: campaign, audience: "nomad_foreign", city_slug: "santos" });

      await expect
        .poll(async () => {
          const { data } = await admin.from("events").select("name").eq("props->>utm_campaign", campaign);
          return (data ?? []).map((e) => e.name).sort();
        })
        .toEqual(["click_block_work", "submit_waitlist", "view_espera"]);

      // The same e-mail again is a friendly no-op.
      await page.getByRole("button",{name:"Internet instável, barulho ou falta de tomada"}).click();
      await expect(page.getByRole("heading",{name:"Quanto tempo você costuma ficar em cada cidade?"})).toBeVisible();
      const sid=await page.evaluate(()=>localStorage.getItem("sr_sid"));
      const answers=await admin.from("micro_answers").select("question_key,answer_key").eq("session_id",sid!);
      expect(answers.data).toEqual([{question_key:"q_pain",answer_key:"wifi"}]);
      await page.goto(`/espera?utm_source=e2e&utm_campaign=${campaign}`);
      await expect(page.getByRole("heading",{name:"O que mais atrapalha você ao chegar numa cidade nova?"})).toHaveCount(0);
      await page.getByLabel("Seu e-mail").fill(email);
      await page.getByRole("button", { name: "Quero entrar" }).click();
      await expect(page.getByText("Você já estava na lista!")).toBeVisible({ timeout: 15_000 });
    } finally {
      await admin.from("waitlist").delete().eq("email", email);
      await admin.from("events").delete().eq("props->>utm_campaign", campaign);
      const sid=await page.evaluate(()=>localStorage.getItem("sr_sid")).catch(()=>null);
      if(sid){await admin.from("micro_answers").delete().eq("session_id",sid);await admin.from("events").delete().eq("session_id",sid);}
    }
  });

  test("the metrics panel is closed to non-admins", async ({ page }) => {
    await page.goto("/admin/metricas");
    await expect(page.getByText("Área da equipe.")).toBeVisible();
    await expect(page.getByText("Conversão por bloco")).toHaveCount(0);
  });

  test("admins see conversion by block, sign-ups by origin and the pitch QR", async ({ page, context, baseURL }) => {
    const cleanup = await signInAsAdmin(context, baseURL!);
    try {
      await page.goto("/admin/metricas?dias=todos");
      await expect(page.getByRole("heading", { name: "Conversão por bloco" })).toBeVisible();
      const blocks = page.getByRole("region", { name: "Conversão por bloco" });
      for (const name of ["Trabalhar com confiança", "Vínculos durante a estadia", "Sua semana numa jornada"]) {
        await expect(blocks.getByRole("rowheader", { name })).toBeVisible();
      }
      await expect(page.getByRole("heading", { name: "Cadastros por origem" })).toBeVisible();
      await expect(page.getByRole("img", { name: "QR code da lista de espera" })).toBeVisible();
      await expect(page.getByText(/\/espera\?utm_source=qr&utm_campaign=pitch$/)).toBeVisible();
    } finally {
      await cleanup();
    }
  });
});
