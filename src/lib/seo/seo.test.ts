import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ publicEnv: { siteUrl: "https://www.example.org" } }));
vi.mock("@/lib/seo/site-meta", () => ({
  absoluteUrl: (path = "/") => new URL(path, "https://www.example.org").toString(),
}));

const { bookJsonLd, organizationJsonLd, scholarMeta, scholarlyArticleJsonLd } =
  await import("@/lib/seo/json-ld");
const { isPlaceholderText } = await import("@/lib/seo/placeholder");
const { siteConfig } = await import("@/lib/site-config");

describe("isPlaceholderText", () => {
  it("spots sample copy, but not words that merely contain it", () => {
    expect(isPlaceholderText("Placeholder biography. Amara writes…")).toBe(true);
    expect(isPlaceholderText("Real text", "this is placeholder copy")).toBe(true);
    expect(isPlaceholderText("A history of place-holding in Akan")).toBe(false);
    expect(isPlaceholderText(undefined, "")).toBe(false);
  });
});

describe("organizationJsonLd", () => {
  const base = {
    name: "etext Publishing Network",
    tagline: "",
    description: "A publishing house.",
    url: "https://www.example.org",
    socials: [],
  };

  it("leaves placeholder contact details out of what Google reads", () => {
    const data = organizationJsonLd({
      ...base,
      email: "etextpublishingnetwork@gmail.com",
      phone: siteConfig.contact.phone,
      address: { ...siteConfig.contact.address },
    });
    expect(data).toMatchObject({ email: "etextpublishingnetwork@gmail.com" });
    expect(data).not.toHaveProperty("telephone");
    expect(data).not.toHaveProperty("address");
  });

  it("includes real details once they are set", () => {
    const data = organizationJsonLd({
      ...base,
      email: "hello@etext.example",
      phone: "+233 24 000 1111",
      address: {
        line1: "12 Ring Road",
        city: "Accra",
        region: "Greater Accra",
        postalCode: "GA-123-4567",
        country: "Ghana",
      },
    });
    expect(data).toMatchObject({ telephone: "+233 24 000 1111" });
    expect(data).toHaveProperty("address.addressLocality", "Accra");
  });
});

describe("bookJsonLd offers", () => {
  const book = {
    title: "Salt Roads",
    slug: "salt-roads",
    description: "A novel.",
    isbn: "978-0-00-000000-0",
    pages: 240,
    publicationDate: new Date("2026-01-15"),
    currency: "GHS",
    coverImage: "",
    category: { name: "Fiction" },
    author: { name: "Ama Mensah", slug: "ama-mensah" },
    editions: {
      hardcopy: { available: true, price: 12050, stockQuantity: 0 },
      softcopy: { available: true, price: 4500, stockQuantity: 0 },
    },
  } as unknown as Parameters<typeof bookJsonLd>[0];

  it("offers each edition on sale at its real price, with honest stock", () => {
    const offers = bookJsonLd(book).offers as {
      name: string;
      price: string;
      availability: string;
    }[];
    expect(offers).toEqual([
      expect.objectContaining({
        name: "Hardcopy",
        price: "120.50",
        availability: "https://schema.org/OutOfStock",
      }),
      expect.objectContaining({
        name: "Softcopy (download)",
        price: "45.00",
        availability: "https://schema.org/InStock",
      }),
    ]);
  });

  it("offers nothing for an edition that is switched off", () => {
    const off = {
      ...book,
      editions: { ...book.editions, softcopy: { available: false, price: 0, stockQuantity: 0 } },
    } as typeof book;
    expect((bookJsonLd(off).offers as unknown[]).length).toBe(1);
  });
});

describe("journals for Google Scholar", () => {
  const journal = {
    id: "j1",
    title: "Reading Habits in Ghanaian Senior High Schools",
    slug: "reading-habits",
    authors: ["Ama Mensah", "Kofi Boateng"],
    volume: "3",
    issue: "2",
    publishedAt: new Date("2026-05-01"),
    abstract: "A survey of reading habits.",
    keywords: ["literacy", "education"],
    coverImage: "",
    hasPdf: true,
    pdfSize: 2048,
    links: [],
  };

  it("gives Scholar every author, the date, and the free PDF", () => {
    const meta = scholarMeta(journal, "etext Publishing Network");
    expect(meta.citation_author).toEqual(["Ama Mensah", "Kofi Boateng"]);
    expect(meta.citation_publication_date).toBe("2026/05/01");
    expect(meta.citation_pdf_url).toBe("https://www.example.org/articles/reading-habits/pdf");
    expect(meta).toMatchObject({ citation_volume: "3", citation_issue: "2" });
  });

  it("marks the article free to read", () => {
    expect(scholarlyArticleJsonLd(journal)).toMatchObject({
      "@type": "ScholarlyArticle",
      isAccessibleForFree: true,
    });
  });
});
