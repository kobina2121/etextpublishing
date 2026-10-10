import type { Metadata } from "next";
import Link from "next/link";

import { AuthLayout, AuthSwitch } from "@/components/auth/auth-layout";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { checkPasswordReset } from "@/lib/auth/password-reset";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Choose a new password",
    description: "Set a new password for your account.",
    path: "/reset-password",
    noIndex: true,
  });
}

const PROBLEMS = {
  invalid: "That reset link is not valid. It may have been copied incompletely.",
  expired: "That reset link has expired. Links work for 30 minutes.",
  used: "That reset link has already been used.",
} as const;

/**
 * Where an emailed reset link lands.
 *
 * The link is checked before a form is shown, so nobody types a new password
 * twice only to be told the link was dead. Checking spends nothing; the token
 * is only used up when the form is submitted.
 */
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const state = await checkPasswordReset(token);

  return (
    <AuthLayout
      title="Choose a new password"
      description="Pick something you have not used here before."
      cardTitle="New password"
      cardDescription={state === "valid" ? "This link works once." : "This link cannot be used."}
    >
      {state === "valid" ? (
        <ResetPasswordForm token={token} />
      ) : (
        <>
          <Alert variant="destructive">
            <AlertDescription>{PROBLEMS[state]}</AlertDescription>
          </Alert>
          <Button
            asChild
            size="xl"
            className="mt-6 w-full font-semibold tracking-[0.1em] uppercase"
          >
            <Link href="/forgot-password">Get a new link</Link>
          </Button>
        </>
      )}
      <AuthSwitch prompt="Remembered it?" href="/login" label="Back to sign in" />
    </AuthLayout>
  );
}
