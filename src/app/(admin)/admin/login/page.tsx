import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { siteConfig } from "@/lib/site-config";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { LoginForm } from "./login-form";
import { MagicLinkForm } from "./magic-link-form";

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
            <Tabs defaultValue="link">
              <TabsList className="w-full">
                <TabsTrigger value="link" className="flex-1">
                  Email link
                </TabsTrigger>
                <TabsTrigger value="password" className="flex-1">
                  Password
                </TabsTrigger>
              </TabsList>

              <TabsContent value="link" className="pt-5">
                <MagicLinkForm />
              </TabsContent>

              <TabsContent value="password" className="pt-5">
                {/* useSearchParams needs a Suspense boundary to keep this page static. */}
                <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                  <LoginForm />
                </Suspense>
              </TabsContent>
            </Tabs>
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
