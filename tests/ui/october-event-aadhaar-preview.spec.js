import { Buffer } from "node:buffer";
import { expect, test } from "@playwright/test";

const functionsUrl = "https://asia-south1-jain-community-platform.cloudfunctions.net";
const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers":
    "authorization, content-type, x-firebase-appcheck, x-firebase-gmpid, x-firebase-client",
};

async function mockQrLibrary(page) {
  await page.route(
    "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
    route =>
      route.fulfill({
        contentType: "application/javascript",
        body: 'window.QRCode = function (element, options) { element.dataset.payload = options.text; }; window.QRCode.CorrectLevel = { M: 0 };',
      }),
  );
}

async function mockLookup(page) {
  await page.route(`${functionsUrl}/octoberEventLookup`, async route => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: corsHeaders,
      body: JSON.stringify({ result: { exists: false } }),
    });
  });
}

test("Aadhaar selection shows a preview and upload animation, and can be removed", async ({ page }) => {
  await mockQrLibrary(page);
  await mockLookup(page);
  let releaseSave;
  const saveGate = new Promise(resolve => {
    releaseSave = resolve;
  });
  await page.route(`${functionsUrl}/octoberEventSave`, async route => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders });
    }
    await saveGate;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: corsHeaders,
      body: JSON.stringify({
        result: { exists: false, registration: { registrationId: "DKS26-NEW123" } },
      }),
    });
  });

  await page.goto("/october-event-registration.html");
  await page.getByRole("button", { name: "बाहर से आने वाले यात्रियों हेतु आवास" }).click();
  await page.getByLabel("मोबाइल नंबर *").fill("9876543210");
  await page.getByRole("button", { name: "खोजें और आगे बढ़ें" }).click();
  await expect(page.locator("#formFields")).toBeVisible();
  await page.getByLabel("पूरा नाम *").fill("New Traveller");
  await page.getByLabel("पूरा पता *").fill("Pune address");
  await page.getByLabel("कहाँ से आ रहे हैं? *").fill("Nashik");
  await page.locator("#male").fill("1");
  await page.locator("#female").fill("1");
  await page.locator("#children").fill("0");
  await page.locator("#aadhaar").setInputFiles({
    name: "aadhaar.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7 sample document"),
  });

  await expect(page.locator("#aadhaarPreview")).toContainText("aadhaar.pdf");
  await expect(page.locator("#aadhaarPreview iframe")).toBeVisible();
  await page.getByRole("button", { name: "पंजीकरण सुरक्षित करें" }).click();
  await expect(page.locator("#aadhaarUploadStatus")).toBeVisible();
  releaseSave();
  await expect(page.locator("#confirmCode")).toHaveText("DKS26-NEW123");
  await expect(page.locator("#aadhaarUploadStatus")).toBeHidden();
});
