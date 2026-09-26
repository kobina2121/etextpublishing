import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";

export default function PublicNotFound() {
  return (
    <Section className="pt-36">
      <Container width="prose">
        <p className="font-heading text-7xl text-primary">404</p>
        <h1 className="mt-4 text-4xl">Page not found</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          That page does not exist, or the title may have been unpublished.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="xl" className="font-heading tracking-[0.1em] uppercase">
            <Link href="/publications">Browse publications</Link>
          </Button>
          <Button
            asChild
            size="xl"
            variant="outline"
            className="font-heading tracking-[0.1em] uppercase"
          >
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </Container>
    </Section>
  );
}
