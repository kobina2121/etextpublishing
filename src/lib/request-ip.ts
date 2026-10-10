import "server-only";

import { headers } from "next/headers";

/**
 * The visitor's IP address, for rate limiting anonymous requests.
 *
 * Read from the proxy headers Vercel sets. Locally there is no proxy, so every
 * request shares "unknown" — which still limits, just across all of localhost.
 * Never use this for anything but throttling: the header is only trustworthy
 * behind a proxy that overwrites it.
 */
export async function clientIp(): Promise<string> {
  const headerList = await headers();
  return (
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "unknown"
  );
}
