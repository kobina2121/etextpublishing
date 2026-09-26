import type { Metadata } from "next";
import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { PageHero } from "@/components/public/page-hero";
import { ContactForm } from "@/components/forms/contact-form";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${siteConfig.name}.`,
};

const { contact } = siteConfig;

export default function ContactPage() {
  const address = [
    contact.address.line1,
    contact.address.line2,
    `${contact.address.city}, ${contact.address.region} ${contact.address.postalCode}`,
    contact.address.country,
  ].filter(Boolean);

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
                  <a href={`tel:${contact.phone}`} className="hover:text-primary">
                    {contact.phone}
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <MailIcon className="size-4 shrink-0 text-primary" aria-hidden />
                  <a href={`mailto:${contact.email}`} className="hover:text-primary">
                    {contact.email}
                  </a>
                </li>
              </ul>
              <p className="mt-6 text-xs text-muted-foreground">
                These are placeholder details until real contact information is supplied.
              </p>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}
