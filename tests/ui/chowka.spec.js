import { URL } from "node:url";
import { expect, test } from "@playwright/test";

const API_URL =
  "https://script.google.com/macros/s/AKfycbxprS-2iO3gQTSpFci2-DKhgOEZcbFS-Cc_WFpNw5nULHj6P4GLM1OiJn0EfN7-iSSu4Q/exec";

const TODAY = "2026-08-25";
const THIRTY_DAYS_AGO = "2026-07-26";
const TOO_OLD = "2026-07-25";
const TOMORROW = "2026-08-26";

async function freezeToday(page) {
  await page.addInitScript((today) => {
    const RealDate = globalThis.Date;
    const fixedTime = new RealDate(`${today}T10:00:00`).getTime();

    class MockDate extends RealDate {
      constructor(...args) {
        if (args.length === 0) {
          super(fixedTime);
        } else {
          super(...args);
        }
      }

      static now() {
        return fixedTime;
      }
    }

    MockDate.parse = RealDate.parse;
    MockDate.UTC = RealDate.UTC;

    globalThis.Date = MockDate;
  }, TODAY);
}

async function mockChowkaApi(page, rows) {
  await page.route(`${API_URL}?**`, async (route) => {
    const url = new URL(route.request().url());

    if (url.searchParams.get("api") !== "chowka") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        available: rows.length > 0,
        rows,
      }),
    });
  });
}

function collectBrowserErrors(page) {
  const errors = [];

  page.on("pageerror", (error) => {
    errors.push(`PAGE ERROR: ${error.message}`);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`CONSOLE ERROR: ${message.text()}`);
    }
  });

  return errors;
}

async function expectNoBrowserErrors(errors) {
  expect(errors, `Browser errors detected:\n${errors.join("\n")}`).toEqual([]);
}

test.describe("Chowka section on home page", () => {
  test("loads Chowka JavaScript without browser errors", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);

    await freezeToday(page);
    await mockChowkaApi(page, []);

    await page.goto("/index.html");

    await expect(page.locator("#chowka-date")).toBeVisible();

    await expectNoBrowserErrors(browserErrors);
  });

  test("shows both confirmed Maharaj names and blanks remaining rows", async ({
    page,
  }) => {
    const browserErrors = collectBrowserErrors(page);

    await freezeToday(page);

    await mockChowkaApi(page, [
      {
        name: "चौका 1",
        address: "पुणे",
        maharaj: "१०८ मुनि श्री अजित सागर जी",
      },
      {
        name: "चौका 2",
        address: "पुणे",
        maharaj: "१०५ ऐलक श्री विवेकानंद सागर जी",
      },
      {
        name: "चौका 3",
        address: "पुणे",
        maharaj: "",
      },
      {
        name: "चौका 4",
        address: "पुणे",
        maharaj: "",
      },
    ]);

    await page.goto("/index.html");

    const chowkaSection = page.locator(".home-chowka-card");

    await expect(chowkaSection).toBeVisible();

    const rows = page.locator("#chowka-table-body tr");

    await expect(rows).toHaveCount(4);

    await expect(rows.nth(0).locator("td").nth(3)).toContainText(
      "१०८ मुनि श्री अजित सागर जी",
    );

    await expect(rows.nth(1).locator("td").nth(3)).toContainText(
      "१०५ ऐलक श्री विवेकानंद सागर जी",
    );

    await expect(rows.nth(2).locator("td").nth(3)).toHaveText("");

    await expect(rows.nth(3).locator("td").nth(3)).toHaveText("");

    await expect(page.locator(".not-confirmed")).toHaveCount(0);

    await expectNoBrowserErrors(browserErrors);
  });

  test("keeps placeholder when the same Maharaj is populated twice", async ({
    page,
  }) => {
    const browserErrors = collectBrowserErrors(page);

    await freezeToday(page);

    await mockChowkaApi(page, [
      {
        name: "चौका 1",
        address: "पुणे",
        maharaj: "१०८ मुनि श्री अजित सागर जी",
      },
      {
        name: "चौका 2",
        address: "पुणे",
        maharaj: "१०८ मुनि श्री अजित सागर जी",
      },
      {
        name: "चौका 3",
        address: "पुणे",
        maharaj: "",
      },
    ]);

    await page.goto("/index.html");

    const rows = page.locator("#chowka-table-body tr");

    await expect(rows).toHaveCount(3);

    await expect(rows.nth(2).locator("td").nth(3)).toContainText(
      "पड़गाहन के बाद अपडेट होगा",
    );

    await expectNoBrowserErrors(browserErrors);
  });

  test("sets today as maximum and 30 days ago as minimum", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);

    await freezeToday(page);
    await mockChowkaApi(page, []);

    await page.goto("/index.html");

    const dateInput = page.locator("#chowka-date");

    await expect(dateInput).toHaveAttribute("max", TODAY);

    await expect(dateInput).toHaveAttribute("min", THIRTY_DAYS_AGO);

    await expect(dateInput).toHaveValue(TODAY);

    await expectNoBrowserErrors(browserErrors);
  });

  test("allows exactly 30 days ago", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);

    await freezeToday(page);
    await mockChowkaApi(page, []);

    await page.goto("/index.html");

    const dateInput = page.locator("#chowka-date");

    await dateInput.fill(THIRTY_DAYS_AGO);

    await dateInput.dispatchEvent("change");

    await expect(dateInput).toHaveValue(THIRTY_DAYS_AGO);

    await expectNoBrowserErrors(browserErrors);
  });

  test("rejects a future date", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);

    await freezeToday(page);
    await mockChowkaApi(page, []);

    await page.goto("/index.html");

    const dateInput = page.locator("#chowka-date");

    await dateInput.fill(TOMORROW);
    await dateInput.dispatchEvent("change");

    await expect(dateInput).toHaveValue(TODAY);

    await expectNoBrowserErrors(browserErrors);
  });

  test("rejects a date older than 30 days", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);

    await freezeToday(page);
    await mockChowkaApi(page, []);

    await page.goto("/index.html");

    const dateInput = page.locator("#chowka-date");

    await dateInput.fill(TOO_OLD);
    await dateInput.dispatchEvent("change");

    await expect(dateInput).toHaveValue(TODAY);

    await expectNoBrowserErrors(browserErrors);
  });
});
