import { expect, test } from "@playwright/test";

import { signInAsAdmin } from "./support/admin-session";
import { articleTagsBySlug, deleteArticle } from "./support/db";

/**
 * Articles: saving from the dashboard, tags included.
 *
 * The form parses tags into a list and the server parsed them again expecting
 * text, so any article with tags failed to save. Kept as a draft so it never
 * shows on the site; deleted at the end, and by the sweep if a run stops.
 */
test.describe.configure({ mode: "serial" });

const stamp = Date.now();
const title = `E2E Article ${stamp}`;
const slug = `e2e-article-${stamp}`;

test.afterAll(async () => {
  await deleteArticle(slug);
});

test("an admin creates an article with tags, then edits it", async ({ page, context }) => {
  await signInAsAdmin(context);
  await page.goto("/admin/articles/new", { waitUntil: "networkidle" });

  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Slug").fill(slug);
  await page.getByLabel("Excerpt").fill("An end-to-end test article, saved as a draft.");
  await page
    .getByLabel("Body")
    .fill("Created by the test suite to check that articles with tags save, then deleted.");
  await page.getByLabel("Category").click();
  await page.getByRole("option").first().click();
  await page.getByLabel("Tags").fill("Catalogue, article");

  await page.getByRole("button", { name: "Create article" }).click();
  await expect(page).toHaveURL(/\/admin\/articles$/);
  expect(await articleTagsBySlug(slug)).toEqual(["catalogue", "article"]);

  await page.getByRole("link", { name: title, exact: true }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("Tags")).toHaveValue("catalogue, article");
  await page.getByLabel("Tags").fill("catalogue, article, research");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/admin\/articles$/);
  expect(await articleTagsBySlug(slug)).toEqual(["catalogue", "article", "research"]);
});
