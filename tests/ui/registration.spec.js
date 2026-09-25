import { expect, test } from "@playwright/test";

async function mockRegistrationConfig(page, opensAt) {
  await page.route(
    "http://127.0.0.1:4173/data/kshamawani-2026.json",
    async (route) => {
      const response = await route.fetch();
      const config = await response.json();
      config.registration.opensAt = opensAt;
      await route.fulfill({
        status: response.status(),
        contentType: "application/json",
        body: JSON.stringify(config),
      });
    },
  );
}

async function mockRegistrationOpen(page) {
  await mockRegistrationConfig(page, "2026-09-25T00:00:00+05:30");
}

async function mockRegistrationClosed(page) {
  await mockRegistrationConfig(page, "2099-09-25T16:30:00+05:30");
}

async function mockFirebaseSdk(page) {
  await page.route("http://127.0.0.1:4173/js/firebase-client.js", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `export function createFirebaseFunctionsClient() {
  return {};
}
export async function callFirebaseFunction(functions, functionName, data) {
  const response = await fetch(
    \`https://asia-south1-jain-community-platform.cloudfunctions.net/\${functionName}\`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    },
  );
  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.error.message || "Callable failed");
  }
  return { data: payload.result };
}`,
    });
  });
}

async function mockFirebaseFunction(page, functionName, result) {
  await page.route(
    `https://asia-south1-jain-community-platform.cloudfunctions.net/${functionName}`,
    async (route) => {
      expect(route.request().headers()["content-type"]).toContain(
        "application/json",
      );
      expect(route.request().postDataJSON()).toHaveProperty("data");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ result }),
      });
    },
  );
}

test.describe("Kshamawani registration page", () => {
  test("starts with mobile lookup and hides registration details", async ({
    page,
  }) => {
    await mockFirebaseSdk(page);
    await mockRegistrationClosed(page);
    await page.goto("/registration.html");

    await expect(page.locator("#registration-opening-overlay")).toBeVisible();
    await expect(page.locator("#registration-opening-title")).toHaveText(
      "पंजीकरण शाम ४:३० बजे खुलेगा",
    );
    await expect(page.locator("#lookup-mobile")).toBeDisabled();
    await expect(page.locator("#lookup-button")).toBeVisible();
    await expect(page.locator("#details-section")).toBeHidden();
    await expect(page.locator("#success-section")).toBeHidden();
  });

  test("shows address guidance and six-coupon maximum in the registration form", async ({
    page,
  }) => {
    await mockFirebaseSdk(page);
    await mockRegistrationOpen(page);
    await page.goto("/registration.html");

    await expect(page.locator("#address")).toHaveAttribute(
      "placeholder",
      "उदा. फ्लैट 101, ABC सोसाइटी, खराड़ी, पुणे",
    );
    await expect(page.locator("#coupons")).toHaveAttribute("max", "6");
  });

  test("validates the mobile number before lookup", async ({ page }) => {
    await mockFirebaseSdk(page);
    await mockRegistrationOpen(page);
    await page.goto("/registration.html");

    await page.locator("#lookup-button").click();

    await expect(page.locator("#lookup-message")).toHaveText(
      "कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।",
    );
  });

  test("shows that an existing mobile number is already registered", async ({
    page,
  }) => {
    await mockFirebaseSdk(page);
    await mockFirebaseFunction(page, "kshamawaniLookup", {
      exists: true,
      registration: {
        registrationId: "KW26-TEST01",
        applicationCode: "KW26-TEST01",
        mobile: "9860699870",
        name: "Arpit Jain",
        coupons: 4,
      },
    });

    await mockRegistrationOpen(page);
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

  test("creates a new registration from the form without a follow-up lookup", async ({
    page,
  }) => {
    let lookupCalls = 0;
    await page.route(
      "https://asia-south1-jain-community-platform.cloudfunctions.net/kshamawaniLookup",
      async (route) => {
        lookupCalls += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ result: { exists: false } }),
        });
      },
    );
    await mockFirebaseSdk(page);
    await mockFirebaseFunction(page, "kshamawaniCreate", {
      registrationId: "KW26-0011",
      applicationCode: "KW26-0011",
      registration: {
        registrationId: "KW26-0011",
        applicationCode: "KW26-0011",
        mobile: "8511278527",
        name: "Pratik Jain",
        coupons: 4,
        tokensIssued: false,
      },
    });

    await mockRegistrationOpen(page);
    await page.goto("/registration.html");
    await page.locator("#lookup-mobile").fill("8511278527");
    await page.locator("#lookup-button").click();
    await page.locator("#name").fill("Pratik Jain");
    await page.locator("#address").fill("C 403 Dreams Veeroday");
    await page.locator("#coupons").fill("4");
    await page.locator("#submit-button").click();

    await expect(page.locator("#success-title")).toHaveText("पंजीकरण सफल रहा");
    await expect(page.locator("#application-code")).toHaveText("KW26-0011");
    expect(lookupCalls).toBe(1);
  });
});
