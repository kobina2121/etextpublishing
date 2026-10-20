import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { FileWarningIcon, PlusIcon } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSearch } from "@/components/admin/admin-search";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listJournalsAdmin } from "@/server/journals";

import { JournalRowActions } from "./journal-row-actions";

export const metadata: Metadata = { title: "Articles" };

export default async function AdminJournalsPage({ searchParams }: PageProps<"/admin/articles">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const rows = await listJournalsAdmin({ q, status });

  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title="Articles"
        description="Research articles, free for anyone to read on the site."
        actions={
          <Button asChild>
            <Link href="/admin/articles/new">
              <PlusIcon aria-hidden />
              New article
            </Link>
          </Button>
        }
      />

      <AdminSearch
        placeholder="Search by title, author or slug…"
        statuses={[
          { value: "published", label: "Published" },
          { value: "draft", label: "Draft" },
        ]}
      />

      <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
        {rows.length} {rows.length === 1 ? "entry" : "entries"}
      </p>

      {rows.length === 0 ? (
        <Empty className="mt-6 border border-dashed border-border py-16">
          <EmptyHeader>
            <EmptyTitle>No articles</EmptyTitle>
            <EmptyDescription>Add the first one to start the Articles page.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="mt-6 overflow-x-auto border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Authors</TableHead>
                <TableHead className="hidden lg:table-cell">Vol. / No.</TableHead>
                <TableHead className="hidden sm:table-cell">Published</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`/admin/articles/${row.id}`}
                      className="font-medium hover:text-primary"
                    >
                      {row.title}
                    </Link>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">/{row.slug}</p>
                    {row.hasPdf ? null : (
                      <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                        <FileWarningIcon className="size-3.5" aria-hidden />
                        No PDF yet
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="hidden max-w-xs truncate md:table-cell">
                    {row.authors}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{row.volumeIssue || "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {format(row.publishedAt, "d MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <JournalRowActions id={row.id} title={row.title} status={row.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
