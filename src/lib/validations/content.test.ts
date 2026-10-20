import { describe, expect, it } from "vitest";

import { articleSchema } from "@/lib/validations/content";

const valid = {
  title: "A Hybrid Model of Publishing at KNUST",
  slug: "hybrid-model-of-publishing-at-knust",
  excerpt: "How a university press can mix print and digital.",
  body: "A long enough body for the article, describing the study and what it found in detail.",
  coverImage: "",
  authorName: "Editorial team",
  category: "507f1f77bcf86cd799439011",
  tags: "Catalogue, article, ",
  publishedAt: "2026-02-01",
  status: "published",
  featured: true,
};

describe("articleSchema tags", () => {
  it("turns the comma-separated field into a clean list", () => {
    const parsed = articleSchema.parse(valid);
    expect(parsed.tags).toEqual(["catalogue", "article"]);
  });

  // The form parses its values with this schema, then the server action
  // parses them again — so the already-split list must be accepted.
  it("accepts its own output when parsed a second time", () => {
    const once = articleSchema.parse(valid);
    const twice = articleSchema.safeParse(once);
    expect(twice.success).toBe(true);
    expect(twice.data?.tags).toEqual(["catalogue", "article"]);
  });

  it("allows no tags", () => {
    expect(articleSchema.parse({ ...valid, tags: undefined }).tags).toEqual([]);
  });
});

describe("articleSchema links", () => {
  const withLinks = (links: { label: string; href: string }[]) =>
    articleSchema.safeParse({ ...valid, links });

  it("accepts labelled https links", () => {
    const parsed = withLinks([{ label: "Journal of Science", href: "https://example.org/paper" }]);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.links).toHaveLength(1);
  });

  it("defaults to no links", () => {
    expect(articleSchema.parse(valid).links).toEqual([]);
  });

  it.each(["javascript:alert(1)", "data:text/html,hi", "ftp://example.org", "example.org"])(
    "rejects %s",
    (href) => {
      expect(withLinks([{ label: "Bad", href }]).success).toBe(false);
    },
  );

  it("needs a label", () => {
    expect(withLinks([{ label: "", href: "https://example.org" }]).success).toBe(false);
  });
});
