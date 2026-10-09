import { expect, test } from "@playwright/test";

// M8: /sobre explains the product, privacy and data sources; it is reachable from the map.
test("about page covers privacy and OpenStreetMap attribution, linked from the map", async ({ page }) => {
  await page.goto("/mapa/santos");
  await expect(page.locator("[data-map-ready=true]")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Camadas do mapa" }).click();
  await page.getByRole("link", { name: "Sobre, privacidade e fontes" }).click();

  await expect(page).toHaveURL(/\/sobre$/);
  await expect(page.getByRole("heading", { name: "Sobre o SoloRota", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Privacidade" })).toBeVisible();
  await expect(page.getByText(/só quando são 3 ou mais/)).toBeVisible();
  await expect(page.getByRole("link", { name: "OpenStreetMap contributors" })).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
  await expect(page.getByRole("link", { name: "Entrar na lista de espera" })).toHaveAttribute("href", "/espera");
});

test("the team area is closed to visitors", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByText("Área da equipe.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Métricas/ })).toHaveCount(0);
});
