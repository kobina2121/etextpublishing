import Link from "next/link";
import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { addressLines, getSiteMeta } from "@/lib/seo/site-meta";
import { siteConfig } from "@/lib/site-config";

/**
 * Site footer. Company details come from /admin/settings (via getSiteMeta),
 * so an edit there shows here — it used to read the fixed placeholders in
 * site-config.ts, and dashboard changes never appeared. The navigation stays
 * in code: it mirrors the routes that exist.
 */
export async function Footer() {
  const site = await getSiteMeta();
  const address = addressLines(site.address);

  // White, not text-background: bg-brand-dark is a deep green in both colour
  // schemes, but "background" flips to near-black in dark mode, which put dark
  // text on dark green. Same fix as PageHero.
  return (
    <footer className="mt-auto bg-brand-dark text-white/85">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-3">
        <div className="space-y-4">
          <Logo inverted />
          <p className="max-w-sm text-sm leading-relaxed">{site.description}</p>
          {site.socials.length > 0 ? (
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {site.socials.map((social) => (
                <li key={social.href}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-4 transition-colors hover:text-primary-on-dark hover:underline"
                  >
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <nav aria-label="Footer" className="space-y-4">
          <h2 className="text-sm font-semibold tracking-[0.14em] text-white uppercase">Explore</h2>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {siteConfig.nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-primary-on-dark">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold tracking-[0.14em] text-white uppercase">Contact</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{address.join(", ")}</span>
            </li>
            <li className="flex items-center gap-3">
              <PhoneIcon className="size-4 shrink-0" aria-hidden />
              <a
                href={`tel:${site.phone.replace(/[^\d+]/g, "")}`}
                className="transition-colors hover:text-primary-on-dark"
              >
                {site.phone}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <MailIcon className="size-4 shrink-0" aria-hidden />
              <a
                href={`mailto:${site.email}`}
                className="transition-colors hover:text-primary-on-dark"
              >
                {site.email}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            &copy; {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          {site.footerText ? <p>{site.footerText}</p> : null}
          {/* No staff link here: there is one sign-in page for everyone, and an
              admin is recognised by the role on their email address. */}
        </div>
      </div>
    </footer>
  );
}
