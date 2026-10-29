import { expect, test } from "@playwright/test";

test("the current Chaturmas home page is reachable and shows its primary content", async ({
  page,
}) => {
  await page.goto("/index.html");

  await expect(page).toHaveTitle(/जिनधर्म आराधना चातुर्मास २०२६/);
  await expect(page.locator("h1")).toContainText("जिनधर्म आराधना");
  await expect(
    page.locator(".home-registration-card, #registration-closed-modal"),
  ).toHaveCount(0);
});

test("daily highlights populate date and fallback content even when optional daily data is unavailable", async ({
  page,
}) => {
  await page.route("**/data/announcements.json*", (route) =>
    route.fulfill({ status: 503, body: "temporarily unavailable" }),
  );
  await page.route("**/data/hindu-calendar.json*", (route) =>
    route.fulfill({ status: 503, body: "temporarily unavailable" }),
  );

  await page.goto("/index.html");

  await expect(page.locator("#todays-date")).not.toBeEmpty();
  await expect(page.locator("#todays-shrav")).not.toBeEmpty();
  await expect(page.locator("#todays-announcement")).not.toBeEmpty();
});
