"use client";

import { EntityRowActions } from "@/components/admin/entity-row-actions";
import { deleteService, setServiceStatus } from "@/server/actions/content";

export function ServiceRowActions({
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
      editHref={`/admin/services/${id}`}
      name={title}
      entity="Service"
      status={status}
      onToggleStatus={(next) => setServiceStatus(id, next)}
      onDelete={() => deleteService(id)}
    />
  );
}
