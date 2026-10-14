import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * requestPasswordReset's handling of a failed send: the link nobody received
 * must be withdrawn, so it does not use up one of the account's three tries.
 */

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/guards", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/db", () => ({ connectToDatabase: vi.fn() }));
vi.mock("@/lib/request-ip", () => ({ clientIp: async () => "203.0.113.1" }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: async () => ({ allowed: true, remaining: 9, retryAfter: 0 }),
  rateLimitKey: (scope: string, subject: string) => `${scope}:${subject}`,
}));
vi.mock("@/lib/env", () => ({ publicEnv: { siteUrl: "https://www.example.com" } }));
vi.mock("@/models", () => ({ User: {} }));

const issuePasswordReset = vi.fn();
const withdrawPasswordReset = vi.fn();
vi.mock("@/lib/auth/password-reset", () => ({
  RESET_TTL_MINUTES: 30,
  issuePasswordReset: (...args: unknown[]) => issuePasswordReset(...args),
  withdrawPasswordReset: (...args: unknown[]) => withdrawPasswordReset(...args),
  consumePasswordReset: vi.fn(),
}));

const sendMail = vi.fn();
vi.mock("@/lib/email", () => ({
  isEmailConfigured: () => true,
  sendMail: (...args: unknown[]) => sendMail(...args),
}));

const { requestPasswordReset } = await import("@/server/actions/auth");

beforeEach(() => {
  vi.clearAllMocks();
  issuePasswordReset.mockResolvedValue({ ok: true, token: "t".repeat(43), name: "Ama" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("requestPasswordReset", () => {
  it("keeps the link when the email goes out", async () => {
    sendMail.mockResolvedValue({ ok: true, delivered: true });
    expect(await requestPasswordReset({ email: "ama@example.com" })).toMatchObject({ ok: true });
    expect(withdrawPasswordReset).not.toHaveBeenCalled();
  });

  it("withdraws the link when the email could not be sent", async () => {
    sendMail.mockResolvedValue({ ok: false, error: "API key is invalid" });
    expect(await requestPasswordReset({ email: "ama@example.com" })).toMatchObject({ ok: false });
    expect(withdrawPasswordReset).toHaveBeenCalledWith("t".repeat(43));
  });

  it("answers the same for an unknown address, and sends nothing", async () => {
    issuePasswordReset.mockResolvedValue({ ok: false, reason: "no-account" });
    expect(await requestPasswordReset({ email: "nobody@example.com" })).toMatchObject({
      ok: true,
    });
    expect(sendMail).not.toHaveBeenCalled();
  });
});
