"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

/**
 * Email and password sign-in.
 *
 * `callbackUrl` has already been checked by the page to be a same-site path,
 * so a crafted link cannot bounce someone to another site after signing in.
 */
export function PasswordForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginInput) => {
    setFormError(null);

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (!result || result.error) {
      // Deliberately generic: saying which of the two was wrong would confirm
      // whether an account exists. It also covers the rate limit, which
      // should not announce itself either.
      setFormError("That email and password were not recognised.");
      return;
    }

    router.replace(callbackUrl);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldSet>
        <FieldGroup>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="login-email">Email</FieldLabel>
            <Input id="login-email" type="email" autoComplete="email" {...register("email")} />
            <FieldError errors={[errors.email]} />
          </Field>

          <Field data-invalid={!!errors.password}>
            <div className="flex items-baseline justify-between gap-4">
              <FieldLabel htmlFor="login-password">Password</FieldLabel>
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              {...register("password")}
            />
            <FieldError errors={[errors.password]} />
          </Field>

          <Button
            type="submit"
            size="xl"
            disabled={isSubmitting}
            className="w-full font-semibold tracking-[0.1em] uppercase"
          >
            {isSubmitting ? <Spinner /> : null}
            Sign in
          </Button>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}
