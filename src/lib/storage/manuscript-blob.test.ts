import { beforeEach, describe, expect, it, vi } from "vitest";

/** Checks on a file the browser says it uploaded — none of which is trusted. */

vi.mock("server-only", () => ({}));
const head = vi.fn();
const get = vi.fn();
const del = vi.fn();
vi.mock("@vercel/blob", () => ({
  head: (...a: unknown[]) => head(...a),
  get: (...a: unknown[]) => get(...a),
  del: (...a: unknown[]) => del(...a),
}));

const { isAllowedManuscriptPathname, verifyUploadedManuscript } =
  await import("@/lib/storage/manuscript-blob");

const streamOf = (bytes: number[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(bytes));
      controller.close();
    },
  });
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34];
const HTML = [...new TextEncoder().encode("<html><script>")];
const path = "manuscripts/the-river-road-Ab12Cd.pdf";

beforeEach(() => {
  vi.clearAllMocks();
  head.mockResolvedValue({ url: "https://x.blob.vercel-storage.com/" + path, size: 2048 });
  get.mockResolvedValue({ statusCode: 200, stream: streamOf(PDF), blob: {} });
  del.mockResolvedValue(undefined);
});

describe("isAllowedManuscriptPathname", () => {
  it("allows documents directly in the manuscripts folder", () => {
    expect(isAllowedManuscriptPathname("manuscripts/book.pdf")).toBe(true);
    expect(isAllowedManuscriptPathname("manuscripts/book.DOCX")).toBe(true);
  });

  it("refuses other folders, nesting, escapes and file types", () => {
    expect(isAllowedManuscriptPathname("images/book.pdf")).toBe(false);
    expect(isAllowedManuscriptPathname("manuscripts/a/book.pdf")).toBe(false);
    expect(isAllowedManuscriptPathname("manuscripts/../secret.pdf")).toBe(false);
    expect(isAllowedManuscriptPathname("manuscripts/page.html")).toBe(false);
  });
});

describe("verifyUploadedManuscript", () => {
  it("accepts a real PDF within the limit", async () => {
    expect(await verifyUploadedManuscript(path, "The River Road.pdf")).toEqual({
      ok: true,
      key: `blob:${path}`,
      fileName: "The River Road.pdf",
      size: 2048,
    });
    expect(del).not.toHaveBeenCalled();
  });

  it("rejects and deletes a file that is not really a document", async () => {
    get.mockResolvedValue({ statusCode: 200, stream: streamOf(HTML), blob: {} });
    expect(await verifyUploadedManuscript(path, "evil.pdf")).toMatchObject({ ok: false });
    expect(del).toHaveBeenCalled();
  });

  it("rejects and deletes a file over 10 MB", async () => {
    head.mockResolvedValue({ url: "u", size: 10 * 1024 * 1024 + 1 });
    expect(await verifyUploadedManuscript(path, "big.pdf")).toMatchObject({ ok: false });
    expect(del).toHaveBeenCalledWith("u");
  });

  it("refuses a pathname outside the manuscripts folder without looking it up", async () => {
    expect(await verifyUploadedManuscript("images/cover.pdf", "x.pdf")).toMatchObject({
      ok: false,
    });
    expect(head).not.toHaveBeenCalled();
  });

  it("refuses a file that is not in the store", async () => {
    head.mockRejectedValue(new Error("not found"));
    expect(await verifyUploadedManuscript(path, "x.pdf")).toMatchObject({ ok: false });
  });
});
