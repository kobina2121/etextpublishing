import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo/site-meta";

/**
 * Crawl rules.
 *
 * /admin and the auth endpoints are disallowed. That is a request, not a
 * control — the proxy is what actually keeps crawlers (and everyone else) out,
 * and the admin layout also sends noindex.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/api/", "/kitchen-sink"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/").replace(/\/$/, ""),
  };
}
