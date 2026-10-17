import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ publicEnv: { siteUrl: "https://www.example.org" } }));
vi.mock("@vercel/blob", () => ({ del: vi.fn(), head: vi.fn(), get: vi.fn() }));
vi.mock("@/lib/db", () => ({ connectToDatabase: vi.fn() }));

const { downloadFileUrl, downloadsPageUrl, signDownload, verifyDownload } =
  await import("@/lib/downloads");
const { sniffDocument } = await import("@/lib/storage/document-store");

beforeEach(() => vi.stubEnv("AUTH_SECRET", "test-secret-for-signing"));
afterEach(() => vi.unstubAllEnvs());

describe("download links", () => {
  it("accept the signature made for that order", () => {
    expect(verifyDownload("etx_abc", signDownload("etx_abc"))).toBe(true);
  });

  it("refuse another order's signature, a tampered one, or none", () => {
    expect(verifyDownload("etx_other", signDownload("etx_abc"))).toBe(false);
    expect(verifyDownload("etx_abc", signDownload("etx_abc").slice(0, -1) + "x")).toBe(false);
    expect(verifyDownload("etx_abc", "")).toBe(false);
    expect(verifyDownload("etx_abc", null)).toBe(false);
  });

  it("cannot be made without the site's secret", () => {
    const real = signDownload("etx_abc");
    vi.stubEnv("AUTH_SECRET", "someone-elses-guess");
    expect(signDownload("etx_abc")).not.toBe(real);
  });

  it("builds page and file links carrying the signature", () => {
    const sig = signDownload("etx_abc");
    expect(downloadsPageUrl("etx_abc", true)).toBe(
      `https://www.example.org/downloads/etx_abc?t=${sig}`,
    );
    expect(downloadFileUrl("etx_abc", "a".repeat(24))).toBe(
      `/api/downloads/etx_abc/${"a".repeat(24)}?t=${sig}`,
    );
  });
});

describe("sniffDocument", () => {
  const bytes = (text: string) => new TextEncoder().encode(text);
  const epub = () => {
    const header = new Uint8Array(64);
    header.set([0x50, 0x4b, 0x03, 0x04]);
    header.set(bytes("mimetypeapplication/epub+zip"), 30);
    return header;
  };

  it("recognises PDF and EPUB by their bytes", () => {
    expect(sniffDocument(bytes("%PDF-1.7"))).toBe("pdf");
    expect(sniffDocument(epub())).toBe("epub");
  });

  it("does not take a plain zip or HTML for a document", () => {
    const zip = new Uint8Array(64);
    zip.set([0x50, 0x4b, 0x03, 0x04]);
    expect(sniffDocument(zip)).toBeNull();
    expect(sniffDocument(bytes("<html><script>"))).toBeNull();
  });
});
