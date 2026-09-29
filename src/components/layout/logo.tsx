import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";

/**
 * The brand lockup.
 *
 * Two files rather than one recoloured with CSS: the artwork is two-tone, and
 * its deep forest green all but disappears against a dark surface. `inverted`
 * swaps to the white knockout used over the hero and in the footer.
 *
 * The wordmark is part of the image, so the company name is not repeated as
 * text beside it — a screen reader would otherwise hear it twice. The link's
 * aria-label carries the name instead, and the image is decorative.
 */
export function Logo({
  className,
  inverted = false,
  priority = false,
}: {
  className?: string;
  inverted?: boolean;
  priority?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label={`${siteConfig.name} — home`}
      className={cn("inline-flex shrink-0 items-center", className)}
    >
      <Image
        src={inverted ? "/logo-light.png" : "/logo.png"}
        alt=""
        width={1000}
        height={372}
        priority={priority}
        sizes="(min-width: 640px) 240px, 200px"
        className="h-12 w-auto sm:h-14"
      />
    </Link>
  );
}

/** Mark only, for tight spaces such as the admin sidebar and the login card. */
export function LogoMark({
  className,
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) {
  return (
    <Image
      src={inverted ? "/logo-mark-light.png" : "/logo-mark.png"}
      alt=""
      width={400}
      height={579}
      sizes="64px"
      className={cn("w-auto", className)}
    />
  );
}
