import { expect, test } from "@playwright/test";

test.describe("Registration page", () => {
  test("shows that registration is closed", async ({ page }) => {
    await page.goto("/registration.html");

    const closedMessage = page.locator("#registration-closed-message");
    const closedTitle = page.locator("#registration-closed-title");

    await expect(closedMessage).toBeVisible();
    await expect(closedTitle).toHaveText("पंजीकरण बंद है");
    await expect(closedMessage).toContainText(
      "पंजीकरण अब स्वीकार नहीं किए जा रहे हैं",
    );
    await expect(page.locator("#registration-form")).toHaveCount(0);
    await expect(page.locator("#rules-box")).toHaveCount(0);
  });
});
