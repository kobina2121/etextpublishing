import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** The contact form: saved, then emailed to the team with Reply-To the visitor. */

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ connectToDatabase: vi.fn() }));
vi.mock("@/lib/request-ip", () => ({ clientIp: async () => "203.0.113.1" }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: async () => ({ allowed: true, remaining: 4, retryAfter: 0 }),
  rateLimitKey: (scope: string, subject: string) => `${scope}:${subject}`,
}));
vi.mock("@/lib/env", () => ({ publicEnv: { siteUrl: "https://www.example.org" } }));
vi.mock("@/server/actions/shared", () => ({ toFieldErrors: () => ({}) }));

const sendMail = vi.fn();
vi.mock("@/lib/email", () => ({ sendMail: (...a: unknown[]) => sendMail(...a) }));

const create = vi.fn();
const settingsEmail = vi.fn();
vi.mock("@/models", () => ({
  ContactMessage: { create: (...a: unknown[]) => create(...a) },
  SiteSettings: {
    findOne: () => ({ select: () => ({ lean: () => settingsEmail() }) }),
  },
}));

const { submitContactMessage } = await import("@/server/actions/forms");

const visitor = {
  name: "Kofi Mensah",
  email: "kofi@gmail.com",
  phone: "",
  subject: "Distribution",
  message: "We would like to stock your titles in our shops in Kumasi.",
};

beforeEach(() => {
  vi.clearAllMocks();
  create.mockResolvedValue({ _id: { toString: () => "m1" } });
  sendMail.mockResolvedValue({ ok: true, delivered: true });
  settingsEmail.mockResolvedValue({ contact: { email: "settings@etext.example" } });
  vi.stubEnv("EMAIL_TO_CONTACT", "etextpublishingnetwork@gmail.com");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.unstubAllEnvs());

describe("submitContactMessage", () => {
  it("saves the message and emails it to the team, replying to the visitor", async () => {
    expect(await submitContactMessage(visitor)).toEqual({ ok: true });
    expect(create).toHaveBeenCalledOnce();
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "etextpublishingnetwork@gmail.com",
        replyTo: "kofi@gmail.com",
        subject: "New message: Distribution",
      }),
    );
    expect(sendMail.mock.calls[0]?.[0].text).toContain("https://www.example.org/admin/messages/m1");
  });

  it("falls back to the contact email saved in settings", async () => {
    vi.stubEnv("EMAIL_TO_CONTACT", "");
    await submitContactMessage(visitor);
    expect(sendMail.mock.calls[0]?.[0].to).toBe("settings@etext.example");
  });

  it("still saves, and still tells the visitor it worked, if the email fails", async () => {
    sendMail.mockRejectedValue(new Error("mail down"));
    expect(await submitContactMessage(visitor)).toEqual({ ok: true });
    expect(create).toHaveBeenCalledOnce();
  });

  it("emails nothing for a bot that filled the hidden field", async () => {
    expect(await submitContactMessage({ ...visitor, website: "spam" })).toEqual({ ok: true });
    expect(create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });
});
