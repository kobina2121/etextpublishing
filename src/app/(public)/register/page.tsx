import type { Metadata } from "next";
import { DownloadIcon, HistoryIcon, PackageIcon } from "lucide-react";

import { AuthDivider, AuthLayout, AuthSwitch, type AuthPoint } from "@/components/auth/auth-layout";
import { GoogleButton } from "@/components/auth/google-button";
import { RegisterForm } from "@/components/auth/register-form";
import { isGoogleSignInEnabled } from "@/lib/auth/google";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Create an account",
    description: "Create a reader account to see your orders and downloads.",
    path: "/register",
    noIndex: true,
  });
}

/**
 * What an account actually gives a reader. Kept to things that are true today:
 * checkout does not prefill from the account, so "faster checkout" is not here.
 * The guest-order point is Google-only because only Google verifies addresses.
 */
const BENEFITS: readonly AuthPoint[] = [
  {
    icon: PackageIcon,
    title: "Every order in one place",
    body: "See what you bought and where each delivery has got to.",
  },
  {
    icon: DownloadIcon,
    title: "Your softcopies, listed",
    body: "Every digital edition you buy is kept on your account.",
  },
  {
    icon: HistoryIcon,
    title: "Earlier orders included",
    body: "Sign up with Google and anything you bought as a guest at that address appears too.",
  },
];

/**
 * The sign-up page: a short case for having an account beside the form.
 *
 * Every account made here is a `customer`. Staff are made admins on the
 * server, never by a form. Google is offered as well, because for most readers
 * it is one click instead of four fields.
 */
export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const params = await searchParams;
  const raw = typeof params.callbackUrl === "string" ? params.callbackUrl : "";
  // Same-site paths only, as on /login. With nothing requested, /login hands a
  // signed-in visitor on to wherever their role belongs.
  const callbackUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/login";

  const googleEnabled = isGoogleSignInEnabled();

  return (
    <AuthLayout
      title="Create an account"
      description="Keep your orders and downloads together. Buying never needs one."
      cardTitle="Your details"
      cardDescription="All four fields are needed. We never share your email."
      aside={{ title: "Why create an account?", points: BENEFITS }}
    >
      <RegisterForm callbackUrl={callbackUrl} />

      {googleEnabled ? (
        <>
          <AuthDivider />
          <GoogleButton callbackUrl={callbackUrl} label="Sign up with Google" />
        </>
      ) : null}

      <AuthSwitch
        prompt="Already have an account?"
        href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
        label="Sign in"
      />
    </AuthLayout>
  );
}
