import { expect, test } from "@playwright/test";

test("the current Chaturmas home page is reachable and shows its primary content", async ({
  page,
}) => {
  await page.goto("/index.html");

  await expect(page).toHaveTitle(/जिनधर्म आराधना चातुर्मास २०२६/);
  await expect(page.locator("h1")).toContainText("जिनधर्म आराधना");
  await expect(
    page.getByRole("link", { name: "पंजीकरण करें" }),
  ).toHaveAttribute("href", "registration.html");
});
