import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { publicEnv } from "@/lib/env";
import { getSiteMeta } from "@/lib/seo/site-meta";
import { siteConfig } from "@/lib/site-config";

import "./globals.css";

const sans = Montserrat({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

/**
 * Display face, used for headings only.
 *
 * Cormorant Garamond is a high-contrast old-style serif with a small x-height:
 * elegant at heading sizes, but too fine for 12px uppercase nav links and
 * buttons, which use the sans instead.
 */
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

/**
 * Title and description come from the admin-editable settings, so renaming the
 * company does not need a deploy. `generateMetadata` rather than a static
 * export because that read is async.
 */
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteMeta();

  return {
    metadataBase: new URL(publicEnv.siteUrl),
    title: {
      default: `${site.name} — ${site.tagline}`,
      template: `%s | ${site.name}`,
    },
    description: site.description,
    applicationName: site.name,
    formatDetection: { telephone: false },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang={siteConfig.locale}
      className={cn("font-sans", sans.variable, display.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-dvh antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
