import { expect, test, type Page } from "@playwright/test";

import { signInAsAdmin } from "./support/admin-session";

/**
 * The About page editor.
 *
 * Never saves. These tests share the live site's database, so a save here
 * would change the real About page while the run lasted. Saving itself is
 * covered by src/server/actions/about.test.ts against a stand-in database.
 */

test.beforeEach(async ({ context }) => {
  await signInAsAdmin(context);
});

test("the dashboard links to the About page editor", async ({ page }) => {
  await page.goto("/admin");
  await page.getByRole("link", { name: "About page" }).first().click();
  await expect(page).toHaveURL(/\/admin\/about$/);
  await expect(page.getByRole("heading", { name: "About page", level: 1 })).toBeVisible();
});

test("the editor opens with what the public page shows", async ({ page, browser }) => {
  const visitor = await browser.newPage();
  await visitor.goto("/about");
  const publicDescription = (
    await visitor.locator("section").first().locator("p").first().textContent()
  )?.trim();
  await visitor.close();

  await page.goto("/admin/about");
  await expect(page.getByLabel("Line under the title")).toHaveValue(publicDescription ?? "");
  await expect(page.getByLabel("About the company")).not.toHaveValue("");
  await expect(page.getByLabel("Title").first()).not.toHaveValue("");
});

// The editor is interactive only once it has loaded; on a cold dev server the
// first visit compiles the page, and a click before then does nothing.
const openEditor = (page: Page) => page.goto("/admin/about", { waitUntil: "networkidle" });

test("an empty title is refused before anything is saved", async ({ page }) => {
  await openEditor(page);
  await page.getByLabel("Page title").fill("");
  await page.getByRole("button", { name: "Save About page" }).click();
  await expect(page.getByText("Give the page a title.")).toBeVisible();
  await expect(page.getByText("About page saved.")).toHaveCount(0);
});

test("cards can be added and removed, up to six", async ({ page }) => {
  await openEditor(page);
  const cards = page.locator("ol > li");
  const start = await cards.count();

  await page.getByRole("button", { name: "Add a card" }).click();
  await expect(cards).toHaveCount(start + 1);
  await expect(page.getByText("Unsaved changes")).toBeVisible();

  await page.getByRole("button", { name: `Remove card ${start + 1}` }).click();
  await expect(cards).toHaveCount(start);

  while ((await cards.count()) < 6) {
    await page.getByRole("button", { name: "Add a card" }).click();
  }
  await expect(page.getByRole("button", { name: "Add a card" })).toBeDisabled();
});
