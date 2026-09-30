import type { Metadata } from "next";
import { Suspense } from "react";

import { GoogleButton } from "@/components/auth/google-button";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { PasswordForm } from "@/components/auth/password-form";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { PageHero } from "@/components/public/page-hero";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isGoogleSignInEnabled } from "@/lib/auth/google";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Sign in",
    description: "Sign in to see your orders and downloads.",
    path: "/login",
    // A sign-in page has nothing to offer a search engine.
    noIndex: true,
  });
}

/**
 * The one sign-in page.
 *
 * Readers and staff use the same form and are routed by role afterwards:
 * there is nothing an admin does here that a reader must be kept away from,
 * and a second page only meant two places to keep in step. /admin/login now
 * redirects here.
 *
 * Google is first because it is what almost everyone will use. The email and
 * password methods are staff ones — both providers refuse any role below
 * admin — so they sit behind a heading that says so rather than being offered
 * as equal choices to a reader.
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

  // Auth.js reports failures by sending the reader back here with ?error=.
  // Without this they would land on a page that looks like nothing happened
  // and click the same button again.
  const errorCode = typeof params.error === "string" ? params.error : "";
  const errorMessage = errorCode ? describeAuthError(errorCode) : null;

  return (
    <>
      <PageHero
        title="Sign in"
        description="See your orders and downloads. You do not need an account to buy."
      />

      <Section>
        <Container width="prose">
          <div className="mx-auto max-w-md">
            {errorMessage ? (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}

            {googleEnabled ? (
              <>
                <GoogleButton callbackUrl={callbackUrl} />
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Signing in creates a reader account the first time. We only ever see your
                  name, email address and profile picture.
                </p>
              </>
            ) : (
              <Alert>
                <AlertDescription>
                  Google sign-in is not configured yet. You can still buy any title as a guest.
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-10 border-t border-border pt-8">
              <h2 className="text-sm font-semibold tracking-[0.14em] uppercase">Staff sign-in</h2>
              <p className="mt-1 mb-5 text-sm text-muted-foreground">
                For the publishing team. Reader accounts use Google above.
              </p>

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
                    <PasswordForm />
                  </Suspense>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

/**
 * Auth.js error codes, in words a reader can act on.
 *
 * The codes are deliberately vague — they must not confirm whether an address
 * exists — so these stay general too, and say what to do next rather than
 * guessing at a cause.
 */
function describeAuthError(code: string): string {
  switch (code) {
    case "AccessDenied":
      return "That sign-in was declined. If you cancelled on Google's screen you can simply try again; if you did not, this site may not be open to your account yet.";
    case "Configuration":
      return "Sign-in is not set up correctly on our side. Please let us know, and buy as a guest in the meantime.";
    case "OAuthAccountNotLinked":
      return "An account already exists for that email address using a different sign-in method.";
    case "Verification":
      return "That link has expired or has already been used. Please start again.";
    default:
      return "Something went wrong signing you in. Please try again.";
  }
}
