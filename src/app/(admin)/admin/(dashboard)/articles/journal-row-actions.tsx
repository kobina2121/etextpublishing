"use client";

import { EntityRowActions } from "@/components/admin/entity-row-actions";
import { deleteJournal, setJournalStatus } from "@/server/actions/journals";

export function JournalRowActions({
  id,
  title,
  status,
}: {
  id: string;
  title: string;
  status: "draft" | "published";
}) {
  return (
    <EntityRowActions
      editHref={`/admin/articles/${id}`}
      name={title}
      entity="Article"
      status={status}
      onToggleStatus={(next) => setJournalStatus(id, next)}
      onDelete={() => deleteJournal(id)}
    />
  );
}
