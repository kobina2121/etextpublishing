import Image from "next/image";
import Link from "next/link";

import { FadeIn } from "@/components/motion/fade-in";
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
  /** Path to a background photograph. Falls back to a tonal placeholder. */
  image?: string;
  imageAlt?: string;
};

export function Hero({ title, titleAccent, subtitle, actions = [], image, imageAlt }: HeroProps) {
  return (
    <section className="relative isolate flex min-h-[38rem] items-center overflow-hidden lg:min-h-[44rem]">
      {image ? (
        <Image
          src={image}
          alt={imageAlt ?? ""}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      ) : (
        /* PLACEHOLDER: stands in for hero photography. Pass `image` to replace.
         * Deliberately not stock imagery, which would need its own licence. */
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(120%_120%_at_15%_15%,oklch(0.38_0.045_155)_0%,oklch(0.24_0.03_160)_45%,oklch(0.16_0.02_160)_100%)]"
        />
      )}

      {/*
        Scrim, responsive on purpose.

        A left-to-right gradient only works while the copy is confined to the
        left of the frame. On a narrow screen the headline spans the full
        width and its last words land on bare photograph — measured at 2.36:1
        against this image, a clear fail. A uniform scrim holds 5.8:1
        everywhere, so narrow screens get that and the gradient starts once
        there is room for the photo to show beside the text.
      */}
      <div
        aria-hidden
        className="absolute inset-0 bg-black/60 lg:bg-transparent lg:bg-gradient-to-r lg:from-black/75 lg:via-black/55 lg:to-black/25"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-32 sm:px-6">
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
