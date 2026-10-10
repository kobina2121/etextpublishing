import { expect, test, type Page } from "@playwright/test";

import { signInAsAdmin } from "./support/admin-session";

/**
 * The publication form's two edition switches, driven through the admin and
 * checked on the public page — hardcopy and softcopy are switched on and off
 * independently, and the buyer's edition picker follows.
 *
 * Serial because each step edits the title the previous one made; the last
 * step deletes it, which is what keeps the database clean.
 */
test.describe.configure({ mode: "serial" });

const stamp = Date.now();
const title = `E2E Publication ${stamp}`;
const slug = `e2e-publication-${stamp}`;

test.beforeEach(async ({ context }) => {
  await signInAsAdmin(context);
});

async function choose(page: Page, label: string, option?: string) {
  await page.getByRole("combobox", { name: label }).click();
  const options = page.getByRole("option");
  await (option ? options.filter({ hasText: option }).first() : options.first()).click();
}

/** Sets a switch to a state, whatever it started as — new titles start with both on. */
async function setSwitch(page: Page, name: string, on: boolean) {
  const control = page.getByRole("switch", { name });
  if ((await control.getAttribute("aria-checked")) !== String(on)) await control.click();
  await expect(control).toHaveAttribute("aria-checked", String(on));
}

async function openEditor(page: Page) {
  await page.goto("/admin/publications");
  await page.getByRole("link", { name: title, exact: true }).first().click();
  await expect(page.getByLabel("Title")).toHaveValue(title);
}

test("an admin creates a title sold in both editions", async ({ page }) => {
  await page.goto("/admin/publications/new");

  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Title").blur();
  // The slug fills itself from the title.
  await expect(page.getByLabel("Slug")).toHaveValue(slug);
  await page.getByLabel("Excerpt").fill("An end-to-end test title.");
  await page
    .getByLabel("Description")
    .fill("Created by the publication test to drive both edition switches, then deleted.");
  await page.getByLabel("ISBN").fill("978-0-00-000000-0");
  await page.getByLabel("Pages").fill("240");
  await page.getByLabel("Publication date").fill("2026-01-15");
  await choose(page, "Author");
  await choose(page, "Category");
  await choose(page, "Status", "Published");

  await setSwitch(page, "Sell a hardcopy", true);
  await page.getByLabel("Hardcopy price").fill("120.50");
  await page.getByLabel("Printed stock").fill("5");
  await setSwitch(page, "Sell a softcopy", true);
  await page.getByLabel("Softcopy price").fill("45");

  await page.getByRole("button", { name: "Create publication" }).click();
  await expect(page).toHaveURL(/\/admin\/publications$/);

  // On the public page, the buyer chooses between the two.
  await page.goto(`/publications/${slug}`);
  // Scoped to this title: related titles on the page carry pickers of their own.
  const picker = page.getByRole("group", { name: `Choose an edition of ${title}` });
  await expect(picker.getByRole("radio")).toHaveCount(2);
  await expect(picker).toContainText("120.50");
  await expect(picker).toContainText("45.00");
});

test("an edition switched on needs a price", async ({ page }) => {
  await openEditor(page);
  await page.getByLabel("Softcopy price").fill("0");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Set a softcopy price, or turn the softcopy off.")).toBeVisible();
});

test("switching the softcopy off leaves a hardcopy-only title", async ({ page }) => {
  await openEditor(page);
  await expect(page.getByRole("switch", { name: "Sell a softcopy" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await setSwitch(page, "Sell a softcopy", false);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/admin\/publications$/);

  // A choice of one is no choice: the picker goes, the hardcopy price stays.
  await page.goto(`/publications/${slug}`);
  await expect(page.getByRole("group", { name: `Choose an edition of ${title}` })).toHaveCount(0);
  await expect(page.locator("main")).toContainText("120.50");
  await expect(page.locator("main")).not.toContainText("45.00");
});

test("the test title is deleted", async ({ page }) => {
  await page.goto("/admin/publications");
  const row = page.getByRole("row").filter({ hasText: title });
  await row.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  // Wait for the server to confirm, not just for the row to leave the screen.
  await expect(page.getByText("Publication deleted.")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: title })).toHaveCount(0);

  // The public page is gone straight away, not when a cache next expires.
  // Checked by content, not status: an unknown slug can answer 200 with the
  // not-found page (see the note on dynamicParams in the page itself).
  await page.goto(`/publications/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
});
