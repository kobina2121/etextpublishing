"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { ActionResult } from "@/server/actions/shared";

/**
 * Destructive confirmation.
 *
 * The record's name is repeated in the dialog so a mis-click on the wrong row
 * is caught before it is destroyed, not after.
 */
export function DeleteDialog({
  name,
  entity,
  action,
  onDeleted,
}: {
  name: string;
  entity: string;
  action: () => Promise<ActionResult>;
  onDeleted?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onConfirm = () => {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(result.message ?? `${entity} deleted.`);
        setOpen(false);
        if (onDeleted) router.push(onDeleted);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2Icon aria-hidden />
          <span className="sr-only sm:not-sr-only">Delete</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the {entity.toLowerCase()} and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              // Keep the dialog open while the action runs, so the spinner is
              // visible and a slow delete cannot be double-submitted.
              event.preventDefault();
              onConfirm();
            }}
            disabled={pending}
          >
            {pending ? <Spinner /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
