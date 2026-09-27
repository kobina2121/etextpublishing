import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo/metadata";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { PageHero } from "@/components/public/page-hero";
import { ManuscriptForm } from "@/components/forms/manuscript-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Submit a manuscript",
    description: "Send us your manuscript for editorial consideration.",
    path: "/submit",
  });
}

export default function SubmitPage() {
  return (
    <>
      <PageHero
        title="Submit a manuscript"
        description="Send us your work and a publishing consultant will read it."
      />

      <Section>
        <Container width="prose">
          <Alert className="mb-10">
            <AlertTitle>Before you send</AlertTitle>
            <AlertDescription>
              Attach the complete manuscript as a PDF, DOC or DOCX, up to 10 MB. Placeholder
              guidance — real submission requirements will replace this.
            </AlertDescription>
          </Alert>

          <ManuscriptForm />
        </Container>
      </Section>
    </>
  );
}
