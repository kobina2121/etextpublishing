import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getFormOptions } from "@/server/admin/queries";

import { PublicationForm } from "../publication-form";

export const metadata: Metadata = { title: "New publication" };

export default async function NewPublicationPage() {
  const { authors, categories } = await getFormOptions();

  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title="New publication"
        description="Titles start as drafts and stay off the website until published."
      />
      <PublicationForm authors={authors} categories={categories} />
    </div>
  );
}
