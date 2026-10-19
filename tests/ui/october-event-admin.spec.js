import { expect, test } from "@playwright/test";

const functionsUrl =
  "https://asia-south1-jain-community-platform.cloudfunctions.net";
const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers":
    "authorization, content-type, x-firebase-appcheck, x-firebase-gmpid, x-firebase-client",
};

async function mockCallable(page, name, result) {
  await page.route(`${functionsUrl}/${name}`, async (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: corsHeaders,
      body: JSON.stringify({ result }),
    });
  });
}

async function mockQrLibrary(page) {
  await page.route(
    "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
    (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: "window.QRCode = { toCanvas: async (canvas) => canvas }; window.QRCode.CorrectLevel = { M: 0 };",
      }),
  );
}

test("stay admin hides the key form after authorization and shows inline details with Aadhaar preview and day statistics", async ({
  page,
}) => {
  await mockCallable(page, "octoberEventVerifyAdmin", { verified: true });
  await mockCallable(page, "octoberEventAdminList", {
    registrations: [
      {
        registrationId: "DKS26-TEST123",
        name: "A Test",
        mobile: "9876543210",
        address: "Pune",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411014",
        comingFrom: "Nashik",
        male: 2,
        female: 1,
        children: 1,
        checkInDate: "2026-10-24",
        checkInTime: "10:30",
        checkOutDate: "2026-10-25",
        checkOutTime: "09:30",
        aadhaarAvailable: true,
      },
    ],
    summary: {
      registrations: 1,
      male: 2,
      female: 1,
      children: 1,
      dailyCheckIn: {
        "2026-10-24": { firstHalf: 1, secondHalf: 0 },
      },
      dailyCheckOut: {
        "2026-10-25": { firstHalf: 1, secondHalf: 0 },
      },
    },
  });
  await mockCallable(page, "octoberEventAdminAadhaar", {
    url: "https://private.example/id.jpg",
    mimeType: "image/jpeg",
    expiresInSeconds: 300,
  });
  await mockQrLibrary(page);
  await page.goto("/stay-admin-b8e1f6a4c9d2730a.html");
  await page.locator("#key").fill("valid-key");
  await page.locator("#login").click();

  await expect(page.locator("#authCard")).toBeHidden();
  await expect(page.locator("#authSuccess")).toContainText("✓");
  const row = page.locator('tr[data-registration-row="DKS26-TEST123"]');
  await expect(row.locator("td")).toHaveCount(12);
  await row.getByRole("button", { name: "विवरण" }).click();

  const details = page.locator('tr[data-details-for="DKS26-TEST123"]');
  await expect(details).toBeVisible();
  await expect(
    details.locator("img[alt='आधार दस्तावेज़ पूर्वावलोकन']"),
  ).toHaveAttribute("src", "https://private.example/id.jpg");
  await expect(page.locator("#dayStats")).toContainText("चेक-इन पहला हाफ");
  await expect(page.locator("#dayStats")).toContainText("2026-10-24");
});

test("food admin filters by coupon count and expands details below the matching row", async ({
  page,
}) => {
  await mockCallable(page, "octoberEventVerifyAdmin", { verified: true });
  await mockCallable(page, "octoberEventAdminList", {
    registrations: [
      {
        registrationId: "DKF26-AAA111",
        name: "One Guest",
        mobile: "9876543210",
        address: "Pune",
        coupons: 2,
      },
      {
        registrationId: "DKF26-BBB222",
        name: "Two Guest",
        mobile: "9876543211",
        address: "Mumbai",
        coupons: 3,
      },
    ],
    summary: { registrations: 2, totalCoupons: 5 },
  });
  await mockQrLibrary(page);
  await page.goto("/food-admin-a7f3c9d2e4b6815f.html");
  await page.locator("#key").fill("valid-key");
  await page.locator("#login").click();
  await page.locator("#couponFilter").fill("3");

  await expect(page.locator("#rows tr[data-registration-row]")).toHaveCount(1);
  await expect(page.locator("#rows")).toContainText("Two Guest");
  await page.locator("#rows button[data-detail]").click();
  await expect(
    page.locator('tr[data-details-for="DKF26-BBB222"]'),
  ).toBeVisible();
});
