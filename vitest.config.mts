import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts", "supabase/tests/**/*.test.ts"],
    testTimeout: 30_000,
    environment: "node",
    // The hosted Supabase auth API has a shared burst limit across integration suites.
    fileParallelism: false,
  },
});
