import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const widths = {
  /** Long-form reading measure. */
  prose: "max-w-3xl",
  /** Default page width. */
  default: "max-w-6xl",
  /** Full-bleed grids and admin tables. */
  wide: "max-w-7xl",
} as const;

type ContainerProps = ComponentProps<"div"> & {
  width?: keyof typeof widths;
};

export function Container({ className, width = "default", ...props }: ContainerProps) {
  return <div className={cn("mx-auto w-full px-4 sm:px-6", widths[width], className)} {...props} />;
}
