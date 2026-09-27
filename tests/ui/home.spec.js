import { expect, test } from "@playwright/test";

test("the current Chaturmas home page is reachable and shows its primary content", async ({
  page,
}) => {
  await page.goto("/index.html");

  await expect(page).toHaveTitle(/जिनधर्म आराधना चातुर्मास २०२६/);
  await expect(page.locator("h1")).toContainText("जिनधर्म आराधना");
  const registrationButton = page.getByRole("button", {
    name: "पंजीकरण बंद है",
  });
  await expect(registrationButton).toBeVisible();
  await registrationButton.click();
  await expect(page.locator("#registration-closed-modal")).toBeVisible();
  await expect(page.locator("#registration-closed-title")).toHaveText(
    "पंजीकरण बंद है",
  );
  await expect(page.locator("#registration-closed-message")).toContainText(
    "पंजीकरण अब बंद हो चुका है",
  );
  await page.getByRole("button", { name: "ठीक है" }).click();
  await expect(page.locator("#registration-closed-modal")).toBeHidden();
});
