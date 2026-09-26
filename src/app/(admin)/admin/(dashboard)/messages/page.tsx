import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSearch } from "@/components/admin/admin-search";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { listMessagesAdmin } from "@/server/admin/queries";

import { MessageActions } from "./message-actions";

export const metadata: Metadata = { title: "Messages" };

export default async function AdminMessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const rows = await listMessagesAdmin({ q, status });

  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title="Messages"
        description="Enquiries from the contact form. Archived messages are hidden by default."
      />

      <AdminSearch
        placeholder="Search by name, email or subject…"
        statuses={[
          { value: "unread", label: "Unread" },
          { value: "archived", label: "Archived" },
        ]}
      />

      <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
        {rows.length} {rows.length === 1 ? "message" : "messages"}
      </p>

      {rows.length === 0 ? (
        <Empty className="mt-6 border border-dashed border-border py-16">
          <EmptyHeader>
            <EmptyTitle>No messages</EmptyTitle>
            <EmptyDescription>
              Contact form enquiries will appear here. Delivery is wired up in the next phase.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="mt-6 overflow-x-auto border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead className="hidden md:table-cell">From</TableHead>
                <TableHead className="hidden sm:table-cell">Received</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`/admin/messages/${row.id}`}
                      className={cn("hover:text-primary", row.read ? "" : "font-semibold")}
                    >
                      {row.subject}
                    </Link>
                    {row.read ? null : <Badge className="ml-2 tracking-wide uppercase">New</Badge>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {row.name}
                    <p className="text-xs text-muted-foreground">{row.email}</p>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {formatDistanceToNow(row.createdAt, { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <MessageActions
                      id={row.id}
                      subject={row.subject}
                      read={row.read}
                      archived={row.archived}
                    />
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
