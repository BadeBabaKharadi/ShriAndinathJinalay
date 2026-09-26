import { expect, test } from "@playwright/test";

const SERVICE_BASE =
  "https://asia-south1-jain-community-platform.cloudfunctions.net";

async function mockService(
  page,
  functionName,
  payload,
  status = 200,
  delayMs = 0,
) {
  const url = `${SERVICE_BASE}/${functionName}`;
  await page.route(url, async (route) => {
    expect(route.request().headers()["content-type"]).toContain(
      "application/json",
    );
    expect(route.request().postDataJSON()).toHaveProperty("data");
    if (delayMs) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
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
  bookingTrend: {
    daily: [
      { period: "2026-09-24", registrations: 1, coupons: 6 },
      { period: "2026-09-25", registrations: 11, coupons: 33 },
    ],
    hourly: [
      { period: "2026-09-25T10:00", registrations: 3, coupons: 9 },
      { period: "2026-09-25T11:00", registrations: 5, coupons: 15 },
      { period: "2026-09-25T12:00", registrations: 3, coupons: 9 },
    ],
    twoHourly: [
      { period: "2026-09-25T10:00", registrations: 8, coupons: 24 },
      { period: "2026-09-25T12:00", registrations: 3, coupons: 9 },
    ],
  },
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
    await mockService(page, "kshamawaniVerifyAccess", {
      data: { verified: true },
    });
    await mockService(page, "kshamawaniAdminStats", {
      data: stats,
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
    await expect(page.locator("#refresh")).toHaveClass(/refresh-button/);
    await expect(page.locator("#refresh")).not.toHaveClass(/refresh$/);
    await expect(page.locator("#registrations")).toHaveText("12");
    await expect(page.locator("#booked")).toHaveText("39");

    await expect(
      page.locator('.trend-control[data-trend="daily"]'),
    ).toHaveClass(/active/);
    await expect(page.locator("#trend-chart")).toBeVisible();
    await page.locator('.trend-control[data-trend="hourly"]').click();
    await expect(
      page.locator('.trend-control[data-trend="hourly"]'),
    ).toHaveClass(/active/);
    await expect(page.locator("#trend-chart .trend-point")).toHaveCount(3);

    await page.locator('.trend-control[data-trend="twoHourly"]').click();
    await expect(page.locator("#trend-chart .trend-point")).toHaveCount(2);
  });

  test("shows refresh progress while stats are loading", async ({ page }) => {
    await mockService(page, "kshamawaniVerifyAccess", {
      data: { verified: true },
    });
    await mockService(
      page,
      "kshamawaniAdminStats",
      {
        data: stats,
      },
      200,
      350,
    );

    await page.goto("/admin-7x9p2.html");
    await page.locator("#admin-key").fill("test-access-key");
    await page.locator("#unlock").click();

    await expect(page.locator("#refresh")).toHaveClass(/is-loading/);
    await expect(page.locator("#refresh")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await expect(page.locator("#refresh")).toHaveAttribute(
      "aria-label",
      "आँकड़े ताज़ा हो रहे हैं…",
    );

    await expect(page.locator("#registrations")).toHaveText("12");
    await expect(page.locator("#refresh")).not.toHaveClass(/is-loading/);
    await expect(page.locator("#refresh")).not.toHaveAttribute("aria-busy");
    await expect(page.locator("#refresh")).toHaveAttribute(
      "aria-label",
      "आँकड़े ताज़ा करें",
    );
  });

  test("clears the search after a successful deletion", async ({ page }) => {
    await mockService(page, "kshamawaniVerifyAccess", {
      data: { verified: true },
    });
    await mockService(page, "kshamawaniAdminStats", {
      data: stats,
    });
    await mockService(page, "kshamawaniAdminLookup", {
      data: {
        registration: {
          applicationCode: "KW26-0012",
          mobile: "9028256379",
          name: "Test Registration",
          address: "Test Address",
          coupons: 3,
          tokensIssued: false,
        },
      },
    });
    await mockService(page, "kshamawaniAdminDelete", {
      data: {
        deleted: {
          applicationCode: "KW26-0012",
          mobile: "9028256379",
        },
      },
    });

    page.on("dialog", (dialog) => dialog.accept());
    await page.goto("/admin-7x9p2.html");
    await page.locator("#admin-key").fill("test-access-key");
    await page.locator("#unlock").click();

    await page.locator("#search-mobile").fill("9028256379");
    await page.locator("#search").click();

    await expect(page.locator("#search-result")).toBeVisible();
    await expect(page.locator("#delete")).toBeEnabled();

    await page.locator("#delete").click();

    await expect(page.locator("#search-result")).toBeHidden();
    await expect(page.locator("#search-mobile")).toHaveValue("");
    await expect(page.locator("#delete")).toBeDisabled();
  });

  test("keeps the access section visible when verification is rejected", async ({
    page,
  }) => {
    await mockService(
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
