"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EyeIcon, EyeOffIcon, PencilIcon } from "lucide-react";

import { DeleteDialog } from "@/components/admin/delete-dialog";
import { Button } from "@/components/ui/button";
import { deletePublication, setPublicationStatus } from "@/server/actions/publications";

export function PublicationRowActions({
  id,
  title,
  status,
}: {
  id: string;
  title: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isPublished = status === "published";

  const toggle = () => {
    startTransition(async () => {
      const result = await setPublicationStatus(id, isPublished ? "draft" : "published");
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
      <Button variant="outline" size="sm" onClick={toggle} disabled={pending}>
        {isPublished ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
        <span className="sr-only sm:not-sr-only">{isPublished ? "Unpublish" : "Publish"}</span>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href={`/admin/publications/${id}`}>
          <PencilIcon aria-hidden />
          <span className="sr-only sm:not-sr-only">Edit</span>
        </Link>
      </Button>
      <DeleteDialog name={title} entity="Publication" action={() => deletePublication(id)} />
    </div>
  );
}
