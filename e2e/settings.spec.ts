import { expect, test } from "@playwright/test";
import mongoose from "mongoose";

/**
 * Company details saved at /admin/settings must be what the site shows.
 * They used to come from fixed placeholders in code, so dashboard edits never
 * appeared. Read-only: the suite shares the live database, so it compares the
 * saved settings with the pages rather than changing them.
 */

let saved: { email: string; phone: string; line1: string; name: string } | undefined;

test.beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI ?? "");
  const doc = await mongoose.connection.db?.collection("sitesettings").findOne({ key: "site" });
  if (doc) {
    saved = {
      email: doc.contact.email,
      phone: doc.contact.phone,
      line1: doc.contact.address.line1,
      name: doc.name,
    };
  }
  await mongoose.disconnect();
});

test("the footer shows the saved contact details", async ({ page }) => {
  test.skip(!saved, "No settings have been saved yet.");
  await page.goto("/");
  const footer = page.locator("footer");
  await expect(footer).toContainText(saved!.email);
  await expect(footer).toContainText(saved!.phone);
  await expect(footer).toContainText(saved!.line1);
  await expect(footer).toContainText(saved!.name);
});

test("the contact page shows the saved contact details", async ({ page }) => {
  test.skip(!saved, "No settings have been saved yet.");
  await page.goto("/contact");
  const details = page.locator("aside");
  await expect(details).toContainText(saved!.email);
  await expect(details).toContainText(saved!.phone);
  await expect(details.getByRole("link", { name: saved!.email })).toHaveAttribute(
    "href",
    `mailto:${saved!.email}`,
  );
});
