import { expect, test } from "@playwright/test";

test.describe("Kshamawani registration page", () => {
  test("shows the food registration form with useful guidance", async ({
    page,
  }) => {
    await page.goto("/registration.html");

    await expect(page.locator("h1")).toHaveText("क्षमावाणी २०२६");
    await expect(page.locator("#kshamawani-form")).toBeVisible();
    await expect(page.locator("#name")).toBeVisible();
    await expect(page.locator("#address")).toHaveAttribute(
      "placeholder",
      "उदा. फ्लैट 101, ABC सोसाइटी, खराड़ी, पुणे",
    );
    await expect(page.locator("#mobile")).toBeVisible();
    await expect(page.locator("#coupons")).toBeVisible();
    await expect(page.locator("#submit-button")).toHaveCSS(
      "border-radius",
      "12px",
    );
  });

  test("validates the required fields without calling the service", async ({
    page,
  }) => {
    await page.goto("/registration.html");

    await page.locator("#submit-button").click();

    await expect(page.locator("#form-message")).toHaveText(
      "कृपया नाम दर्ज करें।",
    );
  });
});
