import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { LogoMark } from "@/components/layout/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { siteConfig } from "@/lib/site-config";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { GoogleButton } from "@/components/auth/google-button";
import { isGoogleSignInEnabled } from "@/lib/auth/google";

import { LoginForm } from "./login-form";
import { MagicLinkForm } from "./magic-link-form";

export const metadata: Metadata = { title: "Sign in" };

export default function AdminLoginPage() {
  const googleEnabled = isGoogleSignInEnabled();

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <LogoMark className="h-14" />
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

            {googleEnabled ? (
              <>
                <div className="my-6 flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                    or
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                {/*
                  Google reaches the dashboard only for an address that is
                  already staff here. A Google account on its own creates a
                  customer, which the proxy bounces away from /admin.
                */}
                <GoogleButton callbackUrl="/admin" label="Continue with Google" />
              </>
            ) : null}
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
