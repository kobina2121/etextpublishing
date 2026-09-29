import type { Metadata } from "next";
import Link from "next/link";

import { LogoMark } from "@/components/layout/logo";
import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@/lib/site-config";

import { VerifyClient } from "./verify-client";

export const metadata: Metadata = { title: "Signing in", robots: { index: false, follow: false } };

export default async function VerifyPage({ searchParams }: PageProps<"/admin/verify">) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <LogoMark className="h-14" />
          <p className="font-semibold tracking-[0.12em] uppercase">{siteConfig.name}</p>
        </div>

        <Card>
          <CardContent className="py-10">
            {token ? (
              <VerifyClient token={token} />
            ) : (
              <div className="space-y-3 text-center">
                <p className="font-medium">No sign-in token</p>
                <p className="text-sm text-muted-foreground">
                  This page is only reachable from a sign-in link.
                </p>
                <Link
                  href="/admin/login"
                  className="inline-block text-sm text-primary underline underline-offset-4"
                >
                  Back to sign in
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
