import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { AdminNavIcon } from "@/components/admin/admin-nav-icon";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
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
import { listServicesAdmin } from "@/server/admin/queries";

import { ServiceRowActions } from "./service-row-actions";

export const metadata: Metadata = { title: "Services" };

export default async function AdminServicesPage() {
  const rows = await listServicesAdmin();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <AdminPageHeader
        title="Services"
        description="Shown on the services page, ordered by the order field."
        actions={
          <Button asChild>
            <Link href="/admin/services/new">
              <PlusIcon aria-hidden />
              New service
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <Empty className="border border-dashed border-border py-16">
          <EmptyHeader>
            <EmptyTitle>No services</EmptyTitle>
            <EmptyDescription>Add the services offered to authors.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-x-auto border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-sm text-muted-foreground">{row.order}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                        <AdminNavIcon name={row.icon} className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/services/${row.id}`}
                          className="font-medium hover:text-primary"
                        >
                          {row.title}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {row.summary}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ServiceRowActions id={row.id} title={row.title} status={row.status} />
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
