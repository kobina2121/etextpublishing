"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import slugify from "slugify";
import { WandSparklesIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { publicationSchema, type PublicationInput } from "@/lib/validations/publication";
import { PUBLICATION_FORMATS, PUBLICATION_STATUSES } from "@/types/content";
import { createPublication, updatePublication } from "@/server/actions/publications";
import type { Option, PublicationFormValues } from "@/server/admin/queries";

const FORMAT_LABELS: Record<string, string> = {
  paperback: "Paperback",
  hardcover: "Hardcover",
  ebook: "E-book",
  audiobook: "Audiobook",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export function PublicationForm({
  initial,
  authors,
  categories,
}: {
  initial?: PublicationFormValues;
  authors: Option[];
  categories: Option[];
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<PublicationInput>({
    resolver: zodResolver(publicationSchema),
    defaultValues: initial
      ? {
          ...initial,
          format: initial.format as PublicationInput["format"],
          status: initial.status as PublicationInput["status"],
        }
      : {
          title: "",
          slug: "",
          author: "",
          category: "",
          isbn: "",
          coverImage: "",
          excerpt: "",
          description: "",
          publicationDate: new Date().toISOString().slice(0, 10),
          format: "paperback",
          pages: 1,
          featured: false,
          status: "draft",
        },
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  const fillSlug = () => {
    const title = getValues("title");
    if (!title) return;
    setValue("slug", slugify(title, { lower: true, strict: true, trim: true }), {
      shouldValidate: true,
    });
  };

  const onSubmit = async (values: PublicationInput) => {
    setFormError(null);
    const result = initial
      ? await updatePublication(initial.id, values)
      : await createPublication(values);

    if (result.ok) {
      toast.success(result.message ?? "Saved.");
      router.push("/admin/publications");
      router.refresh();
      return;
    }

    setFormError(result.error);
    // Surface server-side validation on the offending field, not just as a banner.
    for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
      if (name in values && messages[0]) {
        setError(name as keyof PublicationInput, { message: messages[0] });
      }
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
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldSet>
                <FieldGroup>
                  <Field data-invalid={!!errors.title}>
                    <FieldLabel htmlFor="pub-title">Title</FieldLabel>
                    <Input
                      id="pub-title"
                      {...register("title")}
                      onBlur={() => {
                        if (!getValues("slug")) fillSlug();
                      }}
                    />
                    <FieldError errors={[errors.title]} />
                  </Field>

                  <Field data-invalid={!!errors.slug}>
                    <FieldLabel htmlFor="pub-slug">Slug</FieldLabel>
                    <div className="flex gap-2">
                      <Input id="pub-slug" className="font-mono" {...register("slug")} />
                      <Button type="button" variant="outline" onClick={fillSlug}>
                        <WandSparklesIcon aria-hidden />
                        <span className="sr-only sm:not-sr-only">From title</span>
                      </Button>
                    </div>
                    <FieldDescription>
                      The public URL: /publications/<span className="font-mono">slug</span>.
                      Changing it breaks existing links.
                    </FieldDescription>
                    <FieldError errors={[errors.slug]} />
                  </Field>

                  <Field data-invalid={!!errors.excerpt}>
                    <FieldLabel htmlFor="pub-excerpt">Excerpt</FieldLabel>
                    <Textarea id="pub-excerpt" rows={2} {...register("excerpt")} />
                    <FieldDescription>One line, shown on listing cards.</FieldDescription>
                    <FieldError errors={[errors.excerpt]} />
                  </Field>

                  <Field data-invalid={!!errors.description}>
                    <FieldLabel htmlFor="pub-description">Description</FieldLabel>
                    <Textarea id="pub-description" rows={8} {...register("description")} />
                    <FieldError errors={[errors.description]} />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Edition</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldSet>
                <FieldGroup>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field data-invalid={!!errors.isbn}>
                      <FieldLabel htmlFor="pub-isbn">ISBN</FieldLabel>
                      <Input id="pub-isbn" className="font-mono" {...register("isbn")} />
                      <FieldError errors={[errors.isbn]} />
                    </Field>

                    <Field data-invalid={!!errors.pages}>
                      <FieldLabel htmlFor="pub-pages">Pages</FieldLabel>
                      <Input
                        id="pub-pages"
                        type="number"
                        min={1}
                        {...register("pages", { valueAsNumber: true })}
                      />
                      <FieldError errors={[errors.pages]} />
                    </Field>

                    <Field data-invalid={!!errors.format}>
                      <FieldLabel htmlFor="pub-format">Format</FieldLabel>
                      <Controller
                        control={control}
                        name="format"
                        render={({ field }) => (
                          <Select value={field.value ?? ""} onValueChange={field.onChange}>
                            <SelectTrigger id="pub-format" onBlur={field.onBlur}>
                              <SelectValue placeholder="Choose…" />
                            </SelectTrigger>
                            <SelectContent>
                              {PUBLICATION_FORMATS.map((v) => (
                                <SelectItem key={v} value={v}>
                                  {FORMAT_LABELS[v] ?? v}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <FieldError errors={[errors.format]} />
                    </Field>

                    <Field data-invalid={!!errors.publicationDate}>
                      <FieldLabel htmlFor="pub-date">Publication date</FieldLabel>
                      <Input id="pub-date" type="date" {...register("publicationDate")} />
                      <FieldError errors={[errors.publicationDate]} />
                    </Field>
                  </div>

                  <Field data-invalid={!!errors.coverImage}>
                    <FieldLabel htmlFor="pub-cover">Cover image URL</FieldLabel>
                    <Input id="pub-cover" placeholder="https://…" {...register("coverImage")} />
                    <FieldDescription>
                      Optional. Uploads replace this in a later phase; the card falls back to a
                      typographic cover meanwhile.
                    </FieldDescription>
                    <FieldError errors={[errors.coverImage]} />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Publishing</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldSet>
                <FieldGroup>
                  <Field data-invalid={!!errors.status}>
                    <FieldLabel htmlFor="pub-status">Status</FieldLabel>
                    <Controller
                      control={control}
                      name="status"
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger id="pub-status" onBlur={field.onBlur}>
                            <SelectValue placeholder="Choose…" />
                          </SelectTrigger>
                          <SelectContent>
                            {PUBLICATION_STATUSES.map((v) => (
                              <SelectItem key={v} value={v}>
                                {STATUS_LABELS[v] ?? v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldDescription>
                      Only published titles appear on the website.
                    </FieldDescription>
                    <FieldError errors={[errors.status]} />
                  </Field>

                  <Field orientation="horizontal">
                    <Controller
                      control={control}
                      name="featured"
                      render={({ field }) => (
                        <Checkbox
                          id="pub-featured"
                          checked={!!field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                        />
                      )}
                    />
                    <FieldLabel htmlFor="pub-featured">Feature on the homepage</FieldLabel>
                  </Field>

                  <Field data-invalid={!!errors.author}>
                    <FieldLabel htmlFor="pub-author">Author</FieldLabel>
                    <Controller
                      control={control}
                      name="author"
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger id="pub-author" onBlur={field.onBlur}>
                            <SelectValue placeholder="Choose…" />
                          </SelectTrigger>
                          <SelectContent>
                            {authors.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError errors={[errors.author]} />
                  </Field>

                  <Field data-invalid={!!errors.category}>
                    <FieldLabel htmlFor="pub-category">Category</FieldLabel>
                    <Controller
                      control={control}
                      name="category"
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger id="pub-category" onBlur={field.onBlur}>
                            <SelectValue placeholder="Choose…" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError errors={[errors.category]} />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? <Spinner /> : null}
              {initial ? "Save changes" : "Create publication"}
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
