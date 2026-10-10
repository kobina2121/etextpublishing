"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

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
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { setPasswordSchema, type SetPasswordInput } from "@/lib/validations/auth";
import { setAccountPassword } from "@/server/actions/auth";

/**
 * Sign-in methods on the account page: add a password to a Google account, or
 * change an existing one.
 */
export function PasswordSettings({
  hasPassword,
  hasGoogle,
}: {
  hasPassword: boolean;
  hasGoogle: boolean;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordInput>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
  });

  // Mirrors the server rule, so nobody fills in a form that cannot succeed.
  if (!hasPassword && !hasGoogle) {
    return (
      <Alert>
        <AlertDescription>
          To add a password, sign out and sign in once with Google at this address. That confirms
          the address is yours.
        </AlertDescription>
      </Alert>
    );
  }

  const onSubmit = async (values: SetPasswordInput) => {
    setFormError(null);
    const result = await setAccountPassword(values);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    toast.success(result.message);
    reset();
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-md">
      <FieldSet>
        <FieldGroup>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          {hasPassword ? (
            <Field data-invalid={!!errors.currentPassword}>
              <FieldLabel htmlFor="current-password">Current password</FieldLabel>
              <PasswordInput
                id="current-password"
                autoComplete="current-password"
                {...register("currentPassword")}
              />
              <FieldError errors={[errors.currentPassword]} />
            </Field>
          ) : null}

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="new-password">
              {hasPassword ? "New password" : "Password"}
            </FieldLabel>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              {...register("password")}
            />
            <FieldDescription>At least 10 characters.</FieldDescription>
            <FieldError errors={[errors.password]} />
          </Field>

          <Field data-invalid={!!errors.confirmPassword}>
            <FieldLabel htmlFor="confirm-new-password">Confirm password</FieldLabel>
            <PasswordInput
              id="confirm-new-password"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            <FieldError errors={[errors.confirmPassword]} />
          </Field>

          <div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="font-semibold tracking-[0.08em] uppercase"
            >
              {isSubmitting ? <Spinner /> : null}
              {hasPassword ? "Change password" : "Set password"}
            </Button>
          </div>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}
