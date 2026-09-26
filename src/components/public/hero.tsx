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
          className="absolute inset-0 bg-[radial-gradient(120%_120%_at_15%_15%,oklch(0.42_0.05_45)_0%,oklch(0.26_0.03_40)_45%,oklch(0.17_0.02_35)_100%)]"
        />
      )}

      {/* Scrim: keeps white copy legible over any photograph. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/25"
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
                    "font-heading tracking-[0.1em] uppercase",
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
