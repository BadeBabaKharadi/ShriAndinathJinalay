import { expect, test } from "@playwright/test";

test.describe("Kshamawani registration page", () => {
  test("starts with mobile lookup and hides registration details", async ({
    page,
  }) => {
    await page.goto("/registration.html");

    await expect(page.locator("#lookup-mobile")).toBeVisible();
    await expect(page.locator("#lookup-button")).toBeVisible();
    await expect(page.locator("#details-section")).toBeHidden();
    await expect(page.locator("#success-section")).toBeHidden();
  });

  test("shows address guidance and four-coupon maximum in the registration form", async ({
    page,
  }) => {
    await page.goto("/registration.html");

    await expect(page.locator("#address")).toHaveAttribute(
      "placeholder",
      "उदा. फ्लैट 101, ABC सोसाइटी, खराड़ी, पुणे",
    );
    await expect(page.locator("#coupons")).toHaveAttribute("max", "4");
  });

  test("validates the mobile number before lookup", async ({ page }) => {
    await page.goto("/registration.html");

    await page.locator("#lookup-button").click();

    await expect(page.locator("#lookup-message")).toHaveText(
      "कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।",
    );
  });

  test("shows that an existing mobile number is already registered", async ({
    page,
  }) => {
    await page.route("**/exec?api=lookupRegistration*", async (route) => {
      const callbackMatch = route
        .request()
        .url()
        .match(/[?&]callback=([^&]+)/);
      const callback = callbackMatch
        ? decodeURIComponent(callbackMatch[1])
        : "";
      await route.fulfill({
        contentType: "application/javascript",
        body: `${callback}(${JSON.stringify({
          success: true,
          exists: true,
          registration: {
            registrationId: "KW26-TEST01",
            applicationCode: "KW26-TEST01",
            mobile: "9860699870",
            name: "Arpit Jain",
            coupons: 4,
          },
        })})`,
      });
    });

    await page.goto("/registration.html");
    await page.locator("#lookup-mobile").fill("9860699870");
    await page.locator("#lookup-button").click();

    await expect(page.locator("#success-title")).toHaveText(
      "आपका पंजीकरण पहले से दर्ज है",
    );
    await expect(page.locator("#success-summary")).toHaveText(
      "Arpit Jain के लिए 4 भोजन कूपन पहले से दर्ज हैं।",
    );
    await expect(page.locator("#edit-button")).toBeVisible();
  });
});
