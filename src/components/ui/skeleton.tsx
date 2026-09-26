import { cn } from "cn";

/**
 * Loading placeholder.
 *
 * Tinted from --foreground rather than --muted: the muted surface sits only a
 * few points of lightness from --background in both themes, which left
 * skeletons all but invisible. An alpha of the foreground tracks the theme
 * automatically and stays legible on either ramp.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-foreground/10 dark:bg-foreground/15", className)}
      {...props}
    />
  );
}

export { Skeleton };
