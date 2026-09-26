import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Book cover with a typographic fallback.
 *
 * Rather than ship stock cover art, a title without an image renders as a
 * tinted panel carrying the title itself, which reads as intentional in a grid
 * and makes missing artwork obvious to an admin.
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
        "bg-muted relative aspect-[2/3] w-full overflow-hidden",
        "after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-[6%] after:bg-black/15",
        className,
      )}
    >
      {src ? (
        <Image src={src} alt={`Cover of ${title}`} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div className="from-foreground to-foreground/85 flex h-full w-full items-end bg-gradient-to-br p-5">
          <span className="font-heading text-background line-clamp-4 text-lg leading-tight">
            {title}
          </span>
        </div>
      )}
    </div>
  );
}
