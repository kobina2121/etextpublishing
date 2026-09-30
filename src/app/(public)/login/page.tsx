import type { Metadata } from "next";
import Link from "next/link";

import { GoogleButton } from "@/components/auth/google-button";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { PageHero } from "@/components/public/page-hero";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isGoogleSignInEnabled } from "@/lib/auth/google";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Sign in",
    description: "Sign in to see your orders and downloads.",
    path: "/login",
    // An account page has nothing to offer a search engine, and indexing it
    // only invites sign-in pages into results.
    noIndex: true,
  });
}

/**
 * Reader sign-in.
 *
 * Deliberately not the admin form: this asks for no password, because a
 * customer account never has one. Staff can sign in here too and are sent on
 * to the dashboard by the proxy.
 *
 * Signing in is never required to buy. Guest checkout stays, and this page
 * says so, because a sign-in wall in front of a basket loses sales.
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const raw = typeof params.callbackUrl === "string" ? params.callbackUrl : "";
  // Only same-site paths: an absolute URL here would make this an open
  // redirect, handing an attacker a link that looks like ours.
  const callbackUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account";

  const googleEnabled = isGoogleSignInEnabled();

  return (
    <>
      <PageHero
        title="Sign in"
        description="See your orders and downloads. You do not need an account to buy."
      />

      <Section>
        <Container width="prose">
          <div className="mx-auto max-w-md">
            {googleEnabled ? (
              <>
                <GoogleButton callbackUrl={callbackUrl} />
                <p className="mt-6 text-center text-sm text-muted-foreground">
                  Signing in creates a reader account the first time. We only ever see your
                  name, email address and profile picture.
                </p>
              </>
            ) : (
              <Alert>
                <AlertDescription>
                  Google sign-in is not configured yet, so there is nothing to sign in with.
                  You can still buy any title as a guest.
                </AlertDescription>
              </Alert>
            )}

            <p className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
              Staff looking for the dashboard?{" "}
              <Link href="/admin/login" className="font-medium text-primary hover:underline">
                Admin sign-in
              </Link>
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
