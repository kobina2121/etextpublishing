import { describe, expect, it } from "vitest";

import { emailSenderSchema, resolveSiteUrl } from "@/lib/env";

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

describe("resolveSiteUrl", () => {
  const live = {
    VERCEL_ENV: "production",
    VERCEL_PROJECT_PRODUCTION_URL: "etextpublishingnetwork.com",
  };

  it("uses the configured address when it is real", () => {
    expect(
      resolveSiteUrl({ ...live, NEXT_PUBLIC_SITE_URL: "https://www.etextpublishingnetwork.com/" }),
    ).toBe("https://www.etextpublishingnetwork.com");
  });

  it("never sends live visitors to localhost", () => {
    expect(resolveSiteUrl({ ...live, NEXT_PUBLIC_SITE_URL: "http://localhost:3000" })).toBe(
      "https://etextpublishingnetwork.com",
    );
    expect(resolveSiteUrl(live)).toBe("https://etextpublishingnetwork.com");
  });

  it("keeps localhost for local development", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" })).toBe(
      "http://localhost:3000",
    );
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
  });

  it("does not use the production domain for preview deployments", () => {
    expect(
      resolveSiteUrl({
        ...live,
        VERCEL_ENV: "preview",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      }),
    ).toBe("http://localhost:3000");
  });
});
