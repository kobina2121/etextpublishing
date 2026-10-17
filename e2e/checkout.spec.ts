import { expect, test, type Page } from "@playwright/test";

/**
 * Delivery details at checkout. Stops short of paying: Paystack is not part
 * of these tests, and the form's own checks run in the browser before it.
 */

async function addToBasket(page: Page, edition: "Hardcopy" | "Softcopy") {
  await page.goto("/publications");
  // The first title sold in both editions has a picker on its card.
  const picker = page.getByRole("group", { name: /^Choose an edition of / }).first();
  await picker.getByText(edition, { exact: true }).click();
  await picker
    .locator("xpath=ancestor::*[.//button[normalize-space()='Add to basket']][1]")
    .getByRole("button", { name: "Add to basket" })
    .click();
  await expect(page.getByText("added to your basket")).toBeVisible();
}

test("a hardcopy order asks for full delivery details", async ({ page }) => {
  await addToBasket(page, "Hardcopy");
  await page.goto("/checkout");

  const delivery = page.getByRole("group", { name: "Delivery details" });
  await expect(delivery).toBeVisible();
  for (const label of [
    "Street address",
    "Town or city",
    "Region",
    "GhanaPost GPS address (optional)",
    "Country",
    "Delivery instructions (optional)",
  ]) {
    await expect(delivery.getByLabel(label)).toBeVisible();
  }
  await expect(delivery.getByLabel("Country")).toHaveValue("Ghana");

  // Both checked in the browser before anything is sent. Each box is checked
  // on its own first; the "an address is needed" rule runs once they pass.
  const gps = delivery.getByLabel("GhanaPost GPS address (optional)");
  await gps.fill("not a gps code");
  await page.getByRole("button", { name: "Pay with Paystack" }).click();
  await expect(page.getByText("Enter a GhanaPost GPS address like GA-123-4567")).toBeVisible();

  await gps.fill("");
  await page.getByLabel("Full name").fill("E2E Buyer");
  await page.getByLabel("Email").fill("e2e-buyer@example.com");
  await page.getByRole("button", { name: "Pay with Paystack" }).click();
  await expect(page.getByText("Enter a delivery address.")).toBeVisible();
});

test("a softcopy-only order explains there is nothing to post", async ({ page }) => {
  await addToBasket(page, "Softcopy");
  await page.goto("/checkout");

  const delivery = page.getByRole("group", { name: "Delivery details" });
  await expect(delivery).toContainText("Nothing to post");
  await expect(delivery.getByLabel("Street address")).toHaveCount(0);
});
