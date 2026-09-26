"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";

/**
 * Routes whose page opens with a full-bleed dark band (Hero or PageHero), and
 * can therefore carry white nav text over it.
 *
 * Matched exactly, so detail routes such as /publications/salt-roads fall
 * through to the solid bar. Getting this wrong is not subtle: an overlay bar on
 * a white page renders white links on white.
 */
const OVERLAY_ROUTES = new Set([
  "/",
  "/about",
  "/publications",
  "/authors",
  "/services",
  "/news",
  "/contact",
  "/submit",
]);

/**
 * Site header.
 *
 * Over a dark hero the bar starts transparent and turns solid once scrolled, so
 * the hero image is never cropped by a band of chrome. Everywhere else it is
 * solid from the start.
 */
export function Navbar() {
  const pathname = usePathname();
  const overlay = OVERLAY_ROUTES.has(pathname);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // `transparent` already short-circuits on !overlay, so there is nothing to
    // reset here — just skip the listener on solid-bar routes.
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  const transparent = overlay && !scrolled;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        transparent ? "bg-transparent" : "border-b border-border bg-background shadow-sm",
      )}
    >
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        <Logo inverted={transparent} />

        <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
          {siteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "font-heading text-sm tracking-[0.08em] uppercase transition-colors",
                // Over the hero the bar is dark, so brand-coloured text uses
                // the lighter on-dark tone; --primary would fail AA there.
                isActive(item.href)
                  ? transparent
                    ? "text-primary-on-dark"
                    : "text-primary"
                  : transparent
                    ? "text-white hover:text-primary-on-dark"
                    : "text-foreground hover:text-primary",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <div className={cn(transparent && "text-white [&_button]:hover:bg-white/10")}>
            <ModeToggle />
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("lg:hidden", transparent && "text-white hover:bg-white/10")}
              >
                <MenuIcon aria-hidden />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(20rem,85vw)]">
              <SheetHeader>
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              <nav aria-label="Mobile" className="flex flex-col px-4">
                {siteConfig.nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={cn(
                      "border-b border-border py-4 font-heading text-base tracking-[0.08em] uppercase transition-colors",
                      isActive(item.href) ? "text-primary" : "text-foreground hover:text-primary",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
