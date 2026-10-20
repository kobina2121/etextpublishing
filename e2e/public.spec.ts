import { expect, test, type Page } from "@playwright/test";

const cards = (page: Page) => page.locator('main a[href^="/publications/"]');

test("homepage renders", async ({ page }) => {
  // The server's HTML can be fine while the page crashes in the browser — an
  // empty catalogue once broke the carousel and showed "Something went wrong".
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const response = await page.goto("/", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);
  await expect(page.locator("h1").first()).toBeVisible();
  await expect(page.getByRole("navigation").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Something went wrong" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a publication opens from the listing", async ({ page }) => {
  await page.goto("/publications");
  const first = cards(page).first();
  await expect(first).toBeVisible();

  const title = (await first.locator("h3").textContent())?.trim() ?? "";
  expect(title).not.toBe("");

  await first.click();
  await expect(page).toHaveURL(/\/publications\/[a-z0-9-]+$/);
  await expect(page.locator("h1").first()).toHaveText(title);
});

test("search narrows the catalogue", async ({ page }) => {
  await page.goto("/publications");
  const title = (await cards(page).first().locator("h3").textContent())?.trim() ?? "";
  const search = page.getByPlaceholder("Search by title, author or ISBN…");

  await search.fill(title);
  await search.press("Enter");
  await expect(page).toHaveURL(/[?&]q=/);
  await expect(cards(page).filter({ hasText: title }).first()).toBeVisible();

  await search.fill("zzzz-no-such-title-zzzz");
  await search.press("Enter");
  await expect(page).toHaveURL(/q=zzzz-no-such-title-zzzz/);
  await expect(cards(page)).toHaveCount(0);
});

test("signed-out visitors are sent to sign in", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fadmin/);
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();

  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Faccount/);
});

test("a wrong password is refused without saying why", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("e2e-nobody@example.com");
  await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("That email and password were not recognised.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
