import { expect, test } from "@playwright/test";

test.describe("Registration page", () => {
  test("shows that registration is closed", async ({ page }) => {
    await page.goto("/registration.html");

    await expect(page.locator("#registration-closed-message")).toBeVisible();
    await expect(
      page.locator("#registration-closed-title"),
    ).toHaveText("पंजीकरण बंद है");
    await expect(page.locator("#registration-closed-message")).toContainText(
      "पंजीकरण अब स्वीकार नहीं किए जा रहे हैं",
    );
    await expect(page.locator("#registration-form")).toHaveCount(0);
    await expect(page.locator("#rules-box")).toHaveCount(0);
  });
});
