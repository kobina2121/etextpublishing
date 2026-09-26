import { cn } from "@/lib/utils";

/**
 * Decorative rule used above centred section headings: a tapered line either
 * side of a diamond. Purely ornamental, so it is hidden from assistive tech.
 */
export function Ornament({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 12"
      className={cn("text-primary h-3 w-52", className)}
      fill="none"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="ornament-left" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="ornament-right" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="5.5" width="96" height="1" fill="url(#ornament-left)" />
      <rect
        x="105.5"
        y="1.5"
        width="9"
        height="9"
        fill="currentColor"
        transform="rotate(45 110 6)"
      />
      <rect x="124" y="5.5" width="96" height="1" fill="url(#ornament-right)" />
    </svg>
  );
}
