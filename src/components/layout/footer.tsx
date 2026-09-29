import Link from "next/link";
import { LockIcon, MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { siteConfig } from "@/lib/site-config";

const { contact } = siteConfig;

export function Footer() {
  const address = [
    contact.address.line1,
    contact.address.line2,
    `${contact.address.city}, ${contact.address.region} ${contact.address.postalCode}`,
    contact.address.country,
  ].filter(Boolean);

  return (
    <footer className="mt-auto bg-brand-dark text-background/85">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-3">
        <div className="space-y-4">
          <Logo inverted />
          <p className="max-w-sm text-sm leading-relaxed">{siteConfig.description}</p>
        </div>

        <nav aria-label="Footer" className="space-y-4">
          <h2 className="text-sm font-semibold tracking-[0.14em] text-background uppercase">
            Explore
          </h2>
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
          <h2 className="text-sm font-semibold tracking-[0.14em] text-background uppercase">
            Contact
          </h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{address.join(", ")}</span>
            </li>
            <li className="flex items-center gap-3">
              <PhoneIcon className="size-4 shrink-0" aria-hidden />
              <a
                href={`tel:${contact.phone}`}
                className="transition-colors hover:text-primary-on-dark"
              >
                {contact.phone}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <MailIcon className="size-4 shrink-0" aria-hidden />
              <a
                href={`mailto:${contact.email}`}
                className="transition-colors hover:text-primary-on-dark"
              >
                {contact.email}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-background/15">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          {/* Deliberately understated, and excluded from crawlers: staff who
              need it know to look, and the admin area gains nothing from being
              advertised on every page. The lock reads as "restricted" rather
              than "your account", which matters when there are no public
              accounts; the word stays because a bare icon here would be
              ambiguous. */}
          <Link
            href="/admin"
            rel="nofollow"
            className="group/staff inline-flex w-fit items-center gap-1.5 text-background/55 transition-colors hover:text-primary-on-dark"
          >
            <LockIcon className="size-3" aria-hidden />
            Staff login
          </Link>
        </div>
      </div>
    </footer>
  );
}
