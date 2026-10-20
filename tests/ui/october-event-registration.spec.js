import { Buffer } from "node:buffer";
import { expect, test } from "@playwright/test";

const functionsUrl =
  "https://asia-south1-jain-community-platform.cloudfunctions.net";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers":
    "authorization, content-type, x-firebase-appcheck, x-firebase-gmpid, x-firebase-client",
};

async function mockQrLibrary(page) {
  await page.route(
    "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
    (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: [
          'window.QRCode = function (element, options) { element.dataset.payload = options.text; element.style.width = options.width + "px"; element.style.height = options.height + "px"; };',
          "window.QRCode.CorrectLevel = { M: 0 };",
        ].join(" "),
      }),
  );
}

async function handleCallablePreflight(page) {
  await page.route("**/octoberEvent**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({
        status: 204,
        headers: corsHeaders,
      });
    }
    await route.fallback();
  });
}

async function mockCallable(page, name, result) {
  await page.route(`${functionsUrl}/${name}`, async (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({
        status: 204,
        headers: corsHeaders,
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: corsHeaders,
      body: JSON.stringify({ result }),
    });
  });
}

test("October event form is responsive and exposes both registration types", async ({
  page,
}) => {
  await mockQrLibrary(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await handleCallablePreflight(page);
  await page.goto("/october-event-registration.html");
  await expect(
    page.getByRole("heading", { name: /मंगलमय आयोजन/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "दीक्षा समारोह भोजन कूपन" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "बाहर से आने वाले यात्रियों हेतु आवास" }),
  ).toBeVisible();

  await page.getByRole("button", { name: /दीक्षा समारोह भोजन कूपन/ }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("मोबाइल नंबर *")).toBeVisible();
  await expect(page.locator(".event-wrap")).toBeVisible();
  await expect(page.locator("#address")).toHaveValue("");
  await expect(page.locator("#address")).toHaveAttribute(
    "placeholder",
    "उदा. फ्लैट 101, ABC सोसाइटी, खराड़ी, पुणे",
  );
});

test("lodging form shows one origin-city field instead of duplicate city inputs", async ({
  page,
}) => {
  await mockQrLibrary(page);
  await handleCallablePreflight(page);
  await page.goto("/october-event-registration.html");
  await page
    .getByRole("button", { name: "बाहर से आने वाले यात्रियों हेतु आवास" })
    .click();

  await expect(page.locator("#city")).toHaveCount(1);
  await expect(page.locator("#comingFrom")).toHaveCount(0);
  await expect(page.locator("#cityLabel")).toHaveText("कहाँ से आ रहे हैं? *");
  await expect(page.locator("#city")).toHaveValue("");
});

test("food registration submits details and renders the stable QR reference", async ({
  page,
}) => {
  await mockQrLibrary(page);
  await mockCallable(page, "octoberEventLookup", { exists: false });
  let submitted;
  await page.route(`${functionsUrl}/octoberEventSave`, async (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({
        status: 204,
        headers: corsHeaders,
      });
    }
    submitted = JSON.parse(route.request().postData()).data;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: corsHeaders,
      body: JSON.stringify({
        result: {
          exists: false,
          registration: { registrationId: "DKF26-ABC123", coupons: 3 },
        },
      }),
    });
  });

  await handleCallablePreflight(page);
  await page.goto("/october-event-registration.html");
  await page.getByRole("button", { name: /दीक्षा समारोह भोजन कूपन/ }).click();
  await page.getByLabel("मोबाइल नंबर *").fill("9876543210");
  await page.getByRole("button", { name: "खोजें और आगे बढ़ें" }).click();
  await expect(page.locator("#formFields")).toBeVisible();
  await page.getByLabel("पूरा नाम *").fill("Test Person");
  await page.getByLabel("पूरा पता *").fill("Pune address");
  await page.locator("#city").fill("Pune");
  await page.locator("#state").fill("Maharashtra");
  await page.locator("#coupons").selectOption("3");
  await page.getByRole("button", { name: "पंजीकरण सुरक्षित करें" }).click();

  await expect(page.locator("#confirmation")).toBeVisible();
  await expect(page.locator("#confirmCode")).toHaveText("DKF26-ABC123");
  await expect(page.locator("#formFields")).toBeHidden();
  await expect(page.locator("#lookupSection")).toBeHidden();
  await expect(page.locator("#submittedSummary")).toContainText("Test Person");
  await expect(page.locator("#qr")).toHaveAttribute(
    "data-payload",
    JSON.stringify({
      event: "october-2026",
      kind: "food",
      registrationId: "DKF26-ABC123",
    }),
  );
  expect(submitted).toMatchObject({
    kind: "food",
    mobile: "9876543210",
    name: "Test Person",
    coupons: 3,
  });
});

test("existing lodging registration can be edited without re-uploading Aadhaar", async ({
  page,
}) => {
  await mockQrLibrary(page);
  await page.route(`${functionsUrl}/octoberEventLookup`, async (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({
        status: 204,
        headers: corsHeaders,
      });
    }
    const request = JSON.parse(route.request().postData()).data;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: corsHeaders,
      body: JSON.stringify({
        result:
          request.kind === "stay"
            ? {
                exists: true,
                registration: {
                  registrationId: "DKS26-OLD123",
                  name: "Existing Traveller",
                  address: "Old address",
                  comingFrom: "Nashik",
                  checkInDate: "2026-10-25",
                  checkInTime: "12:30",
                  checkOutDate: "2026-10-26",
                  checkOutTime: "10:00",
                  male: 1,
                  female: 1,
                  children: 0,
                  aadhaarUploaded: true,
                },
              }
            : { exists: false },
      }),
    });
  });
  let submitted;
  await page.route(`${functionsUrl}/octoberEventSave`, async (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({
        status: 204,
        headers: corsHeaders,
      });
    }
    submitted = JSON.parse(route.request().postData()).data;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: corsHeaders,
      body: JSON.stringify({
        result: {
          exists: true,
          registration: { registrationId: "DKS26-OLD123" },
        },
      }),
    });
  });

  await handleCallablePreflight(page);
  await page.goto("/october-event-registration.html");
  await page
    .getByRole("button", { name: "बाहर से आने वाले यात्रियों हेतु आवास" })
    .click();
  await page.getByLabel("मोबाइल नंबर *").fill("9876543210");
  await page.getByRole("button", { name: "खोजें और आगे बढ़ें" }).click();
  await expect(page.locator("#confirmation")).toBeVisible();
  await expect(page.locator("#submittedSummary")).toContainText(
    "Existing Traveller",
  );
  await expect(page.locator("#qr")).toHaveAttribute(
    "data-payload",
    JSON.stringify({
      event: "october-2026",
      kind: "stay",
      registrationId: "DKS26-OLD123",
    }),
  );
  await expect(page.locator("#formFields")).toBeHidden();
  await page.getByRole("button", { name: "जानकारी संशोधित करें" }).click();
  await expect(page.locator("#formFields")).toBeVisible();
  await expect(page.locator("#name")).toHaveValue("Existing Traveller");
  await expect(page.locator("#checkInTime")).toHaveValue("12:30");
  await expect(page.locator("#aadhaar")).not.toHaveAttribute("required", "");
  await page.locator("#name").fill("Updated Traveller");
  await page.locator("#city").fill("Pune");
  await page.locator("#state").fill("Maharashtra");
  await page.locator("#pincode").fill("411014");
  await page.locator("#identityDocumentNumber").fill("234567890123");
  await page.locator("#checkOutDate").selectOption("2026-10-26");
  await page.locator("#checkOutTime").selectOption("10:00");
  await page.getByRole("button", { name: "पंजीकरण सुरक्षित करें" }).click();

  await expect(page.locator("#confirmCode")).toHaveText("DKS26-OLD123");
  await expect(page.locator("#qr")).toHaveAttribute(
    "data-payload",
    JSON.stringify({
      event: "october-2026",
      kind: "stay",
      registrationId: "DKS26-OLD123",
    }),
  );
  expect(submitted).toMatchObject({
    kind: "stay",
    name: "Updated Traveller",
    male: 1,
    female: 1,
    children: 0,
  });
  expect(submitted).not.toHaveProperty("aadhaarBase64");
});

const adminEmulatorUrl =
  "http://127.0.0.1:5001/jain-community-platform/asia-south1";

test("lodging admin denies an incorrect admin key", async ({ page }) => {
  await page.route(
    `${adminEmulatorUrl}/octoberEventVerifyAdmin`,
    async (route) => {
      if (route.request().method() === "OPTIONS") {
        return route.fulfill({
          status: 204,
          headers: corsHeaders,
        });
      }
      return route.fulfill({
        status: 403,
        contentType: "application/json",
        headers: corsHeaders,
        body: JSON.stringify({ error: { message: "Unauthorized." } }),
      });
    },
  );
  await handleCallablePreflight(page);
  await page.goto("/stay-admin-b8e1f6a4c9d2730a.html");
  await page.locator("#key").fill("wrong-key");
  await page.getByRole("button", { name: "सत्यापित करें" }).click();
  await expect(page.locator("#msg")).toHaveText("Unauthorized.");
});

test("authorized food admin can view details and export the filtered list", async ({
  page,
}) => {
  await page.route(
    `${adminEmulatorUrl}/octoberEventVerifyAdmin`,
    async (route) => {
      if (route.request().method() === "OPTIONS") {
        return route.fulfill({
          status: 204,
          headers: corsHeaders,
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: corsHeaders,
        body: JSON.stringify({ result: { verified: true } }),
      });
    },
  );
  await page.route(
    `${adminEmulatorUrl}/octoberEventAdminList`,
    async (route) => {
      if (route.request().method() === "OPTIONS") {
        return route.fulfill({
          status: 204,
          headers: corsHeaders,
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: corsHeaders,
        body: JSON.stringify({
          result: {
            registrations: [
              {
                registrationId: "DKF26-ABC123",
                name: "Test Person",
                mobile: "9876543210",
                address: "Pune address",
                coupons: 3,
              },
            ],
            summary: {
              registrations: 1,
              totalCoupons: 3,
              male: 0,
              female: 0,
              children: 0,
            },
          },
        }),
      });
    },
  );

  await handleCallablePreflight(page);
  await page.goto("/food-admin-a7f3c9d2e4b6815f.html");
  await page.locator("#key").fill("correct-key");
  await page.getByRole("button", { name: "सत्यापित करें" }).click();
  await expect(page.locator("#rows")).toContainText("Test Person");
  await page.getByRole("button", { name: "विवरण" }).click();
  await expect(page.locator('tr[data-details-for="DKF26-ABC123"]')).toContainText("Pune address");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV डाउनलोड" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("october-food-registrations.csv");
});

test("supports lodging check-in starting on 23 October", async ({ page }) => {
  await mockQrLibrary(page);
  await handleCallablePreflight(page);
  await page.goto("/october-event-registration.html");
  await page
    .getByRole("button", { name: "बाहर से आने वाले यात्रियों हेतु आवास" })
    .click();
  await page.getByLabel("मोबाइल नंबर *").fill("9876543210");
  await mockCallable(page, "octoberEventLookup", { exists: false });
  await page.getByRole("button", { name: "खोजें और आगे बढ़ें" }).click();
  await expect(page.locator("#formFields")).toBeVisible();
  await expect(page.locator("#checkInDate")).toContainText("23 अक्टूबर");
  await expect(page.locator("#checkInDate option").first()).toHaveValue("");
  await expect(page.locator("#checkInDate")).toHaveValue("");
  await page.locator("#checkInDate").selectOption("2026-10-23");
});

test("new lodging registration includes a selected Aadhaar document", async ({
  page,
}) => {
  await mockQrLibrary(page);
  await mockCallable(page, "octoberEventLookup", { exists: false });
  let submitted;
  await page.route(`${functionsUrl}/octoberEventSave`, async (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({
        status: 204,
        headers: corsHeaders,
      });
    }
    submitted = JSON.parse(route.request().postData()).data;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: corsHeaders,
      body: JSON.stringify({
        result: {
          exists: false,
          registration: { registrationId: "DKS26-NEW123" },
        },
      }),
    });
  });

  await handleCallablePreflight(page);
  await page.goto("/october-event-registration.html");
  await page
    .getByRole("button", { name: "बाहर से आने वाले यात्रियों हेतु आवास" })
    .click();
  await page.getByLabel("मोबाइल नंबर *").fill("9876543210");
  await page.getByRole("button", { name: "खोजें और आगे बढ़ें" }).click();
  await expect(page.locator("#formFields")).toBeVisible();
  await page.getByLabel("पूरा नाम *").fill("New Traveller");
  await page.getByLabel("पूरा पता *").fill("Pune address");
  await page.locator("#city").fill("Pune");
  await page.locator("#state").fill("Maharashtra");
  await page.locator("#pincode").fill("411014");
  await page.locator("#identityDocumentNumber").fill("234567890123");
  await page.getByLabel("कहाँ से आ रहे हैं? *").fill("Nashik");
  await page.locator("#checkInDate").selectOption("2026-10-23");
  await page.locator("#checkOutDate").selectOption("2026-10-26");
  await page.locator("#checkInTime").selectOption("12:00");
  await page.locator("#checkOutTime").selectOption("10:00");
  await page.locator("#male").fill("1");
  await page.locator("#female").fill("1");
  await page.locator("#children").fill("0");
  await page.locator("#aadhaar").setInputFiles({
    name: "aadhaar.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7 sample document"),
  });
  await page.getByRole("button", { name: "पंजीकरण सुरक्षित करें" }).click();

  await expect(page.locator("#confirmCode")).toHaveText("DKS26-NEW123");
  expect(submitted).toMatchObject({
    kind: "stay",
    mobile: "9876543210",
    name: "New Traveller",
    male: 1,
    female: 1,
    children: 0,
    aadhaarMime: "application/pdf",
    aadhaarFileName: "aadhaar.pdf",
  });
  expect(submitted.aadhaarBase64).toBeTruthy();
});
