import { describe, expect, it } from "vitest";

import {
  MANUSCRIPT_MAX_BYTES,
  manuscriptSchema,
  sniffManuscriptType,
  validateManuscriptFile,
} from "@/lib/validations/manuscript";

const valid = {
  authorName: "Ama Mensah",
  email: "ama@example.com",
  title: "The River Road",
  genre: "Fiction",
  wordCount: 42000,
  synopsis: "A family saga across three generations of a fishing town on the Volta.",
};

const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)]);

describe("manuscriptSchema", () => {
  it("accepts a complete submission", () => {
    expect(manuscriptSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a genre outside the list", () => {
    expect(manuscriptSchema.safeParse({ ...valid, genre: "Westerns" }).success).toBe(false);
  });

  it("rejects implausible word counts", () => {
    expect(manuscriptSchema.safeParse({ ...valid, wordCount: 100 }).success).toBe(false);
    expect(manuscriptSchema.safeParse({ ...valid, wordCount: 1000.5 }).success).toBe(false);
  });

  it("rejects a short synopsis", () => {
    expect(manuscriptSchema.safeParse({ ...valid, synopsis: "Too short." }).success).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    expect(manuscriptSchema.safeParse({ ...valid, website: "spam.example" }).success).toBe(false);
  });
});

describe("validateManuscriptFile", () => {
  it("requires a file", () => {
    expect(validateManuscriptFile(null)).toMatch(/attach/);
  });

  it("rejects a file over the limit", () => {
    const big = new File([new Uint8Array(MANUSCRIPT_MAX_BYTES + 1)], "big.pdf", {
      type: "application/pdf",
    });
    expect(validateManuscriptFile(big)).toMatch(/larger than/);
  });

  it("accepts a .docx whose browser type is blank", () => {
    expect(validateManuscriptFile(new File(["x"], "book.docx", { type: "" }))).toBeNull();
  });

  it("rejects other file types", () => {
    expect(validateManuscriptFile(new File(["x"], "book.txt", { type: "text/plain" }))).toMatch(
      /PDF, DOC or DOCX/,
    );
  });
});

describe("sniffManuscriptType", () => {
  it("recognises a PDF from its bytes, whatever its name", () => {
    expect(sniffManuscriptType(bytes(0x25, 0x50, 0x44, 0x46, 0x2d), "x.bin")).toBe(
      "application/pdf",
    );
  });

  it("recognises a legacy .doc", () => {
    expect(
      sniffManuscriptType(bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1), "x.doc"),
    ).toBe("application/msword");
  });

  it("accepts a zip only under a .docx name", () => {
    const zip = bytes(0x50, 0x4b, 0x03, 0x04);
    expect(sniffManuscriptType(zip, "book.DOCX")).toMatch(/wordprocessingml/);
    expect(sniffManuscriptType(zip, "payload.zip")).toBeNull();
  });

  it("rejects HTML dressed up as a PDF", () => {
    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    expect(sniffManuscriptType(html, "evil.pdf")).toBeNull();
  });
});
