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
import { listArticlesAdmin } from "@/server/admin/queries";

import { ArticleRowActions } from "./article-row-actions";

export const metadata: Metadata = { title: "Articles" };

export default async function AdminArticlesPage({ searchParams }: PageProps<"/admin/articles">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const rows = await listArticlesAdmin({ q, status });

  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title="Articles"
        description="News and editorial posts, including drafts."
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
        placeholder="Search by title or byline…"
        statuses={[
          { value: "published", label: "Published" },
          { value: "draft", label: "Draft" },
          { value: "archived", label: "Archived" },
        ]}
      />

      <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
        {rows.length} {rows.length === 1 ? "article" : "articles"}
      </p>

      {rows.length === 0 ? (
        <Empty className="mt-6 border border-dashed border-border py-16">
          <EmptyHeader>
            <EmptyTitle>No articles</EmptyTitle>
            <EmptyDescription>Nothing matches those filters.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="mt-6 overflow-x-auto border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden lg:table-cell">Byline</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
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
                    {row.featured ? (
                      <Badge variant="secondary" className="ml-2 tracking-wide uppercase">
                        Featured
                      </Badge>
                    ) : null}
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">/{row.slug}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{row.categoryName}</TableCell>
                  <TableCell className="hidden lg:table-cell">{row.authorName}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {format(row.publishedAt, "d MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ArticleRowActions id={row.id} title={row.title} status={row.status} />
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
