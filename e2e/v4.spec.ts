import { createClient } from "@supabase/supabase-js";
import { devices, expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { anonymousSignInsEnabled } from "./anon";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

test("V4: create a weekly series, follow, approve every date and chat", async ({ browser, isMobile }) => {
  test.skip(!isMobile || !process.env.SUPABASE_SERVICE_ROLE_KEY, "Two phone contexts, configured database");
  test.skip(!(await anonymousSignInsEnabled()), "Anonymous sign-ins required");
  test.setTimeout(120_000);
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const a = await browser.newContext({ ...devices["Pixel 7"] });
  const b = await browser.newContext({ ...devices["Pixel 7"] });
  const creator = await a.newPage();
  const follower = await b.newPage();
  const title = `Weekly E2E ${Date.now()}`;
  let seriesId = "";
  try {
    await creator.goto("/atividade/nova?lugar=00000000-0000-4000-8000-0000000000c1");
    await creator.getByLabel("O que vamos fazer?").fill(title);
    await creator.getByRole("checkbox", { name: /Repetir toda semana/ }).check();
    await creator.getByRole("button", { name: "Criar roda" }).click();
    await expect(creator).toHaveURL(/\/serie\/[0-9a-f-]{36}/);
    seriesId = creator.url().match(/serie\/([0-9a-f-]{36})/)![1];
    const dates = creator.getByRole("region", { name: "Próximas datas" }).getByRole("link");
    await expect(dates).toHaveCount(6);
    await follower.goto(`/serie/${seriesId}`);
    await follower.getByRole("button", { name: "Seguir a série" }).click();
    await expect(follower.getByText("Pedido enviado.", { exact: true })).toBeVisible();
    await creator.reload();
    await creator.getByRole("button", { name: /^Aprovar .* na série$/ }).click();
    await follower.reload();
    await expect(follower.getByText("Você segue esta série e entra automaticamente nas próximas datas.")).toBeVisible();
    const { data: occ, error } = await db.from("activities").select("id").eq("series_id", seriesId);
    expect(error).toBeNull();
    const members = await db.from("activity_members").select("status").in("activity_id", occ!.map(o => o.id));
    expect(members.data).toHaveLength(6);
    expect(members.data!.every(m => m.status === "approved")).toBe(true);
    await creator.goto(`/atividade/${occ![0].id}`);
    await follower.goto(`/atividade/${occ![0].id}`);
    await follower.getByLabel("Mensagem", { exact: true }).fill("Até a próxima semana!");
    await follower.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(creator.getByText("Até a próxima semana!")).toBeVisible({ timeout: 10_000 });
  } finally {
    if (!seriesId) seriesId = (await db.from("activity_series").select("id").eq("title", title).maybeSingle()).data?.id ?? "";
    if (seriesId) {
      await db.from("activities").delete().eq("series_id", seriesId);
      await db.from("activity_series").delete().eq("id", seriesId);
    }
    await a.close();
    await b.close();
  }
});
