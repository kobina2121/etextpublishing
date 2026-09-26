import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const spacing = {
  sm: "py-10 sm:py-12",
  md: "py-14 sm:py-20",
  lg: "py-20 sm:py-28",
} as const;

type SectionProps = ComponentProps<"section"> & {
  size?: keyof typeof spacing;
};

/** Owns vertical rhythm so pages never hand-roll their own section padding. */
export function Section({ className, size = "md", ...props }: SectionProps) {
  return <section className={cn(spacing[size], className)} {...props} />;
}
