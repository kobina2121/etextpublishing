"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { ImageUpload } from "@/components/admin/image-upload";
import { SlugField } from "@/components/admin/slug-field";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { journalSchema, type JournalInput, type JournalValues } from "@/lib/validations/journal";
import { createJournal, updateJournal } from "@/server/actions/journals";

import { JournalPdfField } from "./journal-pdf-field";

const EMPTY: JournalInput = {
  title: "",
  slug: "",
  authors: "",
  volume: "",
  issue: "",
  publishedAt: new Date().toISOString().slice(0, 10),
  abstract: "",
  keywords: "",
  coverImage: "",
  pdfKey: "",
  pdfName: "",
  pdfSize: 0,
  status: "draft",
};

export function JournalForm({
  initial,
  storage,
  maxBytes,
}: {
  initial?: JournalInput & { id: string };
  storage: "blob" | "server";
  maxBytes: number;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<JournalInput, unknown, JournalValues>({
    resolver: zodResolver(journalSchema),
    defaultValues: initial ?? EMPTY,
  });

  const [title, pdfKey, pdfName, pdfSize] = useWatch({
    control,
    name: ["title", "pdfKey", "pdfName", "pdfSize"],
  });
  const pdf = pdfKey
    ? { key: pdfKey, fileName: pdfName || "journal.pdf", size: Number(pdfSize ?? 0) }
    : null;

  const onSubmit = async (values: JournalValues) => {
    setFormError(null);
    const result = initial ? await updateJournal(initial.id, values) : await createJournal(values);
    if (result.ok) {
      toast.success(result.message ?? "Saved.");
      router.push("/admin/journals");
      router.refresh();
      return;
    }
    setFormError(result.error);
    for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
      if (messages[0]) setError(name as keyof JournalInput, { message: messages[0] });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <FieldSet>
                <FieldGroup>
                  <Field data-invalid={!!errors.title}>
                    <FieldLabel htmlFor="jr-title">Title</FieldLabel>
                    <Input id="jr-title" {...register("title")} />
                    <FieldError errors={[errors.title]} />
                  </Field>

                  <Field data-invalid={!!errors.slug}>
                    <FieldLabel htmlFor="jr-slug">Slug</FieldLabel>
                    <Controller
                      control={control}
                      name="slug"
                      render={({ field }) => (
                        <SlugField
                          id="jr-slug"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          sourceValue={title ?? ""}
                          prefix="/journals/"
                        />
                      )}
                    />
                    <FieldError errors={[errors.slug]} />
                  </Field>

                  <Field data-invalid={!!errors.authors}>
                    <FieldLabel htmlFor="jr-authors">Authors</FieldLabel>
                    <Input id="jr-authors" {...register("authors")} />
                    <FieldDescription>Separate names with commas.</FieldDescription>
                    <FieldError errors={[errors.authors]} />
                  </Field>

                  <Field data-invalid={!!errors.abstract}>
                    <FieldLabel htmlFor="jr-abstract">Abstract</FieldLabel>
                    <Textarea id="jr-abstract" rows={9} {...register("abstract")} />
                    <FieldDescription>Leave a blank line between paragraphs.</FieldDescription>
                    <FieldError errors={[errors.abstract]} />
                  </Field>

                  <Field data-invalid={!!errors.keywords}>
                    <FieldLabel htmlFor="jr-keywords">Keywords (optional)</FieldLabel>
                    <Input id="jr-keywords" {...register("keywords")} />
                    <FieldDescription>
                      Separate with commas. Readers can search by these.
                    </FieldDescription>
                    <FieldError errors={[errors.keywords]} />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Full text</CardTitle>
            </CardHeader>
            <CardContent>
              <Field data-invalid={!!errors.pdfKey}>
                <JournalPdfField
                  value={pdf}
                  storage={storage}
                  maxBytes={maxBytes}
                  invalid={!!errors.pdfKey}
                  onChange={(next) => {
                    setValue("pdfKey", next?.key ?? "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    setValue("pdfName", next?.fileName ?? "", { shouldDirty: true });
                    setValue("pdfSize", next?.size ?? 0, { shouldDirty: true });
                  }}
                />
                <FieldDescription>
                  Readers open this in their browser or download it, free.
                </FieldDescription>
                <FieldError errors={[errors.pdfKey]} />
              </Field>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <FieldSet>
                <FieldGroup>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Field orientation="horizontal">
                        <Switch
                          id="jr-published"
                          checked={field.value === "published"}
                          onCheckedChange={(on) => field.onChange(on ? "published" : "draft")}
                        />
                        <FieldLabel htmlFor="jr-published">Published</FieldLabel>
                      </Field>
                    )}
                  />
                  <FieldDescription>
                    Drafts are hidden from the site. Publishing needs the PDF.
                  </FieldDescription>

                  <div className="grid grid-cols-2 gap-4">
                    <Field data-invalid={!!errors.volume}>
                      <FieldLabel htmlFor="jr-volume">Volume</FieldLabel>
                      <Input id="jr-volume" {...register("volume")} />
                      <FieldError errors={[errors.volume]} />
                    </Field>
                    <Field data-invalid={!!errors.issue}>
                      <FieldLabel htmlFor="jr-issue">Issue</FieldLabel>
                      <Input id="jr-issue" {...register("issue")} />
                      <FieldError errors={[errors.issue]} />
                    </Field>
                  </div>

                  <Field data-invalid={!!errors.publishedAt}>
                    <FieldLabel htmlFor="jr-date">Publication date</FieldLabel>
                    <Input id="jr-date" type="date" {...register("publishedAt")} />
                    <FieldError errors={[errors.publishedAt]} />
                  </Field>

                  <Field data-invalid={!!errors.coverImage}>
                    <FieldLabel>Cover (optional)</FieldLabel>
                    <Controller
                      control={control}
                      name="coverImage"
                      render={({ field }) => (
                        <ImageUpload
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          label="journal cover"
                        />
                      )}
                    />
                    <FieldError errors={[errors.coverImage]} />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? <Spinner /> : null}
              {initial ? "Save changes" : "Create journal entry"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
