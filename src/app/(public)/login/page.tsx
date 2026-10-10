import type { Metadata } from "next";
import { DownloadIcon, LayoutDashboardIcon, PackageIcon } from "lucide-react";

import { AuthDivider, AuthLayout, AuthSwitch, type AuthPoint } from "@/components/auth/auth-layout";
import { GoogleButton } from "@/components/auth/google-button";
import { PasswordForm } from "@/components/auth/password-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

/** What is waiting on the other side. Staff are told too: there is no separate staff page. */
const WAITING: readonly AuthPoint[] = [
  {
    icon: PackageIcon,
    title: "Your orders",
    body: "Everything you have bought, and where each delivery has got to.",
  },
  {
    icon: DownloadIcon,
    title: "Your softcopies",
    body: "Every digital edition you have bought, listed in one place.",
  },
  {
    icon: LayoutDashboardIcon,
    title: "Staff sign in here too",
    body: "An admin account goes straight to the dashboard.",
  },
];

/**
 * The sign-in page. There is exactly one, for readers and staff alike.
 *
 * Two ways in: an email and password, or Google. What you get afterwards is
 * decided by the account behind the address: an email carrying the admin role
 * lands on the dashboard, anything else lands on its own orders. Nobody picks
 * "staff" at sign-in, because that is not a choice a visitor should be making.
 *
 * Admin is granted on the server with `npm run grant-admin -- <email>`, never
 * from a screen. Neither sign-in nor sign-up can create more than a customer.
 *
 * Signing in is never required to buy. Guest checkout stays, and this page
 * says so, because a sign-in wall in front of a basket loses sales.
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const raw = typeof params.callbackUrl === "string" ? params.callbackUrl : "";
  // Only same-site paths: an absolute URL here would make this an open
  // redirect, handing an attacker a link that looks like ours. With nothing
  // requested, come back here: the proxy sends a signed-in visitor on to
  // /admin or /account by role, which this page cannot know in advance.
  const callbackUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/login";

  const googleEnabled = isGoogleSignInEnabled();

  // Auth.js reports failures by sending the reader back here with ?error=.
  // Without this they would land on a page that looks like nothing happened
  // and click the same button again.
  const errorCode = typeof params.error === "string" ? params.error : "";
  const errorMessage = errorCode ? describeAuthError(errorCode) : null;

  return (
    <AuthLayout
      title="Sign in"
      description="Welcome back. You do not need an account to buy."
      cardTitle="Enter your details"
      cardDescription={
        googleEnabled ? "Use your email and password, or Google." : "Use your email and password."
      }
      aside={{ title: "Welcome back", points: WAITING }}
    >
      {errorMessage ? (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <PasswordForm callbackUrl={callbackUrl} />

      {googleEnabled ? (
        <>
          <AuthDivider />
          <GoogleButton callbackUrl={callbackUrl} />
        </>
      ) : null}

      <AuthSwitch
        prompt="New here?"
        href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
        label="Create an account"
      />
    </AuthLayout>
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
    default:
      return "Something went wrong signing you in. Please try again.";
  }
}
