"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
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
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";
import { resetPassword } from "@/server/actions/auth";

/**
 * Chooses a new password from an emailed link, then signs straight in with it
 * so nobody has to type the new password twice in a row.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: ResetPasswordInput) => {
    setFormError(null);
    const result = await resetPassword(values);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    toast.success("Password changed.");
    const signedIn = await signIn("credentials", {
      email: result.email,
      password: values.password,
      redirect: false,
    });
    // /login sends a signed-in visitor on by role; without a session it simply
    // shows the form, with the new password ready to use.
    router.replace("/login");
    if (signedIn && !signedIn.error) router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <input type="hidden" {...register("token")} />
      <FieldSet>
        <FieldGroup>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="reset-password">New password</FieldLabel>
            <PasswordInput
              id="reset-password"
              autoComplete="new-password"
              {...register("password")}
            />
            <FieldDescription>At least 10 characters.</FieldDescription>
            <FieldError errors={[errors.password]} />
          </Field>

          <Field data-invalid={!!errors.confirmPassword}>
            <FieldLabel htmlFor="reset-confirm">Confirm new password</FieldLabel>
            <PasswordInput
              id="reset-confirm"
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
            Save new password
          </Button>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}
