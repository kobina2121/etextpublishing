import { siteConfig } from "@/lib/site-config";
import type { AboutPageValues } from "@/lib/validations/content";

/**
 * What the About page says until an admin saves it from /admin/about.
 *
 * This is the copy the page shipped with, drawn from the client's supplied
 * description — nothing invented. "Capacity building" and "bridging academia
 * and industry" are the mandate as stated; the third is the stated means of
 * delivering it.
 */
export const ABOUT_DEFAULTS: AboutPageValues = {
  heroTitle: `About ${siteConfig.name}`,
  heroDescription:
    "Building the capacity of Ghana's publishing houses, and bridging academia and industry.",
  heroImage: "",
  intro: [
    `${siteConfig.name} is a young, vibrant, evolving, unprecedented publishing house, established to build the capacity of existing publishing houses in Ghana.`,
    "Our mandate is to bridge the gap between academia and industry.",
    "Research findings are used to solve industry problems by way of seminars, workshops and training.",
  ].join("\n\n"),
  sectionTitle: "What we do",
  sectionSubtitle: "Three commitments",
  pillars: [
    {
      title: "Capacity building",
      body: "Building the capacity of publishing houses already working in Ghana, rather than competing with them.",
    },
    {
      title: "Academia and industry",
      body: "Bridging the gap between the two, so that what is researched reaches the people who can use it.",
    },
    {
      title: "Applied research",
      body: "Research findings put to work against real industry problems through seminars, workshops and training.",
    },
  ],
};

/** Splits the intro into paragraphs: a blank line starts a new one. */
export function toParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
