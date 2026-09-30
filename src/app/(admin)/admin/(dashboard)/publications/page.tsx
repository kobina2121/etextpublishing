import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { PlusIcon } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSearch } from "@/components/admin/admin-search";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
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
import { listPublicationsAdmin } from "@/server/admin/queries";

import { PublicationRowActions } from "./publication-row-actions";

export const metadata: Metadata = { title: "Publications" };

export default async function AdminPublicationsPage({
  searchParams,
}: PageProps<"/admin/publications">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;

  const rows = await listPublicationsAdmin({ q, status });

  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title="Publications"
        description="Every title, including drafts and archived records."
        actions={
          <Button asChild>
            <Link href="/admin/publications/new">
              <PlusIcon aria-hidden />
              New publication
            </Link>
          </Button>
        }
      />

      <AdminSearch
        placeholder="Search by title, author or slug…"
        statuses={[
          { value: "published", label: "Published" },
          { value: "draft", label: "Draft" },
          { value: "archived", label: "Archived" },
        ]}
      />

      <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
        {rows.length} {rows.length === 1 ? "title" : "titles"}
      </p>

      {rows.length === 0 ? (
        <Empty className="mt-6 border border-dashed border-border py-16">
          <EmptyHeader>
            <EmptyTitle>No publications</EmptyTitle>
            <EmptyDescription>
              Nothing matches those filters. Create a title to get started.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="mt-6 overflow-x-auto border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Author</TableHead>
                <TableHead className="hidden lg:table-cell">Category</TableHead>
                <TableHead className="hidden lg:table-cell">On sale as</TableHead>
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
                      href={`/admin/publications/${row.id}`}
                      className="font-medium hover:text-primary"
                    >
                      {row.title}
                    </Link>
                    {row.featured ? (
                      <Badge variant="secondary" className="ml-2 tracking-wide uppercase">
                        Featured
                      </Badge>
                    ) : null}
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">/{row.slug}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{row.authorName}</TableCell>
                  <TableCell className="hidden lg:table-cell">{row.categoryName}</TableCell>
                  <TableCell className="hidden whitespace-nowrap lg:table-cell">
                    {row.editions}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {format(row.publicationDate, "MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <PublicationRowActions id={row.id} title={row.title} status={row.status} />
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
