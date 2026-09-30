import Link from "next/link";

import { FadeIn } from "@/components/motion/fade-in";
import { HeroBackdrop } from "@/components/public/hero-backdrop";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeroAction = {
  label: string;
  href: string;
  variant?: "primary" | "outline";
};

type HeroProps = {
  title: string;
  /** Rendered on a second line in a lighter weight. */
  titleAccent?: string;
  subtitle?: string;
  actions?: HeroAction[];
  /**
   * Background photographs, treated as decorative. More than one cross-fades.
   * Empty falls back to a tonal placeholder.
   */
  images?: string[];
};

export function Hero({ title, titleAccent, subtitle, actions = [], images = [] }: HeroProps) {
  return (
    <section className="relative isolate flex min-h-[38rem] items-center overflow-hidden lg:min-h-[44rem]">
      {images.length > 0 ? (
        <HeroBackdrop images={images} />
      ) : (
        /* PLACEHOLDER: stands in for hero photography. Pass `images` to
         * replace. Deliberately not stock imagery, which would need a licence. */
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(120%_120%_at_15%_15%,oklch(0.38_0.045_155)_0%,oklch(0.24_0.03_160)_45%,oklch(0.16_0.02_160)_100%)]"
        />
      )}

      {/*
        Scrim, responsive on purpose.

        A left-to-right gradient only works while the copy is confined to the
        left of the frame. On a narrow screen the headline spans the full
        width and its last words land on bare photograph, so narrow screens
        get a uniform scrim and the gradient starts once there is room for the
        photo to show beside the text.

        Both values are the measured minimum that clears 4.5:1 on every
        photograph in the rotation, composited on the real pixels. The
        subtitle is the binding constraint, not the headline: at 20px it is
        not "large text", so it needs the full 4.5:1 rather than 3:1. The
        previous 0.6 / 0.75-0.55-0.25 scrim left it at 4.18:1 and 3.78:1
        against the first photograph — a fail that a second, brighter
        photograph only made easier to see.

        The layers are explicit now that the backdrop carries its own
        controls: scrim above the photographs, copy above the scrim, and the
        controls above the copy so they stay clickable where the content
        column overlaps them.
      */}
      <div
        aria-hidden
        className="absolute inset-0 z-[1] bg-black/65 lg:bg-transparent lg:bg-gradient-to-r lg:from-black/80 lg:via-black/65 lg:to-black/30"
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-32 sm:px-6">
        <FadeIn className="max-w-3xl">
          <h1 className="text-5xl leading-[1.05] text-white sm:text-6xl lg:text-7xl">
            {title}
            {titleAccent ? (
              <>
                <br />
                <span className="font-light">{titleAccent}</span>
              </>
            ) : null}
          </h1>

          {subtitle ? (
            <p className="mt-6 max-w-xl text-lg text-white/85 sm:text-xl">{subtitle}</p>
          ) : null}

          {actions.length > 0 ? (
            <div className="mt-10 flex flex-wrap items-center gap-4">
              {actions.map((action) => (
                <Button
                  key={action.href}
                  asChild
                  size="xl"
                  variant={action.variant === "outline" ? "outline" : "default"}
                  className={cn(
                    "font-semibold tracking-[0.1em] uppercase",
                    action.variant === "outline" &&
                      "border-white/70 bg-transparent text-white hover:bg-white hover:text-foreground dark:bg-transparent dark:hover:bg-white",
                  )}
                >
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              ))}
            </div>
          ) : null}
        </FadeIn>
      </div>
    </section>
  );
}
