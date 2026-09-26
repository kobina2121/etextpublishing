import Link from "next/link";
import { SearchXIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function EmptyResults({
  title = "Nothing found",
  description = "Try a different search term, or clear the filters to see everything.",
  resetHref,
}: {
  title?: string;
  description?: string;
  resetHref?: string;
}) {
  return (
    <Empty className="border-border border border-dashed py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {resetHref ? (
        <EmptyContent>
          <Button asChild variant="outline">
            <Link href={resetHref}>Clear filters</Link>
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
