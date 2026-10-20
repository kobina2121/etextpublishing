import Link from "next/link";
import { format } from "date-fns";
import { BookOpenTextIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { HeadingText } from "@/components/ui/heading-text";
import { volumeIssue, type PublicJournal } from "@/server/journals";

/**
 * One article in a list: the articles page and the home page. Articles are
 * journal entries — free to read, each with its own page at /articles/[slug].
 */
export function ArticleCard({ article }: { article: PublicJournal }) {
  const href = `/articles/${article.slug}`;
  return (
    <article className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start md:gap-10">
      <div>
        <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {[volumeIssue(article), format(article.publishedAt, "MMMM yyyy")]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <h2 className="mt-2 text-2xl leading-snug">
          <Link href={href} className="hover:text-primary">
            <HeadingText>{article.title}</HeadingText>
          </Link>
        </h2>
        <p className="mt-1 text-sm">{article.authors.join(", ")}</p>
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {article.abstract}
        </p>
      </div>
      <div className="flex items-center gap-3 md:flex-col md:items-end">
        <Badge variant="secondary" className="tracking-wide uppercase">
          Free to read
        </Badge>
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <BookOpenTextIcon className="size-4" aria-hidden />
          Read
        </Link>
      </div>
    </article>
  );
}
