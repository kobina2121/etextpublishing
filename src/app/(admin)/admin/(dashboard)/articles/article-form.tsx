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
import { articleSchema, type ArticleInput, type ArticleValues } from "@/lib/validations/content";
import { PUBLICATION_STATUSES } from "@/types/content";
import { createArticle, updateArticle } from "@/server/actions/content";
import type { ArticleFormValues, Option } from "@/server/admin/queries";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export function ArticleForm({
  initial,
  categories,
}: {
  initial?: ArticleFormValues;
  categories: Option[];
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ArticleInput, unknown, ArticleValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: initial
      ? { ...initial, status: initial.status as ArticleInput["status"] }
      : {
          title: "",
          slug: "",
          excerpt: "",
          body: "",
          coverImage: "",
          authorName: "Editorial team",
          category: "",
          tags: "",
          publishedAt: new Date().toISOString().slice(0, 10),
          status: "draft",
          featured: false,
        },
  });

  // useWatch rather than watch(): watch() is not memoizable, which the
  // React compiler lint flags.
  const slugSource = useWatch({ control, name: "title" }) ?? "";

  const onSubmit = async (values: ArticleValues) => {
    setFormError(null);
    const result = initial ? await updateArticle(initial.id, values) : await createArticle(values);
    if (result.ok) {
      toast.success(result.message ?? "Saved.");
      router.push("/admin/articles");
      router.refresh();
      return;
    }
    setFormError(result.error);
    for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
      if (name in values && messages[0])
        setError(name as keyof ArticleInput, { message: messages[0] });
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
        <Card>
          <CardHeader>
            <CardTitle>Article</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldSet>
              <FieldGroup>
                <Field data-invalid={!!errors.title}>
                  <FieldLabel htmlFor="art-title">Title</FieldLabel>
                  <Input id="art-title" {...register("title")} />
                  <FieldError errors={[errors.title]} />
                </Field>

                <Field data-invalid={!!errors.slug}>
                  <FieldLabel htmlFor="art-slug">Slug</FieldLabel>
                  <Controller
                    control={control}
                    name="slug"
                    render={({ field }) => (
                      <SlugField
                        id="art-slug"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        sourceValue={slugSource}
                        prefix="/news"
                      />
                    )}
                  />
                  <FieldError errors={[errors.slug]} />
                </Field>

                <Field data-invalid={!!errors.excerpt}>
                  <FieldLabel htmlFor="art-excerpt">Excerpt</FieldLabel>
                  <Textarea id="art-excerpt" rows={2} {...register("excerpt")} />
                  <FieldError errors={[errors.excerpt]} />
                </Field>

                <Field data-invalid={!!errors.body}>
                  <FieldLabel htmlFor="art-body">Body</FieldLabel>
                  <Textarea
                    id="art-body"
                    rows={16}
                    className="font-mono text-sm"
                    {...register("body")}
                  />
                  <FieldDescription>
                    Separate paragraphs with a blank line. Rich text arrives in a later phase.
                  </FieldDescription>
                  <FieldError errors={[errors.body]} />
                </Field>
              </FieldGroup>
            </FieldSet>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Publishing</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldSet>
                <FieldGroup>
                  <Field data-invalid={!!errors.status}>
                    <FieldLabel htmlFor="art-status">Status</FieldLabel>
                    <Controller
                      control={control}
                      name="status"
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger id="art-status" onBlur={field.onBlur}>
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
                    <FieldError errors={[errors.status]} />
                  </Field>

                  <Field data-invalid={!!errors.category}>
                    <FieldLabel htmlFor="art-category">Category</FieldLabel>
                    <Controller
                      control={control}
                      name="category"
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger id="art-category" onBlur={field.onBlur}>
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

                  <Field data-invalid={!!errors.authorName}>
                    <FieldLabel htmlFor="art-author">Byline</FieldLabel>
                    <Input id="art-author" {...register("authorName")} />
                    <FieldError errors={[errors.authorName]} />
                  </Field>

                  <Field data-invalid={!!errors.publishedAt}>
                    <FieldLabel htmlFor="art-date">Date</FieldLabel>
                    <Input id="art-date" type="date" {...register("publishedAt")} />
                    <FieldError errors={[errors.publishedAt]} />
                  </Field>

                  <Field data-invalid={!!errors.tags}>
                    <FieldLabel htmlFor="art-tags">Tags</FieldLabel>
                    <Input
                      id="art-tags"
                      placeholder="interviews, catalogue"
                      {...register("tags")}
                    />
                    <FieldDescription>Comma separated.</FieldDescription>
                    <FieldError errors={[errors.tags]} />
                  </Field>

                  <Field orientation="horizontal">
                    <Controller
                      control={control}
                      name="featured"
                      render={({ field }) => (
                        <Checkbox
                          id="art-featured"
                          checked={!!field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                        />
                      )}
                    />
                    <FieldLabel htmlFor="art-featured">Featured</FieldLabel>
                  </Field>

                  <Field data-invalid={!!errors.coverImage}>
                    <FieldLabel>Cover image</FieldLabel>
                    <Controller
                      control={control}
                      name="coverImage"
                      render={({ field }) => (
                        <ImageUpload
                          label="cover image"
                          aspect="aspect-video"
                          value={field.value ?? ""}
                          onChange={field.onChange}
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
              {initial ? "Save changes" : "Create article"}
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
