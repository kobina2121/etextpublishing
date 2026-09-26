/**
 * Motion constants shared by the Framer Motion wrappers.
 *
 * These mirror --ease-out-soft and --duration-* in globals.css so a CSS hover
 * transition and a JS entrance animation cannot drift out of step.
 */

export const EASE_OUT_SOFT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const DURATION = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
} as const;

/** Shared viewport config: animate once, slightly before the element is flush. */
export const VIEWPORT_ONCE = { once: true, margin: "-80px" } as const;
