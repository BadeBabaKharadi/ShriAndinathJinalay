import { expect, test } from "@playwright/test";

const FIREBASE_BASE =
  "https://asia-south1-jain-community-platform.cloudfunctions.net";

async function mockFirebase(page, functionName, payload, status = 200) {
  const url = `${FIREBASE_BASE}/${functionName}`;
  await page.route(url, async (route) => {
    expect(route.request().headers()["content-type"]).toContain(
      "application/json",
    );
    expect(route.request().postDataJSON()).toHaveProperty("data");
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });
}

const stats = {
  registrations: 12,
  totalCouponsBooked: 39,
  totalPhysicalCouponsIssued: 0,
  pendingPhysicalCouponRegistrations: 12,
  registrationsWithTokens: 0,
  averageCouponsPerRegistration: 3.25,
  byDate: [
    {
      date: "2026-09-25",
      registrations: 12,
      coupons: 39,
      physicalCouponsIssued: 0,
    },
  ],
  byCouponCount: [
    { coupons: 2, count: 3 },
    { coupons: 3, count: 3 },
    { coupons: 4, count: 4 },
    { coupons: 5, count: 1 },
    { coupons: 6, count: 1 },
  ],
};

test.describe("Kshamawani admin access", () => {
  test("hides the access section and shows the compact refresh control after verification", async ({
    page,
  }) => {
    await mockFirebase(page, "kshamawaniVerifyAccess", {
      result: { verified: true },
    });
    await mockFirebase(page, "kshamawaniAdminStats", {
      result: stats,
    });

    await page.goto("/admin-7x9p2.html");

    await expect(page.locator("#access-panel")).toBeVisible();
    await expect(page.locator("#access-verified")).toBeHidden();
    await expect(page.locator("#dashboard")).toBeHidden();

    await page.locator("#admin-key").fill("test-access-key");
    await page.locator("#unlock").click();

    await expect(page.locator("#access-panel")).toBeHidden();
    await expect(page.locator("#access-verified")).toBeVisible();
    await expect(page.locator("#dashboard")).toBeVisible();
    await expect(page.locator("#refresh")).toBeVisible();
    await expect(page.locator("#refresh")).toHaveAttribute(
      "aria-label",
      "आँकड़े ताज़ा करें",
    );
    await expect(page.locator("#refresh")).not.toHaveClass(/refresh/);
    await expect(page.locator("#registrations")).toHaveText("12");
    await expect(page.locator("#booked")).toHaveText("39");
  });

  test("keeps the access section visible when verification is rejected", async ({
    page,
  }) => {
    await mockFirebase(
      page,
      "kshamawaniVerifyAccess",
      {
        error: {
          status: "PERMISSION_DENIED",
          message: "Unauthorized.",
        },
      },
      403,
    );

    await page.goto("/admin-7x9p2.html");
    await page.locator("#admin-key").fill("wrong-key");
    await page.locator("#unlock").click();

    await expect(page.locator("#access-panel")).toBeVisible();
    await expect(page.locator("#access-verified")).toBeHidden();
    await expect(page.locator("#dashboard")).toBeHidden();
  });
});
