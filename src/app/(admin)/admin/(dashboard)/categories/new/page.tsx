import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";

import { CategoryForm } from "../category-form";

export const metadata: Metadata = { title: "New category" };

export default function NewCategoryPage() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <AdminPageHeader title="New category" />
      <CategoryForm />
    </div>
  );
}
