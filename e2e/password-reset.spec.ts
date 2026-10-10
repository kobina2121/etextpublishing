import { expect, test, type Page } from "@playwright/test";

import { createResetToken, createTestUser, deleteTestUser, disconnect } from "./support/db";

/**
 * Forgot password, end to end, plus the show/hide toggle.
 *
 * The emailed link cannot be read from a test, so the token is planted directly
 * in the database — stored exactly as the app stores one — and everything from
 * the reset page onwards goes through the real UI.
 */
test.describe.configure({ mode: "serial" });

const email = `e2e-reset-${Date.now()}@example.com`;
const oldPassword = "e2e-old-password-1";
const newPassword = "e2e-new-password-2";
let userId: Awaited<ReturnType<typeof createTestUser>>;

test.beforeAll(async () => {
  userId = await createTestUser(email, oldPassword);
});

test.afterAll(async () => {
  await deleteTestUser(email);
  await disconnect();
});

async function signIn(page: Page, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("the password toggle shows and hides what was typed", async ({ page }) => {
  await page.goto("/login");
  const field = page.getByLabel("Password", { exact: true });
  await field.fill("secret-value");
  await expect(field).toHaveAttribute("type", "password");

  const toggle = page.getByRole("button", { name: "Show password" });
  await toggle.click();
  await expect(field).toHaveAttribute("type", "text");
  await expect(page.getByRole("button", { name: "Hide password" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(field).toHaveAttribute("type", "password");
});

test("sign-in links to forgot password, which never confirms an account", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);

  // Same answer for a real account and an unknown one.
  for (const address of [email, "e2e-nobody@example.com"]) {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(address);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("status")).toContainText(
      "If that address has an account, a reset link is on its way.",
    );
  }
});

test("a dead link is refused before any form is shown", async ({ page }) => {
  await page.goto(`/reset-password?token=${"x".repeat(43)}`);
  await expect(page.getByText("That reset link is not valid.")).toBeVisible();
  await expect(page.getByLabel("New password")).toHaveCount(0);
});

test("a reset link sets a new password, once, and signs out other devices", async ({
  page,
  browser,
}) => {
  // Another device, signed in with the old password before the reset.
  const elsewhere = await browser.newContext();
  const other = await elsewhere.newPage();
  await signIn(other, oldPassword);
  await expect(other).toHaveURL(/\/account$/);

  const token = await createResetToken(userId);

  await page.goto(`/reset-password?token=${token}`);
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password").fill(newPassword);
  await page.getByRole("button", { name: "Save new password" }).click();

  // Signed straight in, and a reader lands on their account.
  await expect(page).toHaveURL(/\/account$/);

  // The same link cannot be used twice.
  await page.goto(`/reset-password?token=${token}`);
  await expect(page.getByText("That reset link has already been used.")).toBeVisible();

  // The other device's session ended with the reset.
  await other.goto("/account");
  await expect(other).toHaveURL(/\/login/);
  await elsewhere.close();
});

test("the old password stops working and the new one works", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await signIn(page, oldPassword);
  await expect(page.getByText("That email and password were not recognised.")).toBeVisible();

  await signIn(page, newPassword);
  await expect(page).toHaveURL(/\/account$/);
  await context.close();
});
