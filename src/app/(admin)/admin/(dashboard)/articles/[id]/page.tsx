import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLinkIcon } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { getJournalForEdit } from "@/server/journals";

import { JournalForm } from "../journal-form";
import { journalStorage } from "../storage";

export const metadata: Metadata = { title: "Edit article" };

export default async function EditJournalPage({ params }: PageProps<"/admin/articles/[id]">) {
  const { id } = await params;
  const journal = await getJournalForEdit(id);
  if (!journal) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title={journal.title}
        description="Edit this article."
        actions={
          journal.status === "published" ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/articles/${journal.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon aria-hidden />
                View on site
              </Link>
            </Button>
          ) : null
        }
      />
      <JournalForm initial={journal} {...journalStorage()} />
    </div>
  );
}
