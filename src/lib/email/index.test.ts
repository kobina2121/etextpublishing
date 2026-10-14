import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * What actually reaches Resend: the sender, and a Reply-To pointing at a real
 * inbox, since the sending domain has none.
 */

vi.mock("server-only", () => ({}));

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

const { normaliseSender, sendMail } = await import("@/lib/email");

const message = { to: "reader@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi" };

beforeEach(() => {
  send.mockReset().mockResolvedValue({ data: { id: "e1" }, error: null });
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.stubEnv("EMAIL_FROM", "etext Publishing Network <no-reply@etextpublishingnetwork.com>");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sendMail", () => {
  it("sends from our domain with replies going to a real inbox", async () => {
    vi.stubEnv("EMAIL_REPLY_TO", "etextpublishingnetwork@gmail.com");
    expect(await sendMail(message)).toEqual({ ok: true, delivered: true });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "etext Publishing Network <no-reply@etextpublishingnetwork.com>",
        replyTo: "etextpublishingnetwork@gmail.com",
        to: "reader@example.com",
      }),
    );
  });

  it("leaves Reply-To off when none is configured", async () => {
    vi.stubEnv("EMAIL_REPLY_TO", "");
    await sendMail(message);
    expect(send.mock.calls[0]?.[0]).not.toHaveProperty("replyTo");
  });

  it("strips quotes pasted into a hosting dashboard along with the value", async () => {
    vi.stubEnv("EMAIL_FROM", '"etext Publishing Network <no-reply@etextpublishingnetwork.com>"');
    vi.stubEnv("EMAIL_REPLY_TO", "'etextpublishingnetwork@gmail.com'");
    await sendMail(message);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "etext Publishing Network <no-reply@etextpublishingnetwork.com>",
        replyTo: "etextpublishingnetwork@gmail.com",
      }),
    );
  });

  it("reports Resend's refusal instead of claiming success", async () => {
    send.mockResolvedValue({ data: null, error: { message: "domain not verified" } });
    expect(await sendMail(message)).toEqual({ ok: false, error: "domain not verified" });
  });
});

describe("normaliseSender", () => {
  const clean = "etext Publishing Network <no-reply@etextpublishingnetwork.com>";

  it.each([
    [clean, clean],
    ['"etext Publishing Network <no-reply@etextpublishingnetwork.com>"', clean],
    ["\u201Cetext Publishing Network <no-reply@etextpublishingnetwork.com>\u201D", clean],
    ["etext Publishing Network no-reply@etextpublishingnetwork.com", clean],
    ["etext Publishing Network<no-reply@etextpublishingnetwork.com>", clean],
    ['"etext Publishing Network" <no-reply@etextpublishingnetwork.com>', clean],
    ["  etext   Publishing Network   <no-reply@etextpublishingnetwork.com>  ", clean],
    ["no-reply@etextpublishingnetwork.com", "no-reply@etextpublishingnetwork.com"],
    ["<no-reply@etextpublishingnetwork.com>", "no-reply@etextpublishingnetwork.com"],
  ])("turns %j into a form Resend accepts", (raw, expected) => {
    expect(normaliseSender(raw)).toBe(expected);
  });

  it("gives up when there is no address at all", () => {
    expect(normaliseSender("etext Publishing Network")).toBeUndefined();
    expect(normaliseSender(undefined)).toBeUndefined();
  });
});

describe("sendMail with a damaged EMAIL_FROM", () => {
  it("sends from a cleaned-up sender instead of failing", async () => {
    vi.stubEnv(
      "EMAIL_FROM",
      "EMAIL_FROM=\u201Cetext Publishing Network no-reply@etextpublishingnetwork.com\u201D",
    );
    expect(await sendMail(message)).toEqual({ ok: true, delivered: true });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "etext Publishing Network <no-reply@etextpublishingnetwork.com>",
      }),
    );
  });
});
