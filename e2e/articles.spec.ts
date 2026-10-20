import { expect, test, type Page } from "@playwright/test";

import { signInAsAdmin } from "./support/admin-session";

/**
 * Articles (stored as journal entries): the dropdown, the admin journey, free
 * reading, links, and the redirects from the old /journals and /news addresses.
 *
 * Serial: each step works on the entry the first one made, and the last step
 * deletes it, which is what keeps the shared database clean.
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

test("Publications opens a dropdown with Books and Articles", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("button", { name: "Publications" }).click();

  // One kind of article, so no separate Journals or News item.
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem")).toHaveCount(2);
  await expect(menu.getByRole("menuitem", { name: /Books/ })).toBeVisible();
  await menu.getByRole("menuitem", { name: /Articles/ }).click();
  await expect(page).toHaveURL(/\/articles$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Articles");
});

test("an admin publishes an article with its PDF", async ({ page, context }) => {
  await signInAsAdmin(context);
  await page.goto("/admin/articles/new", { waitUntil: "networkidle" });

  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Slug").fill(slug);
  await page.getByLabel("Authors").fill("E2E Author One, E2E Author Two");
  await page
    .getByLabel("Abstract")
    .fill(
      "An end-to-end test entry, created to check articles can be read for free, then deleted.",
    );
  await page.getByLabel("Keywords (optional)").fill("testing, literacy");

  await page.getByLabel("Article PDF").setInputFiles({
    name: "e2e-article.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await expect(page.getByText("e2e-article.pdf")).toBeVisible();

  await page.getByRole("switch", { name: "Published" }).click();
  await page.getByRole("button", { name: "Create article" }).click();
  await expect(page).toHaveURL(/\/admin\/articles$/);
  await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();
});

test("anyone can read it for free, online or as a download", async ({ page, request }) => {
  await page.goto("/articles");
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  await page.getByRole("link", { name: title }).click();

  await expect(page).toHaveURL(new RegExp(`/articles/${slug}$`));
  await expect(page.getByText("E2E Author One, E2E Author Two")).toBeVisible();
  await expect(page.getByText("Free to read").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Read online" })).toHaveAttribute(
    "href",
    `/articles/${slug}/pdf`,
  );

  // No session needed: the request fixture has none.
  const online = await request.get(`/articles/${slug}/pdf`);
  expect(online.status()).toBe(200);
  expect(online.headers()["content-type"]).toBe("application/pdf");
  expect(online.headers()["content-disposition"]).toMatch(/^inline/);
  expect((await online.body()).subarray(0, 5).toString()).toBe("%PDF-");

  const saved = await request.get(`/articles/${slug}/pdf?download=1`);
  expect(saved.headers()["content-disposition"]).toMatch(/^attachment/);
});

test("an admin adds a link, shown under the article", async ({ page, context }) => {
  await signInAsAdmin(context);
  await openEditor(page);
  await page.getByRole("button", { name: "Add link" }).click();
  await page.getByPlaceholder("Label").fill("E2E Further reading");
  await page.getByPlaceholder("https://…").fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(/Link 1: Start the address with https/)).toBeVisible();

  await page.getByPlaceholder("https://…").fill("https://example.org/e2e-reading");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/admin\/articles$/);

  await page.goto(`/articles/${slug}`);
  const link = page
    .getByRole("region", { name: "Links" })
    .getByRole("link", { name: /E2E Further reading/ });
  await expect(link).toHaveAttribute("href", "https://example.org/e2e-reading");
  await expect(link).toHaveAttribute("target", "_blank");
});

test("the home page lists the latest articles", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Latest Articles" })).toBeVisible();
  await expect(page.getByRole("link", { name: "All articles" })).toHaveAttribute(
    "href",
    "/articles",
  );
});

test("old addresses redirect to the articles", async ({ page, request }) => {
  const moved: [string, string][] = [
    ["/journals", "/articles"],
    [`/journals/${slug}`, `/articles/${slug}`],
    [`/journals/${slug}/pdf`, `/articles/${slug}/pdf`],
    ["/news", "/articles"],
    ["/news/some-old-post", "/articles"],
  ];
  for (const [from, to] of moved) {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status(), from).toBe(308);
    expect(response.headers().location, from).toBe(to);
  }
  await page.goto(`/journals/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
});

test("unpublishing hides the entry and its PDF", async ({ page, context, request }) => {
  await signInAsAdmin(context);
  await openEditor(page);
  await page.getByRole("switch", { name: "Published" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/admin\/articles$/);

  expect((await request.get(`/articles/${slug}/pdf`)).status()).toBe(404);
  await page.goto(`/articles/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
});

test("the test article is deleted", async ({ page, context }) => {
  await signInAsAdmin(context);
  await page.goto("/admin/articles", { waitUntil: "networkidle" });
  const row = page.getByRole("row").filter({ hasText: title });
  await row.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Article deleted.")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: title })).toHaveCount(0);
});
