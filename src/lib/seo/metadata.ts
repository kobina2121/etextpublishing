import "server-only";

import type { Metadata } from "next";

import { absoluteUrl, getSiteMeta } from "@/lib/seo/site-meta";

/**
 * Builds per-page metadata.
 *
 * Every page sets its own canonical. Without one, the same content reachable at
 * a filtered or paginated URL competes with itself in search results.
 */
export async function buildMetadata({
  title,
  description,
  path,
  type = "website",
  image,
  publishedTime,
  noIndex = false,
}: {
  title?: string;
  description?: string;
  path: string;
  type?: "website" | "article" | "profile";
  image?: string;
  publishedTime?: Date;
  noIndex?: boolean;
}): Promise<Metadata> {
  const site = await getSiteMeta();
  const canonical = absoluteUrl(path);
  const resolvedTitle = title ?? `${site.name} — ${site.tagline}`;
  const resolvedDescription = description ?? site.description;

  return {
    title,
    description: resolvedDescription,
    alternates: { canonical },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: type === "profile" ? "profile" : type,
      siteName: site.name,
      title: resolvedTitle,
      description: resolvedDescription,
      url: canonical,
      locale: "en",
      ...(image ? { images: [{ url: absoluteUrl(image) }] } : {}),
      ...(publishedTime ? { publishedTime: publishedTime.toISOString() } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description: resolvedDescription,
      ...(image ? { images: [absoluteUrl(image)] } : {}),
    },
  };
}
