"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EyeIcon, EyeOffIcon, PencilIcon } from "lucide-react";

import { DeleteDialog } from "@/components/admin/delete-dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/server/actions/shared";

/**
 * Edit / publish-toggle / delete for a list row.
 *
 * The publish toggle is optional, because not every entity has a status —
 * categories are always live, for instance.
 */
export function EntityRowActions({
  editHref,
  name,
  entity,
  status,
  onToggleStatus,
  onDelete,
}: {
  editHref: string;
  name: string;
  entity: string;
  status?: string;
  onToggleStatus?: (next: "draft" | "published") => Promise<ActionResult>;
  onDelete: () => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isPublished = status === "published";

  const toggle = () => {
    if (!onToggleStatus) return;
    startTransition(async () => {
      const result = await onToggleStatus(isPublished ? "draft" : "published");
      if (result.ok) {
        toast.success(result.message ?? "Saved.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {onToggleStatus && status ? (
        <Button variant="outline" size="sm" onClick={toggle} disabled={pending}>
          {isPublished ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
          <span className="sr-only lg:not-sr-only">{isPublished ? "Unpublish" : "Publish"}</span>
        </Button>
      ) : null}
      <Button asChild variant="outline" size="sm">
        <Link href={editHref}>
          <PencilIcon aria-hidden />
          <span className="sr-only lg:not-sr-only">Edit</span>
        </Link>
      </Button>
      <DeleteDialog name={name} entity={entity} action={onDelete} />
    </div>
  );
}
