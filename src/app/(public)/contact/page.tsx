import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo/metadata";
import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { PageHero } from "@/components/public/page-hero";
import { ContactForm } from "@/components/forms/contact-form";
import { addressLines, getSiteMeta, isPlaceholderContact } from "@/lib/seo/site-meta";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Contact",
    description:
      "Contact etext Publishing Network about a title, a manuscript submission or our publishing services.",
    path: "/contact",
  });
}

/** Contact details come from /admin/settings, so an edit there shows here. */
export default async function ContactPage() {
  const site = await getSiteMeta();
  const address = addressLines(site.address);

  return (
    <>
      <PageHero
        title="Contact"
        description="Questions about a title, a submission or working with us — start here."
      />

      <Section>
        <Container width="wide">
          <div className="grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-16">
            <div>
              <h2 className="text-2xl">Send a message</h2>
              <p className="mt-2 text-muted-foreground">
                We aim to reply to every enquiry. Fields marked optional can be left blank.
              </p>
              <div className="mt-8">
                <ContactForm />
              </div>
            </div>

            <aside className="h-fit border border-border p-8">
              <h2 className="text-sm font-semibold tracking-[0.14em] uppercase">Details</h2>
              <ul className="mt-6 space-y-5 text-sm">
                <li className="flex items-start gap-3">
                  <MapPinIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>{address.join(", ")}</span>
                </li>
                <li className="flex items-center gap-3">
                  <PhoneIcon className="size-4 shrink-0 text-primary" aria-hidden />
                  <a
                    href={`tel:${site.phone.replace(/[^\d+]/g, "")}`}
                    className="hover:text-primary"
                  >
                    {site.phone}
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <MailIcon className="size-4 shrink-0 text-primary" aria-hidden />
                  <a href={`mailto:${site.email}`} className="hover:text-primary">
                    {site.email}
                  </a>
                </li>
              </ul>
              {isPlaceholderContact(site) ? (
                <p className="mt-6 text-xs text-muted-foreground">
                  These are placeholder details until real contact information is supplied.
                </p>
              ) : null}
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}
