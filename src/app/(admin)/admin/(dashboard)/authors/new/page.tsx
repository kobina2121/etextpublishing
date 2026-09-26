import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";

import { AuthorForm } from "../author-form";

export const metadata: Metadata = { title: "New author" };

export default function NewAuthorPage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <AdminPageHeader title="New author" />
      <AuthorForm />
    </div>
  );
}
