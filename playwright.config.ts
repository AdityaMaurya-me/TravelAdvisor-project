import { defineConfig, devices } from "@playwright/test";

const port = 3100;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.PLAYWRIGHT_EXTERNAL_SERVER ? undefined : {
    command: `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    // Smoke tests must not depend on live Supabase, map, route, or search
    // providers. Each exercised network response is mocked by the test.
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
      NEXT_PUBLIC_MAPTILER_API_KEY: "",
      GOOGLE_MAPS_DEMO_API_KEY: "",
      OPENROUTESERVICE_API_KEY: "",
      GEMINI_API_KEY: "",
    },
    // The suite must own the server so Windows can terminate it after tests.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
