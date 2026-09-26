import Link from "next/link";
import { format } from "date-fns";

import type { ArticleWithRelations } from "@/types/content";

export function ArticleCard({ article }: { article: ArticleWithRelations }) {
  return (
    <article className="group border-border border-b pb-6">
      <Link href={`/news/${article.slug}`} className="block">
        <p className="text-primary font-heading text-xs tracking-[0.14em] uppercase">
          {article.category.name} · {format(article.publishedAt, "d MMM yyyy")}
        </p>
        <h3 className="group-hover:text-primary mt-2 text-2xl leading-snug transition-colors">
          {article.title}
        </h3>
        <p className="text-muted-foreground mt-2 leading-relaxed">{article.excerpt}</p>
        <span className="font-heading text-foreground mt-4 inline-block text-sm tracking-[0.12em] uppercase">
          Read more
        </span>
      </Link>
    </article>
  );
}
