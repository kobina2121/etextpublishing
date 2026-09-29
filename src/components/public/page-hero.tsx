import Image from "next/image";

import { Ornament } from "@/components/public/ornament";

/** Shared banner photograph. Sits behind a brand-coloured scrim on every inner page. */
const DEFAULT_IMAGE = "/shelf.webp";

/**
 * Compact banner for inner pages. The public navbar overlays the page, so this
 * carries the top padding that clears it.
 *
 * The band is always dark — `bg-brand-dark` is a deep green in both colour
 * schemes — so its text is always light. It used to be `text-background`, which
 * inverts with the scheme: in dark mode that painted near-black text on the
 * green and measured 1.27:1 on every inner page. White is not theme-dependent
 * here because the surface underneath it is not either.
 *
 * Pass `image={null}` for a page that wants the plain gradient band instead.
 */
export function PageHero({
  title,
  description,
  image = DEFAULT_IMAGE,
}: {
  title: string;
  description?: string;
  /** Decorative background photograph, or null for the plain band. */
  image?: string | null;
}) {
  return (
    <section className="bg-brand-dark relative isolate overflow-hidden text-white">
      {image ? (
        <>
          {/* Decorative: the heading beside it already carries the meaning. */}
          <Image src={image} alt="" fill priority sizes="100vw" className="object-cover" />
          {/*
            Two layers rather than one flat wash: the tint restores the brand
            green over a photograph that is mostly blue and amber, and the
            gradient deepens the left side where the heading sits, so the text
            never lands on the bright spine highlights.
          */}
          <div aria-hidden className="bg-brand-dark/85 absolute inset-0" />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/25 to-transparent"
          />
        </>
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(90%_140%_at_20%_0%,oklch(0.36_0.04_155)_0%,transparent_70%)] opacity-70"
        />
      )}
      <div className="relative mx-auto w-full max-w-7xl px-4 pt-36 pb-16 sm:px-6 sm:pt-40 sm:pb-20">
        <Ornament className="text-primary-on-dark mb-5 w-40" />
        <h1 className="text-4xl leading-tight sm:text-5xl">{title}</h1>
        {description ? <p className="mt-4 max-w-2xl text-lg text-white/80">{description}</p> : null}
      </div>
    </section>
  );
}
