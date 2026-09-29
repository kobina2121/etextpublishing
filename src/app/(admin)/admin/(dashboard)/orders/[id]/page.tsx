import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeftIcon } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { getOrder } from "@/server/admin/queries";

import { FulfilmentForm } from "./fulfilment-form";

export const metadata: Metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin/orders">
          <ArrowLeftIcon aria-hidden />
          All orders
        </Link>
      </Button>

      <AdminPageHeader
        title={order.reference}
        description={`${order.customerName} · ${format(order.createdAt, "d MMMM yyyy, HH:mm")}`}
        actions={<StatusBadge status={order.status === "paid" ? "accepted" : order.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {order.items.map((item) => (
                  <li key={item.slug + item.format} className="flex justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {item.format} · {item.quantity} ×{" "}
                        {formatMoney(item.unitPrice, order.currency)}
                        {item.requiresShipping ? "" : " · download"}
                      </p>
                    </div>
                    <span className="shrink-0 font-medium">
                      {formatMoney(item.lineTotal, order.currency)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex justify-between border-t border-border pt-4 text-base font-semibold">
                <span>Total paid</span>
                <span>{formatMoney(order.total, order.currency)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                    Email
                  </dt>
                  <dd className="mt-1 text-sm break-words">
                    <a
                      href={`mailto:${order.email}`}
                      className="underline underline-offset-4 hover:text-primary"
                    >
                      {order.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                    Phone
                  </dt>
                  <dd className="mt-1 text-sm">{order.phone || "—"}</dd>
                </div>
                {order.shippingAddress ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                      Delivery address
                    </dt>
                    <dd className="mt-1 text-sm">
                      {[
                        order.shippingAddress.line1,
                        order.shippingAddress.line2,
                        order.shippingAddress.city,
                        order.shippingAddress.region,
                        order.shippingAddress.postalCode,
                        order.shippingAddress.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </dd>
                  </div>
                ) : null}
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                    Paystack reference
                  </dt>
                  <dd className="mt-1 font-mono text-xs break-all">
                    {order.paystackReference || "—"}
                    {order.paidAt ? ` · paid ${format(order.paidAt, "d MMM yyyy, HH:mm")}` : ""}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        <FulfilmentForm
          id={order.id}
          fulfilment={order.fulfilment}
          adminNotes={order.adminNotes}
          canFulfil={order.status === "paid" && order.requiresShipping}
        />
      </div>
    </div>
  );
}
