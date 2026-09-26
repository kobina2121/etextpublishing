import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpenIcon, ExternalLinkIcon } from "lucide-react";

import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import type { AdminSessionUser } from "@/lib/auth/guards";

export function AdminShell({ admin, children }: { admin: AdminSessionUser; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
          <BookOpenIcon className="size-5 shrink-0 text-primary" aria-hidden />
          <span className="truncate text-sm font-semibold tracking-[0.1em] uppercase">
            {siteConfig.name}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <AdminSidebarNav />
        </div>
        <div className="space-y-2 border-t border-sidebar-border p-3">
          <Button asChild variant="ghost" size="sm" className="w-full justify-start">
            <Link href="/" target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon aria-hidden />
              View website
            </Link>
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background px-4 sm:px-6">
          <AdminMobileNav />
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden truncate text-sm text-muted-foreground sm:inline">
              {admin.name || admin.email}
            </span>
            <SignOutButton />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
