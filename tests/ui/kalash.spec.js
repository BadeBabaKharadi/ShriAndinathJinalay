import { expect, test } from "@playwright/test";

test.describe("Kalash directory", () => {
  test("loads Kalash records and displays the sorting note", async ({
    page,
  }) => {
    await page.goto("/kalash.html");

    await expect(page).toHaveTitle(/कलश/);
    await expect(page.locator("h1")).toContainText("कलश स्थापना पुण्यार्जक");
    await expect(page.locator(".kalash-sort-note")).toContainText("कलश");

    const cards = page.locator(".kalash-card");
    await expect(cards.first()).toBeVisible();
    await expect(page.locator("#kalash-result-count")).not.toBeEmpty();
  });

  test("filters Kalash records by name and can clear filters", async ({
    page,
  }) => {
    await page.goto("/kalash.html");

    const nameFilter = page.locator("#kalash-name-filter");
    const clear = page.locator("#kalash-clear-filters");
    const count = page.locator("#kalash-result-count");

    await expect(nameFilter).toBeVisible();
    await expect(clear).toBeVisible();

    const initialCount = await count.textContent();
    await nameFilter.fill("zzzz-no-match");
    await expect(page.locator("#kalash-empty")).toBeVisible();

    await clear.click();
    await expect(page.locator("#kalash-empty")).toBeHidden();
    await expect(count).toHaveText(initialCount || "");
  });

  test("uses stable color classes for rendered Kalash cards", async ({
    page,
  }) => {
    await page.goto("/kalash.html");

    const classesBefore = await page
      .locator(".kalash-card")
      .evaluateAll((cards) =>
        cards.map((card) =>
          [...card.classList].filter((name) =>
            name.startsWith("kalash-card--"),
          ),
        ),
      );

    await page.reload();

    const classesAfter = await page
      .locator(".kalash-card")
      .evaluateAll((cards) =>
        cards.map((card) =>
          [...card.classList].filter((name) =>
            name.startsWith("kalash-card--"),
          ),
        ),
      );

    expect(classesAfter).toEqual(classesBefore);
  });
});
