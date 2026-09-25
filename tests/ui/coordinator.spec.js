import { expect, test } from "@playwright/test";

const FIREBASE_BASE =
  "https://asia-south1-jain-community-platform.cloudfunctions.net";

async function mockFirebase(page, functionName, payload, status = 200) {
  await page.route(
    `${FIREBASE_BASE}/${functionName}`,
    async (route) => {
      expect(route.request().headers()["content-type"]).toContain(
        "application/json",
      );
      expect(route.request().postDataJSON()).toHaveProperty("data");
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(payload),
      });
    },
  );
}

test.describe("Kshamawani coordinator access", () => {
  test("hides the access section after Firebase verifies the key", async ({
    page,
  }) => {
    await mockFirebase(page, "kshamawaniVerifyAccess", {
      result: { verified: true },
    });

    await page.goto("/coordinator-7x9p2.html");

    await expect(page.locator("#access-panel")).toBeVisible();
    await expect(page.locator("#access-verified")).toBeHidden();

    await page.locator("#access-key").fill("test-access-key");
    await page.locator("#access-button").click();

    await expect(page.locator("#access-panel")).toBeHidden();
    await expect(page.locator("#access-verified")).toBeVisible();
    await expect(page.locator("#access-verified")).toHaveAttribute(
      "aria-label",
      "सत्यापित",
    );
    await expect(page.locator("#scanner-start-panel")).toBeVisible();
    await expect(page.locator("#status")).toContainText(
      "सत्यापन पूरा है",
    );
  });

  test("keeps the access section visible when Firebase rejects the key", async ({
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

    await page.goto("/coordinator-7x9p2.html");
    await page.locator("#access-key").fill("wrong-key");
    await page.locator("#access-button").click();

    await expect(page.locator("#access-panel")).toBeVisible();
    await expect(page.locator("#access-verified")).toBeHidden();
    await expect(page.locator("#status")).toContainText(
      "सुरक्षा कुंजी गलत है या समाप्त हो गई है",
    );
  });
});
