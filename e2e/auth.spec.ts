import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { anonymousSignInsEnabled } from "./anon";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

// Hackathon mode: no login screen. Opening the profile starts an anonymous guest session.
test.describe("guest session", () => {
  test.skip(!configured, "Supabase not configured");
  test.beforeAll(async () => {
    test.skip(!(await anonymousSignInsEnabled()), "Enable anonymous sign-ins in Supabase (Authentication → Sign In / Providers)");
  });

  test("a visitor opens the profile without logging in and edits it", async ({ page }) => {
    await page.goto("/perfil");
    await expect(page).toHaveURL(/\/perfil$/);
    await expect(page.getByRole("heading", { name: "Meu perfil" })).toBeVisible();
    await expect(page.getByText(/como visitante/)).toBeVisible();
    await expect(page.getByLabel("Nome")).toHaveValue(/^Viajante [0-9A-F]{4}$/);

    await page.getByLabel("Nome").fill("Nômade E2E");
    await page.getByRole("button", { name: "Salvar perfil" }).click();
    await expect(page.getByText("Perfil salvo.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Nome")).toHaveValue("Nômade E2E");
  });
});
