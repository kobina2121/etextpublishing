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
  /** Taken from the supplied logo artwork, which reads "etext PUBLISHING NETWORK". */
  name: "eText Publishing Network",
  /**
   * The mandate as stated by the client, used verbatim. The previous line
   * ("Publishing that puts authors first") described an author-services house,
   * which this is not. Editable at /admin/settings.
   */
  tagline: "Bridging academia and industry",
  /**
   * Condensed from the supplied description — no claims added. Used as the
   * default meta description, in the footer and on the social card.
   */
  description:
    "A publishing house established to build the capacity of existing publishing houses in Ghana, bridging the gap between academia and industry.",
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
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Publications", href: "/publications" },
    { label: "Authors", href: "/authors" },
    { label: "Services", href: "/services" },
    { label: "News", href: "/news" },
    { label: "Contact", href: "/contact" },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
