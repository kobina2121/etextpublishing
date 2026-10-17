import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo/site-meta";

/**
 * Crawl rules.
 *
 * Private and transactional pages are disallowed: the admin, the API, a
 * reader's account, the basket and checkout, and signed download and reset
 * links — which must never end up in a search index. That is a request, not
 * a control: the proxy, the signatures and noindex are what actually protect
 * them.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/api/",
        "/account",
        "/cart",
        "/checkout",
        "/downloads/",
        "/reset-password",
        "/kitchen-sink",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/").replace(/\/$/, ""),
  };
}
