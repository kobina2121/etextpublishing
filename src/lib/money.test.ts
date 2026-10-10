import { describe, expect, it } from "vitest";

import {
  editionRequiresShipping,
  formatMoney,
  subunitFactor,
  toMajorUnits,
  toMinorUnits,
} from "@/lib/money";

describe("money", () => {
  it("converts major to minor units without float drift", () => {
    expect(toMinorUnits(0.1 + 0.2)).toBe(30);
    expect(toMinorUnits(19.99)).toBe(1999);
    expect(toMinorUnits(1234.56, "NGN")).toBe(123456);
  });

  it("round-trips minor units back to major", () => {
    expect(toMajorUnits(1999)).toBe(19.99);
    expect(toMajorUnits(toMinorUnits(45.5))).toBe(45.5);
  });

  it("falls back to a factor of 100 for unknown currencies", () => {
    expect(subunitFactor("ghs")).toBe(100);
    expect(subunitFactor("XYZ")).toBe(100);
  });

  it("formats with two decimal places", () => {
    expect(formatMoney(150000, "GHS")).toMatch(/1,500\.00/);
  });

  it("falls back to a plain prefix when the currency code is invalid", () => {
    expect(formatMoney(1050, "NOT-A-CODE")).toBe("NOT-A-CODE 10.50");
  });

  it("ships hardcopies only", () => {
    expect(editionRequiresShipping("hardcopy")).toBe(true);
    expect(editionRequiresShipping("softcopy")).toBe(false);
  });
});
