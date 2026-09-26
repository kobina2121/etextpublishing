import Link from "next/link";
import { format } from "date-fns";

import { BookCover } from "@/components/public/book-cover";
import { Badge } from "@/components/ui/badge";
import type { PublicationWithRelations } from "@/types/content";

export function PublicationCard({
  publication,
  priority = false,
}: {
  publication: PublicationWithRelations;
  priority?: boolean;
}) {
  return (
    <article className="group">
      <Link href={`/publications/${publication.slug}`} className="block focus-visible:outline-none">
        <div className="relative overflow-hidden">
          <BookCover
            title={publication.title}
            src={publication.coverImage}
            priority={priority}
            className="transition-transform duration-500 group-hover:scale-[1.03]"
          />
          {publication.featured ? (
            <Badge className="absolute top-3 left-3 tracking-[0.1em] uppercase">Featured</Badge>
          ) : null}
        </div>

        <div className="mt-4 space-y-1.5">
          <p className="text-primary font-semibold text-xs tracking-[0.14em] uppercase">
            {publication.category.name}
          </p>
          <h3 className="group-hover:text-primary text-xl leading-snug transition-colors">
            {publication.title}
          </h3>
          <p className="text-muted-foreground text-sm">{publication.author.name}</p>
          <p className="text-muted-foreground text-xs">
            {format(publication.publicationDate, "MMMM yyyy")} · {publication.pages} pages
          </p>
        </div>
      </Link>
    </article>
  );
}
