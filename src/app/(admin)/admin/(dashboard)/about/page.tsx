import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { getAboutPage } from "@/server/about";

import { AboutForm } from "./about-form";

export const metadata: Metadata = { title: "About page" };

export default async function AdminAboutPage() {
  const about = await getAboutPage();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <AdminPageHeader
        title="About page"
        description="The words on the public About page. Changes go live as soon as you save."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/about" target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon aria-hidden />
              View page
            </Link>
          </Button>
        }
      />
      <AboutForm initial={about} />
    </div>
  );
}
