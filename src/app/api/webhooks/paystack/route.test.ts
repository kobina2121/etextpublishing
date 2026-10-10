import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The webhook's reply decides whether Paystack tries again, so each outcome is
 * pinned: refuse forgeries, retry our faults, acknowledge final answers.
 */

const verifyWebhookSignature = vi.fn();
vi.mock("@/lib/payments/paystack", () => ({
  verifyWebhookSignature: (...args: unknown[]) => verifyWebhookSignature(...args),
}));

const settleOrder = vi.fn();
vi.mock("@/server/payments/fulfil", () => ({
  settleOrder: (...args: unknown[]) => settleOrder(...args),
}));

const { POST } = await import("@/app/api/webhooks/paystack/route");

const event = (body: unknown) =>
  new Request("http://localhost/api/webhooks/paystack", {
    method: "POST",
    headers: { "x-paystack-signature": "sig" },
    body: JSON.stringify(body),
  });

const charge = { event: "charge.success", data: { reference: "etx_test" } };

beforeEach(() => {
  vi.clearAllMocks();
  verifyWebhookSignature.mockReturnValue(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Paystack webhook", () => {
  it("refuses a bad signature before reading the body", async () => {
    verifyWebhookSignature.mockReturnValue(false);
    expect((await POST(event(charge))).status).toBe(401);
    expect(settleOrder).not.toHaveBeenCalled();
  });

  it("acknowledges a settled payment", async () => {
    settleOrder.mockResolvedValue({ ok: true, status: "paid", orderReference: "etx_test" });
    expect((await POST(event(charge))).status).toBe(200);
  });

  it("asks Paystack to retry when we could not reach a decision", async () => {
    settleOrder.mockResolvedValue({ ok: false, error: "fetch failed", retryable: true });
    expect((await POST(event(charge))).status).toBe(500);
  });

  it("acknowledges a final failure, which retrying would not fix", async () => {
    settleOrder.mockResolvedValue({ ok: false, error: "mismatch", retryable: false });
    expect((await POST(event(charge))).status).toBe(200);
  });

  it("ignores events it does not act on", async () => {
    expect((await POST(event({ event: "transfer.success", data: {} }))).status).toBe(200);
    expect(settleOrder).not.toHaveBeenCalled();
  });
});
