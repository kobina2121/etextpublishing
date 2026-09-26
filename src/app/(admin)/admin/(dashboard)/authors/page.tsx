import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PlusIcon } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSearch } from "@/components/admin/admin-search";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { listAuthorsAdmin } from "@/server/admin/queries";

import { AuthorRowActions } from "./author-row-actions";

export const metadata: Metadata = { title: "Authors" };

export default async function AdminAuthorsPage({ searchParams }: PageProps<"/admin/authors">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const rows = await listAuthorsAdmin({ q });

  return (
    <div className="mx-auto w-full max-w-5xl">
      <AdminPageHeader
        title="Authors"
        description="Everyone on the list. Titles are linked to an author here."
        actions={
          <Button asChild>
            <Link href="/admin/authors/new">
              <PlusIcon aria-hidden />
              New author
            </Link>
          </Button>
        }
      />

      <AdminSearch placeholder="Search by name or role…" />

      <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
        {rows.length} {rows.length === 1 ? "author" : "authors"}
      </p>

      {rows.length === 0 ? (
        <Empty className="mt-6 border border-dashed border-border py-16">
          <EmptyHeader>
            <EmptyTitle>No authors</EmptyTitle>
            <EmptyDescription>Add an author before creating a publication.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="mt-6 overflow-x-auto border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Role</TableHead>
                <TableHead className="hidden md:table-cell">Titles</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {row.photo ? (
                        <Image
                          src={row.photo}
                          alt=""
                          width={36}
                          height={36}
                          unoptimized
                          className="size-9 shrink-0 object-cover"
                        />
                      ) : (
                        <Avatar className="size-9 shrink-0 rounded-none">
                          <AvatarFallback className="rounded-none text-xs">
                            {row.name
                              .split(" ")
                              .map((p) => p[0] ?? "")
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/admin/authors/${row.id}`}
                          className="font-medium hover:text-primary"
                        >
                          {row.name}
                        </Link>
                        {row.featured ? (
                          <Badge variant="secondary" className="ml-2 tracking-wide uppercase">
                            Featured
                          </Badge>
                        ) : null}
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                          /{row.slug}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{row.role || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{row.titleCount}</TableCell>
                  <TableCell className="text-right">
                    <AuthorRowActions id={row.id} name={row.name} />
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
