import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HeadingText } from "@/components/ui/heading-text";

const render = (text: string) => renderToStaticMarkup(<HeadingText>{text}</HeadingText>);

describe("HeadingText", () => {
  it("leaves ordinary headings to the CSS capitalisation", () => {
    expect(render("Become a published author")).toBe("Become a published author");
  });

  it("keeps the brand lowercase, however it was typed", () => {
    expect(render("About etext Publishing Network")).toBe(
      'About <span class="normal-case">etext</span> Publishing Network',
    );
    expect(render("With eText Publishing")).toContain('<span class="normal-case">etext</span>');
  });

  it("keeps deliberate mixed case such as iPhone", () => {
    expect(render("Reading on an iPhone")).toContain('<span class="normal-case">iPhone</span>');
  });
});
