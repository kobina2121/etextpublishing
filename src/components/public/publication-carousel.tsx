"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import Autoplay from "embla-carousel-autoplay";
import { PauseIcon, PlayIcon } from "lucide-react";
import { useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

const AUTOPLAY_DELAY = 5000;

export type CarouselSlide = { id: string; content: ReactNode };

/**
 * Auto-advancing carousel of titles.
 *
 * Slides arrive already rendered, because `PublicationCard` is a server
 * component: a client component cannot import one, but it can be handed the
 * finished elements as props.
 *
 * Embla's state is read through `useSyncExternalStore` rather than mirrored
 * into `useState` from an effect. Both are external stores, and copying them
 * with a synchronous `setState` inside an effect is the pattern the React
 * compiler lint rejects.
 *
 * Movement that starts on its own has to be stoppable (WCAG 2.2.2), so there
 * is a real pause control, not just pause-on-hover. Autoplay also never runs
 * under `prefers-reduced-motion`; dragging and the arrows still work, so the
 * carousel loses its motion, not its content.
 *
 * Nothing moves while the tab is in the background either — that is the
 * autoplay plugin's own behaviour, and it is why the carousel looks inert if
 * you measure it in a hidden document.
 */
export function PublicationCarousel({ slides, label }: { slides: CarouselSlide[]; label: string }) {
  const [api, setApi] = useState<CarouselApi>();
  const reduced = useReducedMotion();

  // Lazy initialiser: one plugin instance for the life of the component, not a
  // new one on every render.
  const [autoplay] = useState(() =>
    Autoplay({ delay: AUTOPLAY_DELAY, stopOnInteraction: false, stopOnMouseEnter: true }),
  );

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!api) return () => {};
      api.on("select", onChange).on("reInit", onChange);
      return () => {
        api.off("select", onChange).off("reInit", onChange);
      };
    },
    [api],
  );

  // `reInit` matters as much as `select`: the number of pages changes with the
  // breakpoint, because the slides-per-view changes.
  const selected = useSyncExternalStore(
    subscribe,
    () => api?.selectedScrollSnap() ?? 0,
    () => 0,
  );
  const pageCount = useSyncExternalStore(
    subscribe,
    () => api?.scrollSnapList().length ?? 0,
    () => 0,
  );

  // The button reflects intent, not the plugin's instantaneous state. Hovering
  // the carousel pauses it via `stopOnMouseEnter` and resumes on leave, and a
  // label that flipped to "Play" for as long as the pointer rested there would
  // read as though the carousel had been switched off.
  const [wantsAutoplay, setWantsAutoplay] = useState(true);
  const playing = wantsAutoplay && !reduced;

  useEffect(() => {
    if (!api) return;
    if (playing) autoplay.play();
    else autoplay.stop();
  }, [api, playing, autoplay]);

  // Nothing to scroll: one page of slides needs no controls at all.
  const showControls = pageCount > 1;

  return (
    <Carousel
      opts={{ align: "start", loop: true }}
      plugins={[autoplay]}
      setApi={setApi}
      aria-label={label}
      className="mt-14"
    >
      <CarouselContent className="-ml-6">
        {slides.map((slide) => (
          <CarouselItem key={slide.id} className="basis-full pl-6 sm:basis-1/2 lg:basis-1/3">
            {slide.content}
          </CarouselItem>
        ))}
      </CarouselContent>

      {showControls ? (
        <div className="mt-12 flex items-center justify-center gap-4">
          <CarouselPrevious className="static translate-x-0 translate-y-0" />

          <div className="flex items-center gap-2">
            {Array.from({ length: pageCount }, (_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => api?.scrollTo(index)}
                aria-label={`Go to slide ${index + 1} of ${pageCount}`}
                aria-current={index === selected}
                className={cn(
                  "size-2 rounded-full transition-colors",
                  index === selected ? "bg-primary" : "bg-foreground/25 hover:bg-foreground/50",
                )}
              />
            ))}
          </div>

          <CarouselNext className="static translate-x-0 translate-y-0" />

          {reduced ? null : (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setWantsAutoplay((on) => !on)}
              aria-label={playing ? "Pause the carousel" : "Play the carousel"}
            >
              {playing ? <PauseIcon aria-hidden /> : <PlayIcon aria-hidden />}
            </Button>
          )}
        </div>
      ) : null}
    </Carousel>
  );
}
