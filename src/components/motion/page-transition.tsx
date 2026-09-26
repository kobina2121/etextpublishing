"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { DURATION } from "@/lib/motion";

/**
 * Subtle fade applied to page bodies. Deliberately short: a publishing site
 * should feel quick, and a slow transition delays the first read of the copy.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURATION.base, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
