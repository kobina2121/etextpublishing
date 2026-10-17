import { describe, expect, it } from "vitest";

import { imageRefSchema, publicationSchema, slugSchema } from "@/lib/validations/publication";

const valid = {
  title: "The River Road",
  slug: "the-river-road",
  author: "a".repeat(24),
  category: "b".repeat(24),
  isbn: "978-9988-0-1234-5",
  excerpt: "A family saga on the Volta.",
  description: "A family saga across three generations of a fishing town on the Volta.",
  publicationDate: "2026-03-01",
  pages: "320",
  hardcopyAvailable: true,
  hardcopyPriceMajor: "120.50",
  hardcopyStock: "40",
};

describe("slugSchema", () => {
  it("accepts lowercase hyphenated slugs only", () => {
    expect(slugSchema.safeParse("the-river-road").success).toBe(true);
    expect(slugSchema.safeParse("The River Road").success).toBe(false);
    expect(slugSchema.safeParse("-leading").success).toBe(false);
    expect(slugSchema.safeParse("double--hyphen").success).toBe(false);
  });
});

describe("imageRefSchema", () => {
  it("allows an uploaded image, an http(s) URL, or nothing", () => {
    expect(imageRefSchema.safeParse(`/api/images/${"c".repeat(24)}`).success).toBe(true);
    expect(imageRefSchema.safeParse("https://cdn.example.com/cover.jpg").success).toBe(true);
    expect(imageRefSchema.safeParse("").success).toBe(true);
  });

  it("refuses script and relative paths", () => {
    expect(imageRefSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(imageRefSchema.safeParse("/etc/passwd").success).toBe(false);
  });
});

describe("publicationSchema", () => {
  it("coerces form strings into numbers and dates", () => {
    const parsed = publicationSchema.parse(valid);
    expect(parsed.pages).toBe(320);
    expect(parsed.hardcopyPriceMajor).toBe(120.5);
    expect(parsed.publicationDate).toBeInstanceOf(Date);
    expect(parsed.status).toBe("draft");
  });

  it("rejects a price with more than two decimal places", () => {
    expect(publicationSchema.safeParse({ ...valid, hardcopyPriceMajor: "10.005" }).success).toBe(
      false,
    );
  });

  it("requires a price for every edition that is switched on", () => {
    const result = publicationSchema.safeParse({
      ...valid,
      softcopyAvailable: true,
      softcopyPriceMajor: "0",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["softcopyPriceMajor"]);
  });

  it("allows an edition with no price while it is switched off", () => {
    expect(
      publicationSchema.safeParse({ ...valid, hardcopyAvailable: false, hardcopyPriceMajor: "0" })
        .success,
    ).toBe(true);
  });
});

describe("softcopy file", () => {
  const softcopy = {
    ...valid,
    softcopyAvailable: true,
    softcopyPriceMajor: "45",
  };

  it("cannot be on sale without its file", () => {
    const result = publicationSchema.safeParse(softcopy);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toContain("softcopyFileKey");
  });

  it("can be on sale once the file is uploaded", () => {
    expect(
      publicationSchema.safeParse({ ...softcopy, softcopyFileKey: `db:${"c".repeat(24)}` }).success,
    ).toBe(true);
  });

  it("refuses a file reference it did not issue", () => {
    expect(
      publicationSchema.safeParse({
        ...softcopy,
        softcopyFileKey: "https://elsewhere.com/book.pdf",
      }).success,
    ).toBe(false);
  });
});
