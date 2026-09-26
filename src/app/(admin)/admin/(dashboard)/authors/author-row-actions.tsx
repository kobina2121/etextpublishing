"use client";

import { EntityRowActions } from "@/components/admin/entity-row-actions";
import { deleteAuthor } from "@/server/actions/content";

export function AuthorRowActions({ id, name }: { id: string; name: string }) {
  return (
    <EntityRowActions
      editHref={`/admin/authors/${id}`}
      name={name}
      entity="Author"
      onDelete={() => deleteAuthor(id)}
    />
  );
}
