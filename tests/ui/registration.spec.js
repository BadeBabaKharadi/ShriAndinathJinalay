import { expect, test } from "@playwright/test";

test.describe("Registration page", () => {
  test("loads the registration workflow", async ({ page }) => {
    await page.goto("/registration.html");

    await expect(page.locator("#rules-box")).toBeVisible();
    await expect(page.locator("#rules-accepted")).toBeVisible();
    await expect(page.locator("#continue-button")).toBeVisible();
    await expect(page.locator("#mobile-section")).toBeHidden();
    await expect(page.locator("#registration-form-section")).toBeHidden();
  });

  test("prevents continuing until rules are accepted", async ({ page }) => {
    await page.goto("/registration.html");

    await expect(page.locator("#continue-button")).toBeDisabled();
    await expect(page.locator("#rules-accepted")).toBeDisabled();
  });
});
