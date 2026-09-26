"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AdminNavIcon } from "@/components/admin/admin-nav-icon";
import { adminNav } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

export function AdminSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Admin sections" className="flex flex-col gap-0.5">
      {adminNav.map((item) => {
        const active = isActive(item.href, "exact" in item ? item.exact : false);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <AdminNavIcon name={item.icon} className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
