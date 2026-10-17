"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { ImageUpload } from "@/components/admin/image-upload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  aboutPageSchema,
  type AboutPageInput,
  type AboutPageValues,
} from "@/lib/validations/content";
import { updateAboutPage } from "@/server/actions/about";

const MAX_CARDS = 6;

export function AboutForm({ initial }: { initial: AboutPageValues }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<AboutPageInput, unknown, AboutPageValues>({
    resolver: zodResolver(aboutPageSchema),
    defaultValues: initial,
  });

  const cards = useFieldArray({ control, name: "pillars" });
  // A list-level problem ("add at least one card"), not one card's own field.
  const cardsError = errors.pillars?.root?.message ?? errors.pillars?.message;

  const onSubmit = async (values: AboutPageValues) => {
    setFormError(null);
    const result = await updateAboutPage(values);
    if (result.ok) {
      toast.success(result.message ?? "Saved.");
      reset(values);
      router.refresh();
      return;
    }
    setFormError(result.error);
    for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
      if (messages[0]) setError(name as keyof AboutPageInput, { message: messages[0] });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Banner</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldSet>
            <FieldGroup>
              <Field data-invalid={!!errors.heroTitle}>
                <FieldLabel htmlFor="about-title">Page title</FieldLabel>
                <Input id="about-title" {...register("heroTitle")} />
                <FieldError errors={[errors.heroTitle]} />
              </Field>

              <Field data-invalid={!!errors.heroDescription}>
                <FieldLabel htmlFor="about-description">Line under the title</FieldLabel>
                <Textarea id="about-description" rows={2} {...register("heroDescription")} />
                <FieldDescription>
                  Also used as the page&apos;s summary in search results.
                </FieldDescription>
                <FieldError errors={[errors.heroDescription]} />
              </Field>

              <Field data-invalid={!!errors.heroImage}>
                <FieldLabel>Banner photo (optional)</FieldLabel>
                <Controller
                  control={control}
                  name="heroImage"
                  render={({ field }) => (
                    <ImageUpload
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      label="banner photo"
                      aspect="aspect-[3/1]"
                    />
                  )}
                />
                <FieldDescription>
                  Leave empty to use the standard bookshelf banner. A wide photo works best.
                </FieldDescription>
                <FieldError errors={[errors.heroImage]} />
              </Field>
            </FieldGroup>
          </FieldSet>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Introduction</CardTitle>
        </CardHeader>
        <CardContent>
          <Field data-invalid={!!errors.intro}>
            <FieldLabel htmlFor="about-intro">About the company</FieldLabel>
            <Textarea id="about-intro" rows={10} {...register("intro")} />
            <FieldDescription>Leave a blank line between paragraphs.</FieldDescription>
            <FieldError errors={[errors.intro]} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What we do</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldSet>
            <FieldGroup>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field data-invalid={!!errors.sectionTitle}>
                  <FieldLabel htmlFor="about-section-title">Section heading</FieldLabel>
                  <Input id="about-section-title" {...register("sectionTitle")} />
                  <FieldError errors={[errors.sectionTitle]} />
                </Field>
                <Field data-invalid={!!errors.sectionSubtitle}>
                  <FieldLabel htmlFor="about-section-subtitle">Line under it (optional)</FieldLabel>
                  <Input id="about-section-subtitle" {...register("sectionSubtitle")} />
                  <FieldError errors={[errors.sectionSubtitle]} />
                </Field>
              </div>

              <ol className="space-y-4">
                {cards.fields.map((card, index) => (
                  <li key={card.id} className="border border-border p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                        Card {index + 1}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Move card ${index + 1} up`}
                          disabled={index === 0}
                          onClick={() => cards.move(index, index - 1)}
                        >
                          <ArrowUpIcon aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Move card ${index + 1} down`}
                          disabled={index === cards.fields.length - 1}
                          onClick={() => cards.move(index, index + 1)}
                        >
                          <ArrowDownIcon aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove card ${index + 1}`}
                          disabled={cards.fields.length === 1}
                          onClick={() => cards.remove(index)}
                        >
                          <Trash2Icon aria-hidden />
                        </Button>
                      </div>
                    </div>
                    <FieldGroup>
                      <Field data-invalid={!!errors.pillars?.[index]?.title}>
                        <FieldLabel htmlFor={`about-card-${index}-title`}>Title</FieldLabel>
                        <Input
                          id={`about-card-${index}-title`}
                          {...register(`pillars.${index}.title`)}
                        />
                        <FieldError errors={[errors.pillars?.[index]?.title]} />
                      </Field>
                      <Field data-invalid={!!errors.pillars?.[index]?.body}>
                        <FieldLabel htmlFor={`about-card-${index}-body`}>Text</FieldLabel>
                        <Textarea
                          id={`about-card-${index}-body`}
                          rows={3}
                          {...register(`pillars.${index}.body`)}
                        />
                        <FieldError errors={[errors.pillars?.[index]?.body]} />
                      </Field>
                    </FieldGroup>
                  </li>
                ))}
              </ol>
              {cardsError ? <FieldError errors={[{ message: cardsError }]} /> : null}

              <div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={cards.fields.length >= MAX_CARDS}
                  onClick={() => cards.append({ title: "", body: "" })}
                >
                  <PlusIcon aria-hidden />
                  Add a card
                </Button>
                {cards.fields.length >= MAX_CARDS ? (
                  <p className="mt-2 text-xs text-muted-foreground">Six cards at most.</p>
                ) : null}
              </div>
            </FieldGroup>
          </FieldSet>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          Save About page
        </Button>
        {isDirty ? <span className="text-sm text-muted-foreground">Unsaved changes</span> : null}
      </div>
    </form>
  );
}
