import { z } from "zod";

/**
 * Checkout details.
 *
 * The address is required only when the basket contains something that has to
 * be posted. `superRefine` rather than two schemas, so the client form and the
 * server action apply exactly the same rule to the same payload.
 */
const addressSchema = z.object({
  line1: z.string().trim().max(120).optional().or(z.literal("")),
  line2: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  region: z.string().trim().max(80).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
});

export const checkoutSchema = z
  .object({
    customerName: z.string().trim().min(2, "Please enter your name.").max(120),
    email: z.string().trim().email("Please enter a valid email address."),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    requiresShipping: z.boolean(),
    address: addressSchema.default({}),
    /** Honeypot: real buyers never see this. */
    website: z.string().max(0).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.requiresShipping) return;

    const required = [
      ["line1", "Enter a delivery address."],
      ["city", "Enter a city."],
      ["region", "Enter a region."],
      ["country", "Enter a country."],
    ] as const;

    for (const [field, message] of required) {
      if (!value.address?.[field]?.trim()) {
        ctx.addIssue({ code: "custom", path: ["address", field], message });
      }
    }

    if (!value.phone?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "A phone number is needed for delivery.",
      });
    }
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutValues = z.output<typeof checkoutSchema>;

/**
 * What the browser is allowed to send about the basket: ids, the chosen
 * edition and counts. Never a price — the server looks that up itself.
 */
export const cartPayloadSchema = z
  .array(
    z.object({
      publicationId: z
        .string()
        .trim()
        .regex(/^[a-f\d]{24}$/i),
      edition: z.enum(["hardcopy", "softcopy"]),
      quantity: z.number().int().min(1).max(20),
    }),
  )
  .min(1, "Your basket is empty.")
  .max(50);
