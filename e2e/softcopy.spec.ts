import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

import { signInAsAdmin } from "./support/admin-session";
import { createPaidOrder, deleteOrders, disconnect, publicationIdBySlug } from "./support/db";

/**
 * Softcopy delivery: an admin uploads the file, a paid order downloads it, and
 * nothing else can.
 *
 * Paystack is not part of the tests, so the paid order is written directly as
 * its settlement would leave it. Serial, and the last step deletes the title
 * and the orders.
 */
test.describe.configure({ mode: "serial" });

const stamp = Date.now();
const title = `E2E Softcopy ${stamp}`;
const slug = `e2e-softcopy-${stamp}`;
const fileBytes = Buffer.from("%PDF-1.4\n% E2E softcopy body\n%%EOF\n");
const orders: string[] = [];
let publicationId = "";

/** The same signature the site makes, from the same secret. */
const sign = (reference: string) =>
  createHmac("sha256", process.env.AUTH_SECRET ?? "")
    .update(`download:${reference}`)
    .digest("base64url");

async function setSwitch(page: Page, name: string, on: boolean) {
  const control = page.getByRole("switch", { name });
  if ((await control.getAttribute("aria-checked")) !== String(on)) await control.click();
  await expect(control).toHaveAttribute("aria-checked", String(on));
}

test.afterAll(async () => {
  await deleteOrders(orders);
  await disconnect();
});

test("an admin puts a softcopy on sale with its file", async ({ page, context }) => {
  await signInAsAdmin(context);
  await page.goto("/admin/publications/new", { waitUntil: "networkidle" });
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Title").blur();
  await expect(page.getByLabel("Slug")).toHaveValue(slug);
  await page.getByLabel("Excerpt").fill("An end-to-end softcopy test title.");
  await page
    .getByLabel("Description")
    .fill("Created by the softcopy test to check paid downloads, then deleted.");
  await page.getByLabel("ISBN").fill("978-0-00-000000-1");
  await page.getByLabel("Pages").fill("120");
  for (const label of ["Author", "Category"]) {
    await page.getByRole("combobox", { name: label }).click();
    await page.getByRole("option").first().click();
  }
  await page.getByRole("combobox", { name: "Status" }).click();
  await page.getByRole("option").filter({ hasText: "Published" }).click();

  await setSwitch(page, "Sell a hardcopy", false);
  await setSwitch(page, "Sell a softcopy", true);
  await page.getByLabel("Softcopy price").fill("45");

  // Refused without the file.
  await page.getByRole("button", { name: "Create publication" }).click();
  await expect(page.getByText("Upload the softcopy file, or turn the softcopy off.")).toBeVisible();

  await page.getByLabel("Softcopy file").setInputFiles({
    name: "e2e-softcopy.pdf",
    mimeType: "application/pdf",
    buffer: fileBytes,
  });
  await expect(page.getByText("e2e-softcopy.pdf")).toBeVisible();
  await page.getByRole("button", { name: "Create publication" }).click();
  await expect(page).toHaveURL(/\/admin\/publications$/);

  publicationId = await publicationIdBySlug(slug);
});

test("a paid order downloads its softcopy", async ({ page, request }) => {
  const reference = await createPaidOrder({ publicationId, title, slug, edition: "softcopy" });
  orders.push(reference);

  await page.goto(`/downloads/${reference}?t=${sign(reference)}`);
  await expect(page.getByRole("heading", { name: "Your downloads" })).toBeVisible();
  await expect(page.getByText(title)).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("e2e-softcopy.pdf");
  const { readFile } = await import("node:fs/promises");
  expect(await readFile((await download.path())!)).toEqual(fileBytes);

  // The file route itself, with no session at all.
  const file = await request.get(
    `/api/downloads/${reference}/${publicationId}?t=${sign(reference)}`,
  );
  expect(file.status()).toBe(200);
  expect(file.headers()["content-disposition"]).toMatch(/^attachment/);
});

test("nothing downloads without a genuine link for a paid order", async ({ page, request }) => {
  const paid = orders[0]!;
  const unpaid = await createPaidOrder({
    publicationId,
    title,
    slug,
    edition: "softcopy",
    status: "pending",
  });
  orders.push(unpaid);

  // Wrong signature, another order's signature, no signature.
  for (const url of [
    `/api/downloads/${paid}/${publicationId}?t=forged`,
    `/api/downloads/${paid}/${publicationId}?t=${sign(unpaid)}`,
    `/api/downloads/${paid}/${publicationId}`,
    // A genuine link, but the order was never paid.
    `/api/downloads/${unpaid}/${publicationId}?t=${sign(unpaid)}`,
  ]) {
    expect((await request.get(url)).status(), url).toBe(404);
  }

  await page.goto(`/downloads/${paid}?t=forged`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
});

test("the test title is deleted", async ({ page, context }) => {
  await signInAsAdmin(context);
  await page.goto("/admin/publications", { waitUntil: "networkidle" });
  const row = page.getByRole("row").filter({ hasText: title });
  await row.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Publication deleted.")).toBeVisible();
});
