import { expect, test } from "@playwright/test";

test("primary navigation reaches the Team page", async ({ page }) => {
  await page.goto("/index.html");

  const teamLink = page.getByRole("link", { name: /टीम|team/i }).first();
  await expect(teamLink).toBeVisible();
  await teamLink.click();

  await expect(page).toHaveURL(/\/team\.html$/);
  await expect(page.locator("h1")).toContainText("सेवा एवं समन्वय टीम");
});
