import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";

const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;
const testEnvironment = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
  NEXT_PUBLIC_MAPTILER_API_KEY: "",
  GOOGLE_MAPS_DEMO_API_KEY: "",
  OPENROUTESERVICE_API_KEY: "",
  GEMINI_API_KEY: "",
};

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)],
  // Provider calls are intentionally disabled in smoke mode; suppress any
  // rejected background requests while the browser assertions are running.
  { stdio: "ignore", windowsHide: true, env: testEnvironment },
);

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Test server stopped before it became ready (exit ${server.exitCode}).`);
    try {
      if ((await fetch(baseURL)).ok) return;
    } catch {
      // The server is still starting.
    }
    await delay(250);
  }
  throw new Error("Timed out waiting for the E2E test server.");
}

async function stopServer() {
  if (server.exitCode !== null) return;
  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const taskkill = spawn("taskkill.exe", ["/pid", String(server.pid), "/t", "/f"], { stdio: "ignore", windowsHide: true });
      taskkill.once("exit", resolve);
      taskkill.once("error", resolve);
    });
    return;
  }
  server.kill("SIGTERM");
}

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

async function runDesktopSmoke(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(baseURL);
  await page.getByRole("heading", { name: "Discover Every Place Worth Stopping For" }).waitFor();
  await page.getByRole("button", { name: "Search" }).waitFor();
  await page.getByText("Find places around you", { exact: true }).waitFor();
  await page.getByText("Explore by Category", { exact: true }).waitFor();

  await page.route("**/api/places/search?**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("q") !== "kune") return route.continue();
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ places: [{ source: "curated", name: "Kune Waterfalls", slug: "kune-waterfalls", city: "Lonavala", category: "Waterfall" }] }),
    });
  });
  await page.locator("#homepage-place-search").fill("kune");
  await page.getByText("Kune Waterfalls", { exact: true }).waitFor();
  await page.getByText("Kune Waterfalls", { exact: true }).click();
  await page.waitForURL(/\/place\/kune-waterfalls/);
  ensure(page.url().includes("/place/kune-waterfalls"), "Search did not open the canonical Kune Waterfalls page.");
  await page.close();
}

async function runMobileSmoke(browser) {
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
  await page.goto(baseURL);
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.getByRole("navigation", { name: "Mobile navigation" }).waitFor();
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByText("Collections", { exact: true }).click();
  await page.waitForURL(/\/collections/);
  ensure(page.url().includes("/collections"), "Mobile navigation did not route to Collections.");
  await page.close();
}

let exitCode = 0;
let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  await runDesktopSmoke(browser);
  await runMobileSmoke(browser);
  console.log("E2E smoke checks passed: discovery UI, canonical search route, and mobile navigation.");
} catch (error) {
  exitCode = 1;
  console.error(error);
} finally {
  await browser?.close();
  await stopServer();
  process.exit(exitCode);
}
