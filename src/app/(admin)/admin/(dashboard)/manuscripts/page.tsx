import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSearch } from "@/components/admin/admin-search";
import { StatusBadge } from "@/components/admin/status-badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listSubmissionsAdmin } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Manuscripts" };

export default async function AdminManuscriptsPage({
  searchParams,
}: PageProps<"/admin/manuscripts">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const rows = await listSubmissionsAdmin({ q, status });

  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title="Manuscripts"
        description="Submissions sent through the website. These are not created here."
      />

      <AdminSearch
        placeholder="Search by title, author or email…"
        statuses={[
          { value: "new", label: "New" },
          { value: "under_review", label: "Under review" },
          { value: "accepted", label: "Accepted" },
          { value: "rejected", label: "Rejected" },
          { value: "archived", label: "Archived" },
        ]}
      />

      <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
        {rows.length} {rows.length === 1 ? "submission" : "submissions"}
      </p>

      {rows.length === 0 ? (
        <Empty className="mt-6 border border-dashed border-border py-16">
          <EmptyHeader>
            <EmptyTitle>No submissions</EmptyTitle>
            <EmptyDescription>
              Manuscripts sent through the website will appear here. Delivery is wired up in the
              next phase.
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
                <TableHead className="hidden lg:table-cell">Genre</TableHead>
                <TableHead className="hidden sm:table-cell">Received</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`/admin/manuscripts/${row.id}`}
                      className="font-medium hover:text-primary"
                    >
                      {row.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.wordCount.toLocaleString()} words
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {row.authorName}
                    <p className="text-xs text-muted-foreground">{row.email}</p>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{row.genre}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {format(row.submittedAt, "d MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
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
