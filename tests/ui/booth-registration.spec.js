import { Buffer } from "node:buffer";
import { expect, test } from "@playwright/test";

/* global window */

const functionsBase = "https://booth-functions.test";
const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

async function setup(page) {
  await page.addInitScript(
    ({ functionsBase }) => {
      window.BOOTH_FUNCTIONS_BASE = functionsBase;
      window.BOOTH_PAYMENT_UPI_ID = "verified-trust@upi";
    },
    { functionsBase },
  );

  await page.route(
    "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
    (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: [
          "window.QRCode = function (el, opts) { el.dataset.payload = opts.text; };",
          "window.QRCode.CorrectLevel = { M: 0 };",
        ].join(" "),
      }),
  );
}

async function mockCallable(page, name, handler) {
  await page.route(`${functionsBase}/${name}`, async (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders });
    }

    const body = JSON.parse(route.request().postData() || "{}").data || {};
    const result =
      typeof handler === "function" ? await handler(body) : handler;

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: corsHeaders,
      body: JSON.stringify({ result }),
    });
  });
}

test("booth form validates mobile and displays rules", async ({ page }) => {
  await setup(page);
  await page.goto("/booth-registration.html");

  await expect(
    page.getByRole("heading", { name: /बूथ सुविधा पंजीकरण/ }),
  ).toBeVisible();
  await expect(page.locator("#availability")).toContainText(
    "UAT पंजीकरण सेवा कॉन्फ़िगर है",
  );
  await expect(page.locator("body")).toContainText("20 बूथ");
  await expect(page.locator("body")).toContainText("₹2,100");

  await page.locator("#mobile").fill("123");
  await page.locator("#lookup").click();
  await expect(page.locator("#status")).toContainText("सही 10 अंकों");
  await expect(page.locator("#consentCard")).toBeHidden();
});

test("new applicant can submit a receipt-backed registration", async ({
  page,
}) => {
  await setup(page);

  let lookupCount = 0;
  await mockCallable(page, "boothLookup", () => {
    lookupCount += 1;
    return lookupCount === 1
      ? { exists: false, available: 20 }
      : {
          exists: true,
          registration: {
            id: "booth-test-1",
            name: "Test Applicant",
            stallName: "Test Stall",
            businessType: "Food",
            mobile: "9876543210",
            society: "Test Society",
            city: "Pune",
            state: "Maharashtra",
            status: "pending",
            receiptUrl: "",
          },
        };
  });
  await mockCallable(page, "boothSave", {
    saved: true,
    registrationId: "booth-test-1",
    status: "pending",
    message: "Registration submitted for payment verification.",
  });

  await page.goto("/booth-registration.html");
  await page.locator("#mobile").fill("9876543210");
  await page.locator("#lookup").click();
  await expect(page.locator("#consentCard")).toBeVisible();

  await page.locator("#continue").click();
  await expect(page.locator("#status")).toContainText("नियम स्वीकार");
  await page.locator("#consent").check();
  await page.locator("#continue").click();

  await expect(page.locator("#paymentCard")).toBeVisible();
  await expect(page.locator("#qrBox [data-payload]")).toHaveAttribute(
    "data-payload",
    /^upi:\/\/pay/,
  );
  await page.locator("#paymentDone").click();
  await expect(page.locator("#formCard")).toBeVisible();

  await page.locator("#name").fill("Test Applicant");
  await page.locator("#stallName").fill("Test Stall");
  await page.locator("#businessType").fill("Food");
  await page.locator("#society").fill("Test Society");
  await page.locator("#city").fill("Pune");
  await page.locator("#state").fill("Maharashtra");
  await page.locator("#receipt").setInputFiles({
    name: "receipt.png",
    mimeType: "image/png",
    buffer: Buffer.from("sample image receipt"),
  });

  await expect(page.locator("#receiptPreview")).toBeVisible();
  await expect(page.locator("#uploadStatus")).toContainText("रसीद तैयार");
  await page.locator("#save").click();

  await expect(page.locator("#detailsCard")).toBeVisible();
  await expect(page.locator("#details")).toContainText("Test Applicant");
  await expect(page.locator("#details")).toContainText("भुगतान सत्यापन लंबित");
});

test("existing applicant can review and edit their details", async ({
  page,
}) => {
  await setup(page);
  await mockCallable(page, "boothLookup", {
    exists: true,
    registration: {
      id: "booth-existing",
      name: "Existing Applicant",
      stallName: "Existing Stall",
      businessType: "Clothing",
      mobile: "9876543210",
      society: "Existing Society",
      city: "Pune",
      state: "Maharashtra",
      status: "pending",
      receiptUrl: "https://example.test/receipt.png",
    },
  });

  await page.goto("/booth-registration.html");
  await page.locator("#mobile").fill("9876543210");
  await page.locator("#lookup").click();

  await expect(page.locator("#detailsCard")).toBeVisible();
  await expect(page.locator("#details")).toContainText("Existing Applicant");
  await page.locator("#edit").click();

  await expect(page.locator("#formCard")).toBeVisible();
  await expect(page.locator("#name")).toHaveValue("Existing Applicant");
  await expect(page.locator("#stallName")).toHaveValue("Existing Stall");
});

test("admin can review payments, disable records, and export CSV", async ({
  page,
}) => {
  await setup(page);
  await mockCallable(page, "boothAdminVerify", { verified: true });
  await mockCallable(page, "boothAdminList", {
    registrations: [
      {
        id: "booth-admin-1",
        name: "Admin Test",
        stallName: "Test Stall",
        businessType: "Food",
        mobile: "9876543210",
        society: "Test Society",
        city: "Pune",
        state: "Maharashtra",
        receiptUrl: "https://example.test/receipt.png",
        disabled: false,
        paymentVerified: false,
        createdAt: "2026-10-22T00:00:00.000Z",
      },
    ],
    activeCount: 1,
    available: 19,
  });
  await mockCallable(page, "boothAdminUpdate", { updated: true });

  await page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/booth-admin-2026.html");
  await page.locator("#key").fill("test-admin-key");
  await page.locator("#login").click();

  await expect(page.locator("#rows")).toContainText("Admin Test");
  await expect(page.locator("#rows")).toContainText("रसीद खोलें");
  await page.locator('[data-action="verify"]').click();
  await page.locator('[data-action="disable"]').click();

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("booth-registrations.csv");
});
