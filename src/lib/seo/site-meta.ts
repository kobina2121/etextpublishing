import "server-only";

import { cache } from "react";

import { publicEnv } from "@/lib/env";
import { siteConfig } from "@/lib/site-config";
import { getSiteSettings } from "@/server/queries";

/**
 * Resolved site identity for metadata.
 *
 * Reads the admin-editable SiteSettings record and falls back to the static
 * config when it is missing or the database is unreachable. Metadata must never
 * be the thing that takes a page down, so a failed read degrades to the
 * fallback rather than throwing.
 *
 * Wrapped in React's `cache` so a page and its generateMetadata share one read
 * per request instead of querying twice.
 */
export type SiteMeta = {
  name: string;
  tagline: string;
  description: string;
  url: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  socials: { label: string; href: string }[];
};

export const getSiteMeta = cache(async (): Promise<SiteMeta> => {
  const fallback: SiteMeta = {
    name: siteConfig.name,
    tagline: siteConfig.tagline,
    description: siteConfig.description,
    url: publicEnv.siteUrl,
    email: siteConfig.contact.email,
    phone: siteConfig.contact.phone,
    address: { ...siteConfig.contact.address },
    socials: Object.entries(siteConfig.socials)
      .filter(([, href]) => href)
      .map(([label, href]) => ({ label, href })),
  };

  try {
    const settings = await getSiteSettings();
    if (!settings) return fallback;

    return {
      name: settings.name,
      tagline: settings.tagline,
      description: settings.description,
      url: publicEnv.siteUrl,
      email: settings.contact.email,
      phone: settings.contact.phone,
      address: {
        line1: settings.contact.address.line1,
        ...(settings.contact.address.line2 ? { line2: settings.contact.address.line2 } : {}),
        city: settings.contact.address.city,
        region: settings.contact.address.region,
        postalCode: settings.contact.address.postalCode,
        country: settings.contact.address.country,
      },
      socials: settings.socials.map((s) => ({ label: s.label, href: s.href })),
    };
  } catch {
    return fallback;
  }
});

/** Absolute URL for a site-relative path. Required by OG tags and JSON-LD. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, publicEnv.siteUrl).toString();
}
