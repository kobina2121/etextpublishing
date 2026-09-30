"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MailIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Spinner } from "@/components/ui/spinner";
import { requestMagicLink } from "@/server/actions/auth";

const schema = z.object({ email: z.string().trim().email("Enter a valid email address.") });
type Values = z.infer<typeof schema>;

export function MagicLinkForm() {
  const [sent, setSent] = useState<string | null>(null);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = async (values: Values) => {
    setError(null);
    setDevUrl(null);
    const result = await requestMagicLink(values);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSent(result.message);
    if (result.devUrl) setDevUrl(result.devUrl);
  };

  if (sent) {
    return (
      <div className="space-y-4">
        <Alert>
          <MailIcon aria-hidden />
          <AlertTitle>Check your email</AlertTitle>
          <AlertDescription>{sent}</AlertDescription>
        </Alert>

        {devUrl ? (
          <Alert variant="destructive">
            <AlertTitle>Development only</AlertTitle>
            <AlertDescription className="space-y-2">
              <span>No mail provider is configured, so the link is shown here instead.</span>
              <a
                href={devUrl}
                className="block font-mono text-xs break-all underline underline-offset-4"
              >
                {devUrl}
              </a>
            </AlertDescription>
          </Alert>
        ) : null}

        <Button variant="outline" className="w-full" onClick={() => setSent(null)}>
          Use a different address
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldSet>
        <FieldGroup>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="magic-email">Email</FieldLabel>
            <Input id="magic-email" type="email" autoComplete="username" {...register("email")} />
            <FieldDescription>
              We send a link that signs you in once. It expires after 15 minutes.
            </FieldDescription>
            <FieldError errors={[errors.email]} />
          </Field>

          <Button
            type="submit"
            size="xl"
            disabled={isSubmitting}
            className="w-full font-semibold tracking-[0.1em] uppercase"
          >
            {isSubmitting ? <Spinner /> : <MailIcon aria-hidden />}
            Email me a link
          </Button>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}
