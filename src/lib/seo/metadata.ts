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
  other,
}: {
  title?: string;
  description?: string;
  path: string;
  type?: "website" | "article" | "profile";
  image?: string;
  publishedTime?: Date;
  noIndex?: boolean;
  /** Extra <meta name=…> tags, e.g. Google Scholar's citation_* fields. */
  other?: Metadata["other"];
}): Promise<Metadata> {
  const site = await getSiteMeta();
  const canonical = absoluteUrl(path);
  const resolvedTitle = title ?? `${site.name} — ${site.tagline}`;
  const resolvedDescription = description ?? site.description;
  // Every page gets a preview image: its own (a cover) or the site's. A page
  // that sets openGraph replaces the parent's, so without this the generated
  // /opengraph-image was never linked and shared links showed no picture.
  const previewImage = absoluteUrl(image ?? "/opengraph-image");

  return {
    // With no title of its own (the home page), use the full site title as-is.
    // Passing `title: undefined` would not fall back to the layout's default —
    // it replaces it, and the page ships with no <title> at all.
    title: title ?? { absolute: resolvedTitle },
    description: resolvedDescription,
    alternates: { canonical },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: type === "profile" ? "profile" : type,
      siteName: site.name,
      title: resolvedTitle,
      description: resolvedDescription,
      url: canonical,
      locale: "en_GH",
      images: [{ url: previewImage }],
      ...(publishedTime ? { publishedTime: publishedTime.toISOString() } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description: resolvedDescription,
      images: [previewImage],
    },
    ...(other ? { other } : {}),
  };
}
