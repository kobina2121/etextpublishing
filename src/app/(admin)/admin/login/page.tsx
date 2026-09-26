import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { siteConfig } from "@/lib/site-config";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BookOpenIcon className="size-9 text-primary" strokeWidth={1.5} aria-hidden />
          <div>
            <p className="font-semibold tracking-[0.12em] uppercase">{siteConfig.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">Content management</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Staff access only.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* useSearchParams needs a Suspense boundary to keep this page static. */}
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/" className="underline underline-offset-4 hover:text-primary">
            Back to the website
          </Link>
        </p>
      </div>
    </main>
  );
}
