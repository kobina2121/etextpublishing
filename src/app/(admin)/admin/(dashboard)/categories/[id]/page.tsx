import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getCategoryForEdit } from "@/server/admin/queries";

import { CategoryForm } from "../category-form";

export const metadata: Metadata = { title: "Edit category" };

export default async function EditCategoryPage({ params }: PageProps<"/admin/categories/[id]">) {
  const { id } = await params;
  const category = await getCategoryForEdit(id);
  if (!category) notFound();

  return (
    <div className="mx-auto w-full max-w-4xl">
      <AdminPageHeader title={category.name} description="Edit this category." />
      <CategoryForm initial={category} />
    </div>
  );
}
