"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

import { DURATION, EASE_OUT_SOFT, VIEWPORT_ONCE } from "@/lib/motion";

type FadeInProps = HTMLMotionProps<"div"> & {
  /** Seconds to wait before animating. */
  delay?: number;
  /** Distance in px to travel upward. */
  distance?: number;
  /** Animate on scroll into view rather than on mount. */
  whenInView?: boolean;
};

/**
 * Entrance animation for a block of content.
 *
 * Under `prefers-reduced-motion` the element renders in its final state with no
 * transition at all, rather than a faster version of the same movement.
 */
export function FadeIn({
  delay = 0,
  distance = 12,
  whenInView = false,
  children,
  ...props
}: FadeInProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <motion.div {...props}>{children}</motion.div>;
  }

  const initial = { opacity: 0, y: distance };
  const transition = { duration: DURATION.slow, delay, ease: EASE_OUT_SOFT };

  if (whenInView) {
    return (
      <motion.div
        {...props}
        initial={initial}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VIEWPORT_ONCE}
        transition={transition}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div {...props} initial={initial} animate={{ opacity: 1, y: 0 }} transition={transition}>
      {children}
    </motion.div>
  );
}
