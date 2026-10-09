import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

// SPEC_V2 V0: demo login as a safety net for the pitch; demo accounts are labeled and not admins.
test.describe("demo login", () => {
  test.skip(process.env.NEXT_PUBLIC_DEMO_LOGIN !== "true" || !process.env.DEMO_LOGIN_PASSWORD, "Demo login off");

  test("a visitor signs in as a demo nomad, is not an admin, and signs out", async ({ page }) => {
    await page.goto("/entrar");
    await expect(page.getByRole("heading", { name: /Entrar numa conta de demonstração/ })).toBeVisible();
    await page.getByRole("button", { name: "Entrar como nômade A" }).click();

    await expect(page).toHaveURL(/\/perfil$/);
    await expect(page.getByText("ana.demo@example.com")).toBeVisible();

    await page.goto("/admin");
    await expect(page.getByText("Área da equipe.")).toBeVisible();

    await page.goto("/perfil");
    await page.getByRole("button", { name: "Sair desta conta" }).click();
    await expect(page).toHaveURL(/\/mapa\//, { timeout: 20_000 });
    await page.goto("/perfil");
    await expect(page.getByText("Você está como visitante neste aparelho.", { exact: false })).toBeVisible();
  });
});
