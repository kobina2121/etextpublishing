import { describe, expect, it, vi } from "vitest";

import { journalSchema, splitList } from "@/lib/validations/journal";

vi.mock("server-only", () => ({}));
vi.mock("@vercel/blob", () => ({ del: vi.fn(), head: vi.fn(), get: vi.fn() }));
vi.mock("@/lib/db", () => ({ connectToDatabase: vi.fn() }));
vi.mock("@/models", () => ({ JournalFile: {} }));

const { isAllowedJournalPathname, isPdf } = await import("@/lib/storage/journal-files");

const valid = {
  title: "Reading Habits in Ghanaian Senior High Schools",
  slug: "reading-habits-in-ghanaian-shs",
  authors: "Ama Mensah, Kofi Boateng",
  volume: "3",
  issue: "2",
  publishedAt: "2026-05-01",
  abstract: "A survey of reading habits across twelve senior high schools in three regions.",
  keywords: "literacy, education",
  pdfKey: `db:${"a".repeat(24)}`,
  pdfName: "reading-habits.pdf",
  pdfSize: 2048,
  status: "published" as const,
};

describe("journalSchema", () => {
  it("accepts a complete, published entry", () => {
    expect(journalSchema.safeParse(valid).success).toBe(true);
  });

  it("will not publish without the PDF", () => {
    const result = journalSchema.safeParse({ ...valid, pdfKey: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["pdfKey"]);
  });

  it("lets a draft be saved before its PDF is ready", () => {
    expect(journalSchema.safeParse({ ...valid, pdfKey: "", status: "draft" }).success).toBe(true);
  });

  it("refuses a storage key it did not issue", () => {
    expect(
      journalSchema.safeParse({ ...valid, pdfKey: "https://elsewhere.com/x.pdf" }).success,
    ).toBe(false);
  });

  it("needs at least one author and a real abstract", () => {
    expect(journalSchema.safeParse({ ...valid, authors: " , " }).success).toBe(false);
    expect(journalSchema.safeParse({ ...valid, abstract: "Short." }).success).toBe(false);
  });
});

describe("splitList", () => {
  it("splits on commas, semicolons and new lines, dropping blanks", () => {
    expect(splitList("Ama Mensah,  Kofi Boateng;\nEsi Owusu, ")).toEqual([
      "Ama Mensah",
      "Kofi Boateng",
      "Esi Owusu",
    ]);
  });
});

describe("journal PDF checks", () => {
  it("recognises a PDF by its bytes, not its name", () => {
    expect(isPdf(new TextEncoder().encode("%PDF-1.7\n"))).toBe(true);
    expect(isPdf(new TextEncoder().encode("<html>"))).toBe(false);
  });

  it("issues upload tokens only for PDFs in the journals folder", () => {
    expect(isAllowedJournalPathname("journals/reading-habits.pdf")).toBe(true);
    expect(isAllowedJournalPathname("manuscripts/reading-habits.pdf")).toBe(false);
    expect(isAllowedJournalPathname("journals/../x.pdf")).toBe(false);
    expect(isAllowedJournalPathname("journals/page.html")).toBe(false);
  });
});
