import { Ornament } from "@/components/public/ornament";

/**
 * Compact banner for inner pages. The public navbar overlays the page, so this
 * carries the top padding that clears it.
 */
export function PageHero({ title, description }: { title: string; description?: string }) {
  return (
    <section className="bg-foreground text-background relative isolate overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(90%_140%_at_20%_0%,oklch(0.36_0.04_155)_0%,transparent_70%)] opacity-70"
      />
      <div className="relative mx-auto w-full max-w-7xl px-4 pt-36 pb-16 sm:px-6 sm:pt-40 sm:pb-20">
        <Ornament className="text-primary-on-dark mb-5 w-40" />
        <h1 className="text-4xl leading-tight sm:text-5xl">{title}</h1>
        {description ? (
          <p className="text-background/75 mt-4 max-w-2xl text-lg">{description}</p>
        ) : null}
      </div>
    </section>
  );
}
