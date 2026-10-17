import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** The upload token route: what it allows, and what it refuses. */

vi.mock("server-only", () => ({}));
vi.mock("@/lib/request-ip", () => ({ clientIp: async () => "203.0.113.1" }));
const checkRateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...a: unknown[]) => checkRateLimit(...a),
  rateLimitKey: (scope: string, subject: string) => `${scope}:${subject}`,
}));

let captured: Record<string, unknown> | undefined;
vi.mock("@vercel/blob/client", () => ({
  handleUpload: async ({
    body,
    onBeforeGenerateToken,
  }: {
    body: { payload: { pathname: string } };
    onBeforeGenerateToken: (p: string) => Promise<Record<string, unknown>>;
  }) => {
    captured = await onBeforeGenerateToken(body.payload.pathname);
    return { type: "blob.generate-client-token", clientToken: "t" };
  },
}));

const { POST } = await import("@/app/api/submissions/manuscript/upload/route");

const ask = (pathname: string) =>
  POST(
    new Request("http://localhost/api/submissions/manuscript/upload", {
      method: "POST",
      body: JSON.stringify({ type: "blob.generate-client-token", payload: { pathname } }),
    }),
  );

beforeEach(() => {
  captured = undefined;
  checkRateLimit.mockResolvedValue({ allowed: true });
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_test");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.unstubAllEnvs());

describe("manuscript upload tokens", () => {
  it("allows one document of up to 10 MB, under a randomised name", async () => {
    expect((await ask("manuscripts/book.pdf")).status).toBe(200);
    expect(captured).toMatchObject({
      maximumSizeInBytes: 10 * 1024 * 1024,
      addRandomSuffix: true,
      allowOverwrite: false,
    });
    expect(captured?.allowedContentTypes).toContain("application/pdf");
  });

  it("refuses anything outside the manuscripts folder", async () => {
    const response = await ask("images/cover.png");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Please upload a PDF, DOC or DOCX file." });
  });

  it("refuses when this connection has uploaded too much", async () => {
    checkRateLimit.mockResolvedValue({ allowed: false });
    const response = await ask("manuscripts/book.pdf");
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/Too many uploads/);
  });

  it("is switched off without a Blob store", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    expect((await ask("manuscripts/book.pdf")).status).toBe(503);
  });
});
