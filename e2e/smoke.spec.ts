import { expect, test } from "@playwright/test";

test("home lets visitors choose a city and renders the state map", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading",{name:"Sua próxima cidade começa aqui"})).toBeVisible();
  await page.getByLabel("Ou escolha sua cidade").fill("Santos");
  await page.getByRole("link",{name:"Santos",exact:true}).click();
  await expect(page).toHaveURL(/\/mapa\/sp\?city=santos$/);
  await expect(page.getByRole("region", { name: /Mapa de Santos/ })).toBeVisible();
  const map = page.locator("[data-map-ready=true]");
  await expect(map).toBeVisible({ timeout: 30_000 });
  // The map must fill the viewport (full-screen map is the whole UI).
  const box = await map.boundingBox();
  const viewport = page.viewportSize();
  expect(box?.width).toBe(viewport?.width);
  expect(box?.height).toBe(viewport?.height);
  await expect(page.getByText("OpenStreetMap", { exact: false }).first()).toBeAttached();
});

test("unknown city returns 404", async ({ page }) => {
  const res = await page.goto("/mapa/nao-existe");
  expect(res?.status()).toBe(404);
});

test("web manifest is installable", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBeTruthy();
  const manifest = await res.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  for (const icon of manifest.icons) {
    const img = await request.get(icon.src);
    expect(img.ok()).toBeTruthy();
    expect(img.headers()["content-type"]).toContain("image/png");
  }
});
