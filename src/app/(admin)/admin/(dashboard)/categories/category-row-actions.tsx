"use client";

import { EntityRowActions } from "@/components/admin/entity-row-actions";
import { deleteCategory } from "@/server/actions/content";

export function CategoryRowActions({ id, name }: { id: string; name: string }) {
  return (
    <EntityRowActions
      editHref={`/admin/categories/${id}`}
      name={name}
      entity="Category"
      onDelete={() => deleteCategory(id)}
    />
  );
}
