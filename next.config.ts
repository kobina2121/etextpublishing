import type { NextConfig } from "next";

/**
 * Remote image hosts are driven by env so the storage provider can change
 * without a code edit. Set NEXT_PUBLIC_ASSET_HOST to the public hostname of
 * the image bucket/CDN (e.g. "assets.example.com" or "<bucket>.r2.dev").
 */
const assetHost = process.env.NEXT_PUBLIC_ASSET_HOST?.trim();
const isProduction = process.env.NODE_ENV === "production";

/**
 * Content Security Policy.
 *
 * `script-src` allows 'unsafe-inline' deliberately. The strict alternative is a
 * per-request nonce, but Next can only inject a nonce while server-rendering,
 * so every page carrying one must be dynamic — which would throw away the
 * static rendering the public site depends on, and silently break any page that
 * later becomes static.
 *
 * What this still buys, and why it is worth having: scripts may only load from
 * our own origin, forms may only submit to it, the page cannot be framed, and
 * <base> cannot be hijacked. The gap is inline injection, and the app has no
 * route to it — no user-supplied HTML is rendered anywhere. Article bodies are
 * React text nodes, JSON-LD is escaped, and uploads are type-sniffed with SVG
 * refused.
 *
 * To upgrade: generate a nonce in src/proxy.ts, force every page dynamic, and
 * drop 'unsafe-inline'.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  // Tailwind ships a stylesheet, but Next still emits inline style attributes.
  "style-src 'self' 'unsafe-inline'",
  // data: and blob: cover next/image placeholders and client-side previews.
  `img-src 'self' data: blob:${assetHost ? ` https://${assetHost}` : ""}`,
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Legacy equivalent of frame-ancestors, for browsers that predate CSP 2.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()",
  },
  // Production only: an HSTS entry for localhost is cached by the browser and
  // then forces https on every other local project.
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: assetHost ? [{ protocol: "https", hostname: assetHost, pathname: "/**" }] : [],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
