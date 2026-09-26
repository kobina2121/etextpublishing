import type { NextConfig } from "next";

/**
 * Remote image hosts are driven by env so the storage provider can change
 * without a code edit. Set NEXT_PUBLIC_ASSET_HOST to the public hostname of
 * the image bucket/CDN (e.g. "assets.example.com" or "<bucket>.r2.dev").
 */
const assetHost = process.env.NEXT_PUBLIC_ASSET_HOST?.trim();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: assetHost ? [{ protocol: "https", hostname: assetHost, pathname: "/**" }] : [],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
