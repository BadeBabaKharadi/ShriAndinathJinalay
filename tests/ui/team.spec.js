import { expect, test } from "@playwright/test";

test.describe("Team page", () => {
  test("loads teams collapsed by default", async ({ page }) => {
    await page.goto("/team.html");

    await expect(page).toHaveTitle(/टीम/);
    await expect(page.locator("h1")).toContainText("सेवा एवं समन्वय टीम");

    const cards = page.locator(".team-card");
    await expect(cards.first()).toBeVisible();

    const header = cards.first().locator(".team-card-header");
    const members = cards.first().locator(".team-members");

    await expect(header).toHaveAttribute("aria-expanded", "false");
    await expect(members).toBeHidden();
  });

  test("expands and collapses a team", async ({ page }) => {
    await page.goto("/team.html");

    const card = page.locator(".team-card").first();
    const header = card.locator(".team-card-header");
    const members = card.locator(".team-members");

    await header.click();
    await expect(header).toHaveAttribute("aria-expanded", "true");
    await expect(members).toBeVisible();
    await expect(card).toHaveClass(/is-expanded/);

    await header.click();
    await expect(header).toHaveAttribute("aria-expanded", "false");
    await expect(members).toBeHidden();
    await expect(card).not.toHaveClass(/is-expanded/);
  });

  test("renders member contact actions when a mobile number exists", async ({
    page,
  }) => {
    await page.goto("/team.html");

    const card = page.locator(".team-card").first();
    await card.locator(".team-card-header").click();

    const member = card.locator(".team-member").first();
    await expect(member).toBeVisible();

    const call = member.locator(".call-button");
    const whatsapp = member.locator(".whatsapp-button");

    await expect(call).toHaveAttribute("href", /^tel:\d{10}$/);
    await expect(whatsapp).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/91\d{10}$/,
    );
  });
});
