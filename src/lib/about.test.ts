import { describe, expect, it } from "vitest";

import { ABOUT_DEFAULTS, toParagraphs } from "@/lib/about-defaults";
import { aboutPageSchema } from "@/lib/validations/content";

describe("About page content", () => {
  it("ships defaults that pass its own rules", () => {
    expect(aboutPageSchema.safeParse(ABOUT_DEFAULTS).success).toBe(true);
  });

  it("splits the intro on blank lines, ignoring stray spacing", () => {
    expect(toParagraphs("One.\n\nTwo.\n  \nThree.\n")).toEqual(["One.", "Two.", "Three."]);
    expect(toParagraphs("A line\nwrapped by hand.")).toEqual(["A line\nwrapped by hand."]);
  });

  it("takes uploaded banner images only", () => {
    const withImage = (heroImage: string) =>
      aboutPageSchema.safeParse({ ...ABOUT_DEFAULTS, heroImage }).success;
    expect(withImage("")).toBe(true);
    expect(withImage(`/api/images/${"a".repeat(24)}`)).toBe(true);
    expect(withImage("https://example.com/banner.jpg")).toBe(false);
  });

  it("keeps between one and six cards", () => {
    const withCards = (n: number) =>
      aboutPageSchema.safeParse({
        ...ABOUT_DEFAULTS,
        pillars: Array.from({ length: n }, (_, i) => ({
          title: `Card ${i + 1}`,
          body: "A sentence about it.",
        })),
      }).success;
    expect(withCards(0)).toBe(false);
    expect(withCards(1)).toBe(true);
    expect(withCards(6)).toBe(true);
    expect(withCards(7)).toBe(false);
  });
});
