import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

test.describe("magic link sign-in", () => {
  test.skip(!url || !serviceKey, "Supabase not configured");

  const email = `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  let userId = "";

  test.afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  test("signed-out users are sent to /entrar, then see their own profile", async ({ page }) => {
    await page.goto("/perfil");
    await expect(page).toHaveURL(/\/entrar\?next=%2Fperfil/);
    await expect(page.getByRole("button", { name: "Receber link de acesso" })).toBeVisible();

    // Stand-in for clicking the link in the e-mail.
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    expect(error).toBeNull();
    userId = data.user!.id;
    await page.goto(`/auth/callback?token_hash=${data.properties!.hashed_token}&type=email&next=/perfil`);

    await expect(page).toHaveURL(/\/perfil$/);
    await expect(page.getByRole("heading", { name: "Meu perfil" })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByText("Verificação pendente")).toBeVisible();

    await page.getByLabel("Nome").fill("Nômade E2E");
    await page.getByLabel("Bio curta").fill("Teste automático");
    await page.getByRole("button", { name: "Salvar perfil" }).click();
    await expect(page.getByText("Perfil salvo.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Nome")).toHaveValue("Nômade E2E");

    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/mapa\//);
    await page.goto("/perfil");
    await expect(page).toHaveURL(/\/entrar/);
  });
});
