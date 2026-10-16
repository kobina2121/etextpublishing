import "server-only";

import { cache } from "react";

import { ABOUT_DEFAULTS } from "@/lib/about-defaults";
import { connectToDatabase } from "@/lib/db";
import type { AboutPageValues } from "@/lib/validations/content";
import { AboutPage } from "@/models";

/**
 * The About page's content: what an admin saved, or the defaults.
 *
 * Falls back to the defaults when nothing has been saved yet and when the
 * database cannot be reached — the page must never fail for want of copy.
 * Wrapped in `cache` so the page and its metadata share one read.
 */
export const getAboutPage = cache(async (): Promise<AboutPageValues> => {
  try {
    await connectToDatabase();
    const doc = await AboutPage.findOne({ key: "about" }).lean();
    if (!doc) return ABOUT_DEFAULTS;
    return {
      heroTitle: doc.heroTitle,
      heroDescription: doc.heroDescription,
      heroImage: doc.heroImage ?? "",
      intro: doc.intro,
      sectionTitle: doc.sectionTitle,
      sectionSubtitle: doc.sectionSubtitle ?? "",
      pillars: doc.pillars.map(({ title, body }) => ({ title, body })),
    };
  } catch (error) {
    console.error("[about] could not read saved content; showing defaults", error);
    return ABOUT_DEFAULTS;
  }
});
