import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema, setPasswordSchema } from "@/lib/validations/auth";
import { cartPayloadSchema, checkoutSchema } from "@/lib/validations/checkout";
import { contactSchema } from "@/lib/validations/contact";
import { sniffImageType } from "@/lib/validations/upload";

describe("contactSchema", () => {
  const valid = {
    name: "Kofi",
    email: "kofi@example.com",
    subject: "Distribution",
    message: "We would like to stock your titles in our shops.",
  };

  it("accepts a complete message and an empty phone", () => {
    expect(contactSchema.safeParse({ ...valid, phone: "" }).success).toBe(true);
  });

  it("rejects a message that is too short to act on", () => {
    expect(contactSchema.safeParse({ ...valid, message: "Hi" }).success).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    expect(contactSchema.safeParse({ ...valid, website: "x" }).success).toBe(false);
  });
});

describe("auth schemas", () => {
  const valid = {
    name: "Esi",
    email: "esi@example.com",
    password: "a long passphrase",
    confirmPassword: "a long passphrase",
  };

  it("accepts a valid sign-up", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("reports mismatched passwords on the confirmation field", () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: "something else" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
  });

  it("enforces bcrypt-safe password lengths", () => {
    const short = "short";
    const long = "x".repeat(73);
    expect(
      registerSchema.safeParse({ ...valid, password: short, confirmPassword: short }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ ...valid, password: long, confirmPassword: long }).success,
    ).toBe(false);
  });

  it("requires both sign-in fields", () => {
    expect(loginSchema.safeParse({ email: "esi@example.com", password: "" }).success).toBe(false);
  });
});

describe("setPasswordSchema", () => {
  it("needs no current password for a Google-only account", () => {
    const pass = "a long passphrase";
    expect(setPasswordSchema.safeParse({ password: pass, confirmPassword: pass }).success).toBe(
      true,
    );
  });

  it("applies the same length and match rules as sign-up", () => {
    expect(
      setPasswordSchema.safeParse({ password: "short", confirmPassword: "short" }).success,
    ).toBe(false);
    expect(
      setPasswordSchema.safeParse({ password: "a long passphrase", confirmPassword: "other" })
        .success,
    ).toBe(false);
  });
});

describe("checkoutSchema", () => {
  const buyer = { customerName: "Yaw", email: "yaw@example.com" };

  it("needs no address for a softcopy-only basket", () => {
    expect(checkoutSchema.safeParse({ ...buyer, requiresShipping: false }).success).toBe(true);
  });

  it("needs an address and a phone when something ships", () => {
    const result = checkoutSchema.safeParse({ ...buyer, requiresShipping: true });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((issue) => issue.path.join(".")) ?? [];
    expect(paths).toEqual(
      expect.arrayContaining(["address.line1", "address.city", "address.country", "phone"]),
    );
  });
});

describe("checkoutSchema delivery details", () => {
  const shipped = {
    customerName: "Yaw",
    email: "yaw@example.com",
    phone: "0241234567",
    requiresShipping: true,
    address: { line1: "12 Ring Road", city: "Accra", region: "Greater Accra", country: "Ghana" },
  };
  const gps = (digitalAddress: string) =>
    checkoutSchema.safeParse({ ...shipped, address: { ...shipped.address, digitalAddress } });

  it("tidies a GhanaPost GPS address into the standard form", () => {
    expect(gps("ga-123-4567").data?.address.digitalAddress).toBe("GA-123-4567");
    expect(gps("GA1234567").data?.address.digitalAddress).toBe("GA-123-4567");
    expect(gps("AK 0397 1234").data?.address.digitalAddress).toBe("AK-0397-1234");
  });

  it("allows the GPS address to be left blank", () => {
    expect(gps("").success).toBe(true);
    expect(checkoutSchema.safeParse(shipped).success).toBe(true);
  });

  it("rejects something that is not a GPS address", () => {
    expect(gps("12 Ring Road").success).toBe(false);
    expect(gps("GA-12").success).toBe(false);
  });

  it("caps delivery instructions", () => {
    const long = { ...shipped, address: { ...shipped.address, instructions: "x".repeat(301) } };
    expect(checkoutSchema.safeParse(long).success).toBe(false);
  });
});

describe("cartPayloadSchema", () => {
  const line = { publicationId: "a".repeat(24), edition: "hardcopy", quantity: 1 };

  it("accepts ids, an edition and a quantity", () => {
    expect(cartPayloadSchema.safeParse([line]).success).toBe(true);
  });

  it("strips a price the browser tries to send", () => {
    const parsed = cartPayloadSchema.parse([{ ...line, unitPrice: 1 }]);
    expect(parsed[0]).not.toHaveProperty("unitPrice");
  });

  it("refuses forged editions, bad ids and silly quantities", () => {
    expect(cartPayloadSchema.safeParse([{ ...line, edition: "free" }]).success).toBe(false);
    expect(cartPayloadSchema.safeParse([{ ...line, publicationId: "x" }]).success).toBe(false);
    expect(cartPayloadSchema.safeParse([{ ...line, quantity: 21 }]).success).toBe(false);
    expect(cartPayloadSchema.safeParse([]).success).toBe(false);
  });
});

describe("sniffImageType", () => {
  const pad = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)]);

  it("recognises PNG and JPEG from their bytes", () => {
    expect(sniffImageType(pad(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffImageType(pad(0xff, 0xd8, 0xff))).toBe("image/jpeg");
  });

  it("refuses SVG, which can carry script", () => {
    expect(sniffImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
});
