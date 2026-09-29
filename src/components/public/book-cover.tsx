import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Book cover with a typographic fallback.
 *
 * Rather than ship stock cover art, a title without an image renders as a
 * tinted panel carrying the title itself, which reads as intentional in a grid
 * and makes missing artwork obvious to an admin.
 *
 * The fallback sizes itself off the panel, not the viewport: at the 64px
 * thumbnail the basket uses, a fixed 20px pad and 18px type left a 24px column
 * for text that needed 67px, so every title clipped to a single letter per
 * line. Container queries keep the larger call sites exactly as they were.
 */
export function BookCover({
  title,
  src,
  className,
  sizes = "(min-width: 1024px) 20rem, (min-width: 640px) 33vw, 80vw",
  priority = false,
}: {
  title: string;
  src?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-muted @container relative aspect-[2/3] w-full overflow-hidden",
        "after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-[6%] after:bg-black/15",
        className,
      )}
    >
      {src ? (
        <Image src={src} alt={`Cover of ${title}`} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div className="from-foreground to-foreground/85 flex h-full w-full items-end bg-gradient-to-br p-2 @[7rem]:p-5">
          <span className="font-heading text-background line-clamp-4 text-[0.6875rem] leading-tight @[7rem]:text-lg">
            {title}
          </span>
        </div>
      )}
    </div>
  );
}
