import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
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
import { listCategoriesAdmin } from "@/server/admin/queries";

import { CategoryRowActions } from "./category-row-actions";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const rows = await listCategoriesAdmin();

  return (
    <div className="mx-auto w-full max-w-4xl">
      <AdminPageHeader
        title="Categories"
        description="Used to group publications and articles."
        actions={
          <Button asChild>
            <Link href="/admin/categories/new">
              <PlusIcon aria-hidden />
              New category
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <Empty className="border border-dashed border-border py-16">
          <EmptyHeader>
            <EmptyTitle>No categories</EmptyTitle>
            <EmptyDescription>Create one to start grouping content.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-x-auto border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Used by</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`/admin/categories/${row.id}`}
                      className="font-medium hover:text-primary"
                    >
                      {row.name}
                    </Link>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">{row.slug}</p>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {row.publicationCount} publications · {row.articleCount} articles
                  </TableCell>
                  <TableCell className="text-right">
                    <CategoryRowActions id={row.id} name={row.name} />
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
