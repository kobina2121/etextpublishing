import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getFormOptions } from "@/server/admin/queries";

import { ArticleForm } from "../article-form";

export const metadata: Metadata = { title: "New article" };

export default async function NewArticlePage() {
  const { categories } = await getFormOptions();
  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader title="New article" />
      <ArticleForm categories={categories} />
    </div>
  );
}
