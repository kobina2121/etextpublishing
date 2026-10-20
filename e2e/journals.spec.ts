import { expect, test, type Page } from "@playwright/test";

import { signInAsAdmin } from "./support/admin-session";

/**
 * Journals — shown to visitors as Articles: the dropdown, the admin journey,
 * and free reading.
 *
 * Serial: each step works on the entry the first one made, and the last step
 * deletes it, which is what keeps the shared database clean.
 */
test.describe.configure({ mode: "serial" });

const stamp = Date.now();
const title = `E2E Journal ${stamp}`;
const slug = `e2e-journal-${stamp}`;
const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

const openEditor = async (page: Page) => {
  await page.goto("/admin/journals", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: title, exact: true }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("Title")).toHaveValue(title);
};

test("Publications opens a dropdown with Books and Articles", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("button", { name: "Publications" }).click();

  // Articles are the journal entries; there is no separate Journals item.
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem")).toHaveCount(2);
  await expect(menu.getByRole("menuitem", { name: /Books/ })).toBeVisible();
  await menu.getByRole("menuitem", { name: /Articles/ }).click();
  await expect(page).toHaveURL(/\/journals$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Articles");
});

test("an admin publishes a journal entry with its PDF", async ({ page, context }) => {
  await signInAsAdmin(context);
  await page.goto("/admin/journals/new", { waitUntil: "networkidle" });

  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Slug").fill(slug);
  await page.getByLabel("Authors").fill("E2E Author One, E2E Author Two");
  await page
    .getByLabel("Abstract")
    .fill(
      "An end-to-end test entry, created to check journals can be read for free, then deleted.",
    );
  await page.getByLabel("Keywords (optional)").fill("testing, literacy");

  await page.getByLabel("Journal PDF").setInputFiles({
    name: "e2e-journal.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await expect(page.getByText("e2e-journal.pdf")).toBeVisible();

  await page.getByRole("switch", { name: "Published" }).click();
  await page.getByRole("button", { name: "Create journal entry" }).click();
  await expect(page).toHaveURL(/\/admin\/journals$/);
  await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();
});

test("anyone can read it for free, online or as a download", async ({ page, request }) => {
  await page.goto("/journals");
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  await page.getByRole("link", { name: title }).click();

  await expect(page).toHaveURL(new RegExp(`/journals/${slug}$`));
  await expect(page.getByText("E2E Author One, E2E Author Two")).toBeVisible();
  await expect(page.getByText("Free to read").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Read online" })).toHaveAttribute(
    "href",
    `/journals/${slug}/pdf`,
  );

  // No session needed: the request fixture has none.
  const online = await request.get(`/journals/${slug}/pdf`);
  expect(online.status()).toBe(200);
  expect(online.headers()["content-type"]).toBe("application/pdf");
  expect(online.headers()["content-disposition"]).toMatch(/^inline/);
  expect((await online.body()).subarray(0, 5).toString()).toBe("%PDF-");

  const saved = await request.get(`/journals/${slug}/pdf?download=1`);
  expect(saved.headers()["content-disposition"]).toMatch(/^attachment/);
});

test("unpublishing hides the entry and its PDF", async ({ page, context, request }) => {
  await signInAsAdmin(context);
  await openEditor(page);
  await page.getByRole("switch", { name: "Published" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/admin\/journals$/);

  expect((await request.get(`/journals/${slug}/pdf`)).status()).toBe(404);
  await page.goto(`/journals/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
});

test("the test entry is deleted", async ({ page, context }) => {
  await signInAsAdmin(context);
  await page.goto("/admin/journals", { waitUntil: "networkidle" });
  const row = page.getByRole("row").filter({ hasText: title });
  await row.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Journal entry deleted.")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: title })).toHaveCount(0);
});
