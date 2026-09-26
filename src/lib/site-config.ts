import { publicEnv } from "@/lib/env";

/**
 * Build-time fallback for company information.
 *
 * From Phase 4 onward the live values come from the `SiteSettings` document so
 * an admin can edit them without a deploy. This file only supplies defaults for
 * the initial seed and for contexts that cannot reach the database (metadata
 * generated before settings exist, local development, error boundaries).
 *
 * PLACEHOLDERS: every value marked TODO is invented scaffolding, not real
 * company data. Replace via the admin Settings screen or the seed script.
 */
export const siteConfig = {
  /** TODO(client): confirm legal/trading name and preferred capitalisation. */
  name: "eText Publishing",
  /** TODO(client): supply real tagline. */
  tagline: "Publishing that puts authors first",
  /** TODO(client): supply real description (used as the default meta description). */
  description:
    "An independent publishing house representing authors across fiction, non-fiction and academic titles.",
  url: publicEnv.siteUrl,
  locale: "en",

  contact: {
    /** TODO(client): supply real contact address. */
    email: "hello@example.com",
    /** TODO(client): supply real phone number. */
    phone: "+000 000 0000",
    /** TODO(client): supply real postal address. */
    address: {
      line1: "123 Placeholder Street",
      line2: "",
      city: "City",
      region: "Region",
      postalCode: "00000",
      country: "Country",
    },
  },

  /** TODO(client): supply real handles; empty strings are hidden in the UI. */
  socials: {
    x: "",
    facebook: "",
    instagram: "",
    linkedin: "",
  },

  /** Public navigation. Kept here so the Navbar and sitemap share one source. */
  nav: [
    { label: "About", href: "/about" },
    { label: "Publications", href: "/publications" },
    { label: "Authors", href: "/authors" },
    { label: "Services", href: "/services" },
    { label: "News", href: "/news" },
    { label: "Contact", href: "/contact" },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
