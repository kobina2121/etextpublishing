import { expect, test } from "@playwright/test";

import { signInAsAdmin } from "./support/admin-session";

/**
 * The full manuscript journey: a visitor submits, an admin downloads the file
 * and deletes the submission. Serial because the second test reads what the
 * first one wrote, and the delete is what keeps the database clean.
 */
test.describe.configure({ mode: "serial" });

const title = `E2E Manuscript ${Date.now()}`;
const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

test("a visitor submits a manuscript", async ({ page }) => {
  await page.goto("/submit");

  await page.getByLabel("Your name").fill("E2E Author");
  await page.getByLabel("Email").fill("e2e-author@example.com");
  await page.getByLabel("Manuscript title").fill(title);
  await page.getByLabel("Word count").fill("42000");
  await page
    .getByLabel("Synopsis")
    .fill("An end-to-end test submission, deleted again by the test that made it.");

  await page.getByRole("combobox", { name: "Genre" }).click();
  await page.getByRole("option", { name: "Fiction", exact: true }).click();

  await page.getByLabel("Manuscript file").setInputFiles({
    name: "e2e-manuscript.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });

  await page.getByRole("button", { name: "Submit manuscript" }).click();
  await expect(page.getByText("Manuscript received.")).toBeVisible();
  await expect(page.getByLabel("Manuscript title")).toHaveValue("");
});

test("an admin downloads it, then deletes it", async ({ page, context }) => {
  await signInAsAdmin(context);

  await page.goto("/admin/manuscripts");
  await page.getByRole("link", { name: title }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("e2e-manuscript.pdf");
  const path = await download.path();
  const { readFile } = await import("node:fs/promises");
  expect((await readFile(path)).subarray(0, 5).toString()).toBe("%PDF-");

  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Submission deleted.")).toBeVisible();

  await expect(page).toHaveURL(/\/admin\/manuscripts$/);
  await expect(page.getByRole("link", { name: title })).toHaveCount(0);
});

test("the file is not reachable without an admin session", async ({ request }) => {
  const response = await request.get(`/api/admin/manuscripts/${"0".repeat(24)}/file`);
  expect(response.status()).toBe(401);
});
