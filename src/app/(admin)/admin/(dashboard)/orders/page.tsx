import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSearch } from "@/components/admin/admin-search";
import { StatusBadge } from "@/components/admin/status-badge";
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
import { formatMoney } from "@/lib/money";
import { listOrdersAdmin } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const rows = await listOrdersAdmin({ q, status });

  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title="Orders"
        description="Payments are settled against Paystack; only fulfilment is edited here."
      />

      <AdminSearch
        placeholder="Search by reference, name or email…"
        statuses={[
          { value: "awaiting", label: "Awaiting dispatch" },
          { value: "paid", label: "Paid" },
          { value: "pending", label: "Pending" },
          { value: "failed", label: "Failed" },
        ]}
      />

      <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
        {rows.length} {rows.length === 1 ? "order" : "orders"}
      </p>

      {rows.length === 0 ? (
        <Empty className="mt-6 border border-dashed border-border py-16">
          <EmptyHeader>
            <EmptyTitle>No orders</EmptyTitle>
            <EmptyDescription>Orders placed on the website will appear here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="mt-6 overflow-x-auto border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead className="hidden md:table-cell">Customer</TableHead>
                <TableHead className="hidden sm:table-cell">Placed</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="hidden lg:table-cell">Fulfilment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`/admin/orders/${row.id}`}
                      className="font-mono text-xs font-medium hover:text-primary"
                    >
                      {row.reference}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.itemCount} {row.itemCount === 1 ? "item" : "items"}
                      {row.requiresShipping ? " · ships" : " · download"}
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {row.customerName}
                    <p className="text-xs text-muted-foreground">{row.email}</p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {format(row.createdAt, "d MMM yyyy")}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatMoney(row.total, row.currency)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status === "paid" ? "accepted" : row.status} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {row.requiresShipping ? (
                      <Badge variant="outline" className="tracking-wide uppercase">
                        {row.fulfilment.replace("_", " ")}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">n/a</span>
                    )}
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
