"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { registerAccount } from "@/server/actions/auth";

/**
 * Email and password sign-up.
 *
 * Creates the account with a Server Action, then signs in through the same
 * Credentials provider the sign-in form uses, so a new reader lands signed in
 * rather than being asked to type the password a second time.
 */
export function RegisterForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: RegisterInput) => {
    setFormError(null);
    setAccountExists(false);

    const created = await registerAccount(values);
    if (!created.ok) {
      setFormError(created.message);
      setAccountExists(created.exists === true);
      return;
    }

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (!result || result.error) {
      // The account exists; only the automatic sign-in failed.
      router.replace(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
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
              <AlertDescription>
                {formError}
                {accountExists ? (
                  <span className="mt-1 block">
                    <Link
                      href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                      className="font-medium underline underline-offset-4"
                    >
                      Sign in
                    </Link>{" "}
                    or{" "}
                    <Link
                      href="/forgot-password"
                      className="font-medium underline underline-offset-4"
                    >
                      reset your password
                    </Link>
                    .
                  </span>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="register-name">Name</FieldLabel>
            <Input id="register-name" autoComplete="name" {...register("name")} />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="register-email">Email</FieldLabel>
            <Input id="register-email" type="email" autoComplete="email" {...register("email")} />
            <FieldError errors={[errors.email]} />
          </Field>

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="register-password">Password</FieldLabel>
            <PasswordInput
              id="register-password"
              autoComplete="new-password"
              {...register("password")}
            />
            <FieldDescription>At least 10 characters.</FieldDescription>
            <FieldError errors={[errors.password]} />
          </Field>

          <Field data-invalid={!!errors.confirmPassword}>
            <FieldLabel htmlFor="register-confirm">Confirm password</FieldLabel>
            <PasswordInput
              id="register-confirm"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            <FieldError errors={[errors.confirmPassword]} />
          </Field>

          <Button
            type="submit"
            size="xl"
            disabled={isSubmitting}
            className="w-full font-semibold tracking-[0.1em] uppercase"
          >
            {isSubmitting ? <Spinner /> : null}
            Create account
          </Button>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}
