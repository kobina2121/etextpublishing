import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";

import { ServiceForm } from "../service-form";

export const metadata: Metadata = { title: "New service" };

export default function NewServicePage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <AdminPageHeader title="New service" />
      <ServiceForm />
    </div>
  );
}
