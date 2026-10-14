import { describe, expect, it } from "vitest";

import { emailSenderSchema } from "@/lib/env";

describe("emailSenderSchema", () => {
  it.each([
    "no-reply@etextpublishingnetwork.com",
    "etext Publishing Network <no-reply@etextpublishingnetwork.com>",
  ])("accepts %s", (value) => {
    expect(emailSenderSchema.safeParse(value).success).toBe(true);
  });

  it.each(["etext Publishing Network", "Name <not-an-email>", "<a@b.com> trailing"])(
    "rejects %s",
    (value) => {
      expect(emailSenderSchema.safeParse(value).success).toBe(false);
    },
  );
});
