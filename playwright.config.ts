import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);
// PLAYWRIGHT_BASE_URL (or E2E_BASE_URL) runs the suite against a deployed URL.
const remoteURL = process.env.PLAYWRIGHT_BASE_URL ?? process.env.E2E_BASE_URL;
const baseURL = remoteURL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
  // Runs against a production build; set E2E_BASE_URL to test a deployed URL instead.
  webServer: remoteURL
    ? undefined
    : {
        // Separate dist dir so e2e builds never clobber a running `pnpm dev`.
        command: `pnpm build && pnpm start -p ${PORT}`,
        env: { NEXT_DIST_DIR: ".next-e2e" },
        url: baseURL,
        timeout: 240_000,
        reuseExistingServer: !process.env.CI,
      },
});
