import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * settleOrder against a stand-in Paystack and database. What is under test is
 * the decision — paid, still processing, failed, retry later, short of stock —
 * not Mongo or HTTP.
 */

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectToDatabase: vi.fn() }));

const verifyTransaction = vi.fn();
vi.mock("@/lib/payments/paystack", () => ({
  verifyTransaction: (...args: unknown[]) => verifyTransaction(...args),
}));

const order = {
  _id: "order-1",
  reference: "etx_test",
  status: "pending",
  fulfilledAt: undefined as Date | undefined,
  total: 12000,
  currency: "GHS",
  items: [
    {
      publication: "pub-1",
      title: "Salt Roads",
      edition: "hardcopy",
      quantity: 1,
      requiresShipping: true,
    },
  ],
};

const Order = {
  findOne: vi.fn(),
  updateOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
};
const Publication = { updateOne: vi.fn() };
vi.mock("@/models", () => ({ Order, Publication }));

const { settleOrder } = await import("@/server/payments/fulfil");

const paystack = (status: string, extra: Record<string, unknown> = {}) => ({
  ok: true,
  paid: status === "success",
  status,
  amount: 12000,
  currency: "GHS",
  reference: "etx_test",
  paidAt: new Date(),
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  Order.findOne.mockResolvedValue({ ...order });
  Order.findOneAndUpdate.mockResolvedValue({ ...order, status: "paid" });
  Publication.updateOne.mockResolvedValue({ modifiedCount: 1 });
});

describe("settleOrder", () => {
  it("marks a successful payment paid and takes stock", async () => {
    verifyTransaction.mockResolvedValue(paystack("success"));
    const result = await settleOrder("etx_test");
    expect(result).toMatchObject({ ok: true, status: "paid" });
    expect(Publication.updateOne).toHaveBeenCalledOnce();
  });

  it.each(["ongoing", "pending", "processing", "queued"])(
    "treats a %s mobile money payment as still processing, not failed",
    async (status) => {
      verifyTransaction.mockResolvedValue(paystack(status));
      const result = await settleOrder("etx_test");
      expect(result).toMatchObject({ ok: true, status: "processing" });
      // The order must stay pending — marking it failed is what told buyers
      // to pay a second time.
      expect(Order.updateOne).not.toHaveBeenCalled();
    },
  );

  it.each(["failed", "abandoned", "reversed"])("marks a %s payment unpaid", async (status) => {
    verifyTransaction.mockResolvedValue(paystack(status));
    const result = await settleOrder("etx_test");
    expect(result).toMatchObject({ ok: true, status: "unpaid" });
    expect(Order.updateOne).toHaveBeenCalledWith(
      { _id: "order-1", status: "pending" },
      { $set: { status: "failed" } },
    );
  });

  it("asks for a retry when Paystack cannot be reached", async () => {
    verifyTransaction.mockResolvedValue({ ok: false, error: "fetch failed", retryable: true });
    expect(await settleOrder("etx_test")).toEqual({
      ok: false,
      error: "fetch failed",
      retryable: true,
    });
  });

  it("does not retry an unknown order", async () => {
    Order.findOne.mockResolvedValue(null);
    expect(await settleOrder("etx_nope")).toMatchObject({ ok: false, retryable: false });
  });

  it("refuses an underpayment for good", async () => {
    verifyTransaction.mockResolvedValue(paystack("success", { amount: 100 }));
    expect(await settleOrder("etx_test")).toMatchObject({ ok: false, retryable: false });
  });

  it("records a shortfall when the last copy sold twice", async () => {
    verifyTransaction.mockResolvedValue(paystack("success"));
    Publication.updateOne.mockResolvedValue({ modifiedCount: 0 });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await settleOrder("etx_test");

    expect(result).toMatchObject({ ok: true, status: "paid" });
    expect(Order.updateOne).toHaveBeenCalledWith(
      { _id: "order-1" },
      { $set: { stockShortfall: expect.stringContaining("Salt Roads (hardcopy) × 1") } },
    );
  });

  it("does nothing twice: a second caller finds it already paid", async () => {
    verifyTransaction.mockResolvedValue(paystack("success"));
    Order.findOneAndUpdate.mockResolvedValue(null);
    expect(await settleOrder("etx_test")).toMatchObject({ ok: true, status: "already-paid" });
    expect(Publication.updateOne).not.toHaveBeenCalled();
  });
});
