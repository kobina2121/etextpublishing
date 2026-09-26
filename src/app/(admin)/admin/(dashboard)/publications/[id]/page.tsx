import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLinkIcon } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { Button } from "@/components/ui/button";
import { deletePublication } from "@/server/actions/publications";
import { getFormOptions, getPublicationForEdit } from "@/server/admin/queries";

import { PublicationForm } from "../publication-form";

export const metadata: Metadata = { title: "Edit publication" };

export default async function EditPublicationPage({
  params,
}: PageProps<"/admin/publications/[id]">) {
  const { id } = await params;
  const [publication, options] = await Promise.all([getPublicationForEdit(id), getFormOptions()]);
  if (!publication) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title={publication.title}
        description="Edit this title, or change whether it appears on the website."
        actions={
          <>
            {publication.status === "published" ? (
              <Button asChild variant="outline">
                <Link
                  href={`/publications/${publication.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLinkIcon aria-hidden />
                  View live
                </Link>
              </Button>
            ) : null}
            <DeleteDialog
              name={publication.title}
              entity="Publication"
              action={async () => {
                "use server";
                return deletePublication(id);
              }}
              onDeleted="/admin/publications"
            />
          </>
        }
      />
      <PublicationForm
        initial={publication}
        authors={options.authors}
        categories={options.categories}
      />
    </div>
  );
}
