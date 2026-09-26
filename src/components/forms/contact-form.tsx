"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { contactSchema, type ContactInput } from "@/lib/validations/contact";

export function ContactForm() {
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", phone: "", subject: "", message: "", website: "" },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = async (values: ContactInput) => {
    // Phase 7 replaces this with a Server Action that persists the message and
    // sends the notification email. Validation and UX are wired now so the
    // remaining work is the transport, not the form.
    if (values.website) return; // honeypot tripped: fail silently
    await new Promise((resolve) => setTimeout(resolve, 600));
    toast.success("Thanks — we'll be in touch.", {
      description: "Message delivery is wired up in a later phase.",
    });
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldSet>
        <FieldGroup>
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="sr-only"
            {...register("website")}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="contact-name">Name</FieldLabel>
              <Input id="contact-name" autoComplete="name" {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>

            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="contact-email">Email</FieldLabel>
              <Input id="contact-email" type="email" autoComplete="email" {...register("email")} />
              <FieldError errors={[errors.email]} />
            </Field>
          </div>

          <Field data-invalid={!!errors.phone}>
            <FieldLabel htmlFor="contact-phone">Phone (optional)</FieldLabel>
            <Input id="contact-phone" type="tel" autoComplete="tel" {...register("phone")} />
            <FieldError errors={[errors.phone]} />
          </Field>

          <Field data-invalid={!!errors.subject}>
            <FieldLabel htmlFor="contact-subject">Subject</FieldLabel>
            <Input id="contact-subject" {...register("subject")} />
            <FieldError errors={[errors.subject]} />
          </Field>

          <Field data-invalid={!!errors.message}>
            <FieldLabel htmlFor="contact-message">Message</FieldLabel>
            <Textarea id="contact-message" rows={6} {...register("message")} />
            <FieldDescription>Tell us a little about what you need.</FieldDescription>
            <FieldError errors={[errors.message]} />
          </Field>

          <div>
            <Button
              type="submit"
              size="xl"
              disabled={isSubmitting}
              className="font-semibold tracking-[0.1em] uppercase"
            >
              {isSubmitting ? <Spinner /> : null}
              Send message
            </Button>
          </div>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}
