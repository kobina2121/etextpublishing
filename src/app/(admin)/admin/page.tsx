import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/guards";

import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Placeholder dashboard.
 *
 * Phase 5 only proves the gate: the proxy keeps unauthenticated requests out,
 * and `requireAdmin()` re-checks the session here rather than trusting routing.
 * Counts, recent submissions and the CRUD screens arrive in Phase 6.
 */
export default async function AdminDashboardPage() {
  const admin = await requireAdmin();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Admin
          </p>
          <h1 className="mt-2 text-3xl">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Signed in as {admin.name || admin.email} ({admin.role}).
          </p>
        </div>
        <SignOutButton />
      </header>

      <Card className="mt-10">
        <CardHeader>
          <CardTitle>Nothing here yet</CardTitle>
          <CardDescription>
            Authentication is in place. Managing publications, authors, articles, services,
            submissions and messages lands in the next phase.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This route is gated twice: the proxy rejects requests without an admin token before the
          page renders, and this page re-checks the session on the server.
        </CardContent>
      </Card>
    </main>
  );
}
