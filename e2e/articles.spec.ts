import { expect, test, type Page } from "@playwright/test";

import { signInAsAdmin } from "./support/admin-session";
import { articleBySlug, deleteArticle, storedFileExists } from "./support/db";

/**
 * Articles: saving from the dashboard with tags, and an attached PDF readers
 * can open or download.
 *
 * Serial: each step works on the article the first one made. Published only
 * for the moment it takes to read it back; deleted at the end, and by the
 * sweep if a run stops.
 */
test.describe.configure({ mode: "serial" });

const stamp = Date.now();
const title = `E2E Article ${stamp}`;
const slug = `e2e-article-${stamp}`;
const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

const openEditor = async (page: Page) => {
  await page.goto("/admin/articles", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: title, exact: true }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("Title")).toHaveValue(title);
};

const save = async (page: Page) => {
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/admin\/articles$/);
};

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
    .fill("Created by the test suite to check that articles save with tags and a PDF.");
  await page.getByLabel("Category").click();
  await page.getByRole("option").first().click();
  await page.getByLabel("Tags").fill("Catalogue, article");

  await page.getByRole("button", { name: "Create article" }).click();
  await expect(page).toHaveURL(/\/admin\/articles$/);
  expect((await articleBySlug(slug))?.tags).toEqual(["catalogue", "article"]);

  await openEditor(page);
  await expect(page.getByLabel("Tags")).toHaveValue("catalogue, article");
  await page.getByLabel("Tags").fill("catalogue, article, research");
  await save(page);
  expect((await articleBySlug(slug))?.tags).toEqual(["catalogue", "article", "research"]);
});

test("an admin attaches a PDF and publishes", async ({ page, context }) => {
  await signInAsAdmin(context);
  await openEditor(page);

  await page.getByLabel("Article PDF").setInputFiles({
    name: "e2e-article.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await expect(page.getByText("e2e-article.pdf")).toBeVisible();

  await page.getByLabel("Status").click();
  await page.getByRole("option", { name: "Published" }).click();
  await save(page);
  expect((await articleBySlug(slug))?.pdfKey).toBeTruthy();
});

test("readers can open or download the PDF", async ({ page, request }) => {
  await page.goto(`/news/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.getByRole("link", { name: "Read PDF" })).toHaveAttribute(
    "href",
    `/news/${slug}/pdf`,
  );

  const read = await request.get(`/news/${slug}/pdf`);
  expect(read.status()).toBe(200);
  expect(read.headers()["content-type"]).toBe("application/pdf");
  expect(read.headers()["content-disposition"]).toMatch(/^inline/);
  expect((await read.body()).subarray(0, 5).toString()).toBe("%PDF-");

  const download = await request.get(`/news/${slug}/pdf?download=1`);
  expect(download.headers()["content-disposition"]).toMatch(/^attachment/);
});

test("a draft's PDF is not public", async ({ page, context, request }) => {
  await signInAsAdmin(context);
  await openEditor(page);
  await page.getByLabel("Status").click();
  await page.getByRole("option", { name: "Draft" }).click();
  await save(page);

  expect((await request.get(`/news/${slug}/pdf`)).status()).toBe(404);
});

test("removing the PDF deletes the file", async ({ page, context }) => {
  const before = (await articleBySlug(slug))?.pdfKey;
  expect(before).toBeTruthy();

  await signInAsAdmin(context);
  await openEditor(page);
  await page.getByRole("button", { name: "Remove PDF" }).click();
  await save(page);

  expect((await articleBySlug(slug))?.pdfKey).toBeUndefined();
  if (before?.startsWith("db:")) expect(await storedFileExists("articlefiles", before)).toBe(false);
});
