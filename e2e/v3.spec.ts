import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { anonymousSignInsEnabled } from "./anon";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

// SPEC_V2 V3: create a stay → checklist persists → favorite shows on the map.
test.describe("V3: stay", () => {
  test.skip(!configured, "Supabase not configured");

  test("a foreign nomad creates a stay, ticks a task, saves a favorite and sees it on the map", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Phone flow; runs once, in the mobile project");
    test.skip(!(await anonymousSignInsEnabled()), "Enable anonymous sign-ins in Supabase");
    test.setTimeout(120_000);

    await page.goto("/estadia");
    await expect(page.getByRole("heading", { name: "Minha estadia" })).toBeVisible();
    await page.getByText("Nômade estrangeiro").click();
    await page.getByRole("button", { name: "Começar minha estadia" }).click();

    // Mini-onboarding: routine, then privacy (both switches start off).
    await expect(page.getByText("Passo 2 de 3", { exact: false })).toBeVisible({ timeout: 15_000 });
    await page.getByText("Manhã", { exact: true }).click();
    await page.getByText("Surf", { exact: true }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("checkbox", { name: /Aparecer para pessoas compatíveis/ })).not.toBeChecked();
    await expect(page.getByRole("checkbox", { name: /Contar em "Quem está aqui"/ })).not.toBeChecked();
    await page.getByRole("button", { name: "Concluir" }).click();

    await expect(page.getByText(/^Dia 1 de 31 em Santos$/)).toBeVisible({ timeout: 15_000 });

    // Checklist: the foreign items are there; ticking one persists.
    await page.getByRole("link", { name: "Tarefas" }).click();
    const task = page.getByRole("checkbox", { name: "Confirmar o seguro-saúde exigido pelo seu visto e guardar a apólice" });
    await expect(task).toBeVisible();
    await task.check();
    await expect(task).toBeChecked();
    await page.reload();
    await expect(page.getByRole("checkbox", { name: "Confirmar o seguro-saúde exigido pelo seu visto e guardar a apólice" })).toBeChecked();

    // Favorite from the Radar → Favoritos tab → star on the map.
    await page.goto("/radar/santos");
    const first = page.locator("[data-radar-card]").first();
    await first.getByRole("button", { name: "Salvar nos favoritos" }).click();
    await expect(first.getByRole("button", { name: "Tirar dos favoritos" })).toHaveAttribute("aria-pressed", "true");
    await page.goto("/estadia?aba=favoritos");
    await expect(page.getByRole("link", { name: "Cowork Demo Gonzaga" })).toBeVisible();

    await page.goto("/mapa/santos");
    await expect(page.locator("[data-map-ready=true]")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Camadas do mapa" }).click();
    await page.getByRole("switch", { name: "Meus favoritos" }).click();
    await expect(page.getByRole("img", { name: "Favorito: Cowork Demo Gonzaga" })).toBeAttached();
  });
});
