"use client";

import { EntityRowActions } from "@/components/admin/entity-row-actions";
import { deleteArticle, setArticleStatus } from "@/server/actions/content";

export function ArticleRowActions({
  id,
  title,
  status,
}: {
  id: string;
  title: string;
  status: string;
}) {
  return (
    <EntityRowActions
      editHref={`/admin/articles/${id}`}
      name={title}
      entity="Article"
      status={status}
      onToggleStatus={(next) => setArticleStatus(id, next)}
      onDelete={() => deleteArticle(id)}
    />
  );
}
