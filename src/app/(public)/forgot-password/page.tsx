import type { Metadata } from "next";

import { AuthLayout, AuthSwitch } from "@/components/auth/auth-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Forgot your password?",
    description: "Get a link to choose a new password.",
    path: "/forgot-password",
    noIndex: true,
  });
}

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Forgot your password?"
      description="It happens. We will email you a link to choose a new one."
      cardTitle="Reset your password"
      cardDescription="Enter the email address on your account."
    >
      <ForgotPasswordForm />
      <AuthSwitch prompt="Remembered it?" href="/login" label="Back to sign in" />
    </AuthLayout>
  );
}
