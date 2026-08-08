import { expect, test } from "@playwright/test";

test("home renders the primary discovery journey", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Discover Every Place Worth Stopping For" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Search" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Find places around you" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Explore by Category" })).toBeVisible();
});

test("search suggestions stay visible, then open the correct place route", async ({ page }) => {
  await page.route("**/api/places/search?q=kune", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        places: [{
          id: "kune-id",
          name: "Kune Waterfalls",
          address: "Lonavala, Maharashtra",
          slug: "kune-waterfalls",
          level: "attraction",
          kind: "place",
          source: "curated",
        }],
        liveSearchStatus: "available",
      }),
    });
  });

  await page.goto("/");
  const input = page.locator("#homepage-place-search");
  await input.fill("kune");
  const suggestion = page.getByRole("button", { name: /Kune Waterfalls/ });
  await expect(suggestion).toBeVisible();
  await suggestion.click();
  await expect(page).toHaveURL(/\/place\/kune-waterfalls$/);
});

test("mobile navigation opens a readable menu and routes to collections", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile-only navigation check");
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.getByRole("button", { name: "Collections" }).click();
  await expect(page).toHaveURL(/\/collections$/);
});
