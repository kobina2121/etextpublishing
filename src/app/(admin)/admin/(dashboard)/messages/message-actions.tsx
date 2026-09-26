"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArchiveIcon, ArchiveRestoreIcon, MailOpenIcon, MailIcon } from "lucide-react";

import { DeleteDialog } from "@/components/admin/delete-dialog";
import { Button } from "@/components/ui/button";
import { deleteMessage, setMessageArchived, setMessageRead } from "@/server/actions/inbox";

export function MessageActions({
  id,
  subject,
  read,
  archived,
  onDeletedHref,
}: {
  id: string;
  subject: string;
  read: boolean;
  archived: boolean;
  onDeletedHref?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) => {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast.success(result.message ?? "Saved.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => run(() => setMessageRead(id, !read))}
      >
        {read ? <MailIcon aria-hidden /> : <MailOpenIcon aria-hidden />}
        <span className="sr-only lg:not-sr-only">{read ? "Unread" : "Read"}</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => run(() => setMessageArchived(id, !archived))}
      >
        {archived ? <ArchiveRestoreIcon aria-hidden /> : <ArchiveIcon aria-hidden />}
        <span className="sr-only lg:not-sr-only">{archived ? "Restore" : "Archive"}</span>
      </Button>
      <DeleteDialog
        name={subject}
        entity="Message"
        action={() => deleteMessage(id)}
        onDeleted={onDeletedHref}
      />
    </div>
  );
}
