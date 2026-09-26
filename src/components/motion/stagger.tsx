"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

import { DURATION, EASE_OUT_SOFT, VIEWPORT_ONCE } from "@/lib/motion";

type StaggerProps = HTMLMotionProps<"div"> & {
  /** Seconds between each child's entrance. */
  step?: number;
  delay?: number;
};

/**
 * Parent for a list whose children should enter one after another. Pair with
 * `StaggerItem`, which supplies the matching child variants.
 */
export function Stagger({ step = 0.07, delay = 0, children, ...props }: StaggerProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <motion.div {...props}>{children}</motion.div>;
  }

  return (
    <motion.div
      {...props}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_ONCE}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: step, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, ...props }: HTMLMotionProps<"div">) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <motion.div {...props}>{children}</motion.div>;
  }

  return (
    <motion.div
      {...props}
      variants={{
        hidden: { opacity: 0, y: 14 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: DURATION.slow, ease: EASE_OUT_SOFT },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
