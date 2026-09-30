"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { PauseIcon, PlayIcon } from "lucide-react";
import { useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

const SLIDE_DURATION = 6000;

/**
 * Cross-fading photographs behind the hero.
 *
 * A fade rather than a slide: the headline stays put, so moving the picture
 * sideways underneath it reads as a glitch. The photographs are stacked and
 * only their opacity changes.
 *
 * Hand-rolled rather than Embla, which is built for a scrolling track of
 * content and would need a third plugin to fade two decorative backgrounds.
 * The transition itself is CSS, so the global `prefers-reduced-motion` rule in
 * globals.css already collapses it; the only thing this has to do for that
 * setting is stop advancing on its own.
 *
 * Content that moves by itself has to be stoppable (WCAG 2.2.2), hence a real
 * pause control rather than only pausing on hover.
 */
export function HeroBackdrop({ images }: { images: string[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [wantsAutoplay, setWantsAutoplay] = useState(true);

  const canRotate = images.length > 1;
  const playing = wantsAutoplay && !reduced && canRotate;

  useEffect(() => {
    if (!playing) return;
    // setState in a timer callback, never synchronously in the effect body.
    const id = window.setInterval(
      () => setIndex((current) => (current + 1) % images.length),
      SLIDE_DURATION,
    );
    return () => window.clearInterval(id);
  }, [playing, images.length]);

  return (
    <>
      {images.map((src, position) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          // Only the first is the LCP candidate, so only it gets `priority`
          // and the preload that comes with it. The rest must still be eager:
          // next/image defaults to lazy, and a lazy photograph that has not
          // loaded when its turn comes round cross-fades to nothing.
          priority={position === 0}
          loading={position === 0 ? undefined : "eager"}
          sizes="100vw"
          className={cn(
            "object-cover transition-opacity duration-1000 ease-linear",
            position === index ? "opacity-100" : "opacity-0",
          )}
        />
      ))}

      {canRotate ? (
        // Above the scrim and the copy, so the controls stay clickable where
        // the content column overlaps them.
        <div className="absolute right-4 bottom-6 z-20 flex items-center gap-3 sm:right-6 sm:bottom-8">
          <div className="flex items-center gap-2">
            {images.map((src, position) => (
              <button
                key={src}
                type="button"
                onClick={() => setIndex(position)}
                aria-label={`Show photograph ${position + 1} of ${images.length}`}
                aria-current={position === index}
                className={cn(
                  "size-2.5 rounded-full transition-colors",
                  position === index ? "bg-white" : "bg-white/40 hover:bg-white/75",
                )}
              />
            ))}
          </div>

          {reduced ? null : (
            <button
              type="button"
              onClick={() => setWantsAutoplay((on) => !on)}
              aria-label={playing ? "Pause the photographs" : "Play the photographs"}
              className="flex size-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            >
              {playing ? (
                <PauseIcon className="size-4" aria-hidden />
              ) : (
                <PlayIcon className="size-4" aria-hidden />
              )}
            </button>
          )}
        </div>
      ) : null}
    </>
  );
}
