"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { SlugField } from "@/components/admin/slug-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { categorySchema, type CategoryInput } from "@/lib/validations/content";
import { createCategory, updateCategory } from "@/server/actions/content";

type Initial = { id: string; name: string; slug: string; description: string };

export function CategoryForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: initial ?? { name: "", slug: "", description: "" },
  });

  // useWatch rather than watch(): watch() is not memoizable, which the
  // React compiler lint flags.
  const slugSource = useWatch({ control, name: "name" }) ?? "";

  const onSubmit = async (values: CategoryInput) => {
    setFormError(null);
    const result = initial
      ? await updateCategory(initial.id, values)
      : await createCategory(values);
    if (result.ok) {
      toast.success(result.message ?? "Saved.");
      router.push("/admin/categories");
      router.refresh();
      return;
    }
    setFormError(result.error);
    for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
      if (name in values && messages[0])
        setError(name as keyof CategoryInput, { message: messages[0] });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-2xl space-y-6">
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <FieldSet>
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="cat-name">Name</FieldLabel>
                <Input id="cat-name" {...register("name")} />
                <FieldError errors={[errors.name]} />
              </Field>

              <Field data-invalid={!!errors.slug}>
                <FieldLabel htmlFor="cat-slug">Slug</FieldLabel>
                <Controller
                  control={control}
                  name="slug"
                  render={({ field }) => (
                    <SlugField
                      id="cat-slug"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      sourceValue={slugSource}
                      prefix="/publications?category="
                    />
                  )}
                />
                <FieldError errors={[errors.slug]} />
              </Field>

              <Field data-invalid={!!errors.description}>
                <FieldLabel htmlFor="cat-description">Description</FieldLabel>
                <Textarea id="cat-description" rows={3} {...register("description")} />
                <FieldError errors={[errors.description]} />
              </Field>
            </FieldGroup>
          </FieldSet>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          {initial ? "Save changes" : "Create category"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
