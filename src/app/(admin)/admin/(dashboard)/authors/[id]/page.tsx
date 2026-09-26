import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLinkIcon } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { getAuthorForEdit } from "@/server/admin/queries";

import { AuthorForm } from "../author-form";

export const metadata: Metadata = { title: "Edit author" };

export default async function EditAuthorPage({ params }: PageProps<"/admin/authors/[id]">) {
  const { id } = await params;
  const author = await getAuthorForEdit(id);
  if (!author) notFound();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <AdminPageHeader
        title={author.name}
        description="Edit this author's profile."
        actions={
          <Button asChild variant="outline">
            <Link href={`/authors/${author.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon aria-hidden />
              View live
            </Link>
          </Button>
        }
      />
      <AuthorForm initial={author} />
    </div>
  );
}
