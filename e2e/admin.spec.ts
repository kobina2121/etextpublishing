import { expect, test } from "@playwright/test";

import { signInAsAdmin, TEST_ADMIN_EMAIL } from "./support/admin-session";
import { setRole } from "./support/db";

test.beforeEach(async ({ context }) => {
  await signInAsAdmin(context);
});

test("an admin session reaches the dashboard", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("link", { name: "Categories" }).first()).toBeVisible();

  // And /login sends a signed-in admin straight on.
  await page.goto("/login");
  await expect(page).toHaveURL(/\/admin$/);
});

test("a category round-trips create → edit → delete", async ({ page }) => {
  const name = `E2E Category ${Date.now()}`;
  const renamed = `${name} renamed`;

  await page.goto("/admin/categories/new");
  await page.getByLabel("Name").fill(name);
  const slug = page.getByLabel("Slug");
  if ((await slug.inputValue()) === "") {
    await slug.fill(name.toLowerCase().replace(/\s+/g, "-"));
  }
  await page.getByRole("button", { name: "Create category" }).click();

  await expect(page).toHaveURL(/\/admin\/categories$/);
  await page.getByRole("link", { name, exact: true }).click();

  await page.getByLabel("Name").fill(renamed);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/admin\/categories$/);

  const row = page.getByRole("row").filter({ hasText: renamed });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

  // Wait for the server to confirm. Checking only that the row has gone let
  // the test end — and close the browser — before the delete had finished,
  // which left test categories behind.
  await expect(page.getByText("Category deleted.")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: renamed })).toHaveCount(0);
});

test("revoking admin takes effect on the next request", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin$/);

  // The same session cookie, but the account is no longer an admin.
  await setRole(TEST_ADMIN_EMAIL, "customer");
  try {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/account$/);
  } finally {
    await setRole(TEST_ADMIN_EMAIL, "admin");
  }
});
