import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { AdminNavIcon } from "@/components/admin/admin-nav-icon";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { requireAdmin } from "@/lib/auth/guards";
import {
  getDashboardCounts,
  getRecentMessages,
  getRecentSubmissions,
} from "@/server/admin/queries";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const [counts, submissions, messages] = await Promise.all([
    getDashboardCounts(),
    getRecentSubmissions(),
    getRecentMessages(),
  ]);

  const tiles = [
    {
      label: "Publications",
      href: "/admin/publications",
      icon: "BookOpen",
      value: counts.publications.total,
      detail: `${counts.publications.published} published · ${counts.publications.draft} draft`,
    },
    {
      label: "Authors",
      href: "/admin/authors",
      icon: "Users",
      value: counts.authors,
      detail: `${counts.categories} categories`,
    },
    {
      label: "Articles",
      href: "/admin/articles",
      icon: "Newspaper",
      value: counts.articles.total,
      detail: `${counts.articles.published} published · ${counts.articles.draft} draft`,
    },
    {
      label: "Services",
      href: "/admin/services",
      icon: "Wrench",
      value: counts.services,
      detail: "Listed on the services page",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title={`Welcome back, ${admin.name || "there"}`}
        description="An overview of the site's content and anything waiting on a reply."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href} className="group">
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  <AdminNavIcon name={tile.icon} className="size-3.5" />
                  {tile.label}
                </div>
                <p className="mt-2 text-3xl">{tile.value}</p>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">{tile.detail}</CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Recent submissions</CardTitle>
                <CardDescription>
                  {counts.manuscripts.unread} new of {counts.manuscripts.total}
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/manuscripts">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <Empty className="py-8">
                <EmptyHeader>
                  <EmptyTitle>No submissions yet</EmptyTitle>
                  <EmptyDescription>
                    Manuscripts sent through the website will appear here.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="divide-y divide-border">
                {submissions.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/manuscripts/${item.id}`}
                        className="block truncate text-sm font-medium hover:text-primary"
                      >
                        {item.title}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.authorName} ·{" "}
                        {formatDistanceToNow(item.submittedAt, { addSuffix: true })}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Recent messages</CardTitle>
                <CardDescription>
                  {counts.messages.unread} unread of {counts.messages.total}
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/messages">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <Empty className="py-8">
                <EmptyHeader>
                  <EmptyTitle>No messages yet</EmptyTitle>
                  <EmptyDescription>
                    Enquiries from the contact form will appear here.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="divide-y divide-border">
                {messages.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/messages/${item.id}`}
                        className="block truncate text-sm font-medium hover:text-primary"
                      >
                        {item.subject}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.name} · {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                      </p>
                    </div>
                    {item.read ? null : <Badge className="tracking-wide uppercase">New</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
