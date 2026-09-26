import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLinkIcon } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { getArticleForEdit, getFormOptions } from "@/server/admin/queries";

import { ArticleForm } from "../article-form";

export const metadata: Metadata = { title: "Edit article" };

export default async function EditArticlePage({ params }: PageProps<"/admin/articles/[id]">) {
  const { id } = await params;
  const [article, options] = await Promise.all([getArticleForEdit(id), getFormOptions()]);
  if (!article) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title={article.title}
        description="Edit this article."
        actions={
          article.status === "published" ? (
            <Button asChild variant="outline">
              <Link href={`/news/${article.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon aria-hidden />
                View live
              </Link>
            </Button>
          ) : null
        }
      />
      <ArticleForm initial={article} categories={options.categories} />
    </div>
  );
}
