import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getServiceForEdit } from "@/server/admin/queries";

import { ServiceForm } from "../service-form";

export const metadata: Metadata = { title: "Edit service" };

export default async function EditServicePage({ params }: PageProps<"/admin/services/[id]">) {
  const { id } = await params;
  const service = await getServiceForEdit(id);
  if (!service) notFound();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <AdminPageHeader title={service.title} description="Edit this service." />
      <ServiceForm initial={service} />
    </div>
  );
}
