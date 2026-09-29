import { ImageResponse } from "next/og";

import { getSiteMeta } from "@/lib/seo/site-meta";

export const alt = "Publishing company";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Default social card.
 *
 * Drawn rather than served as a file so it follows the site settings: changing
 * the company name in the admin changes the card. Kept to type and the brand
 * colours, with no external assets — ImageResponse would have to fetch them at
 * render time, and a slow fetch means no card at all.
 */
export default async function OpengraphImage() {
  const site = await getSiteMeta();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        // The logo's forest green, so the card matches the site.
        background: "#004018",
        padding: 72,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 40, height: 40, background: "#4bc06c" }} />
        <div
          style={{
            fontSize: 26,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#f5f5f4",
          }}
        >
          {site.name}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 68, lineHeight: 1.1, color: "#ffffff", maxWidth: 940 }}>
          {site.tagline}
        </div>
        <div style={{ fontSize: 28, color: "#a7d4b5", maxWidth: 860 }}>
          {site.description.slice(0, 120)}
        </div>
      </div>

      <div style={{ display: "flex", height: 8, width: 200, background: "#4bc06c" }} />
    </div>,
    size,
  );
}
