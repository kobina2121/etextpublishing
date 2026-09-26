"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { ImageUpload } from "@/components/admin/image-upload";
import { LinkListField } from "@/components/admin/link-list-field";
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { authorSchema, type AuthorInput } from "@/lib/validations/content";
import { createAuthor, updateAuthor } from "@/server/actions/content";
import type { AuthorFormValues } from "@/server/admin/queries";

export function AuthorForm({ initial }: { initial?: AuthorFormValues }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<AuthorInput>({
    resolver: zodResolver(authorSchema),
    defaultValues: initial ?? {
      name: "",
      slug: "",
      role: "",
      bio: "",
      photo: "",
      featured: false,
      socials: [],
    },
  });

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  // useWatch rather than watch(): watch() is not memoizable, which the
  // React compiler lint flags.
  const slugSource = useWatch({ control, name: "name" }) ?? "";

  const onSubmit = async (values: AuthorInput) => {
    setFormError(null);
    const result = initial ? await updateAuthor(initial.id, values) : await createAuthor(values);
    if (result.ok) {
      toast.success(result.message ?? "Saved.");
      router.push("/admin/authors");
      router.refresh();
      return;
    }
    setFormError(result.error);
    for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
      if (name in values && messages[0])
        setError(name as keyof AuthorInput, { message: messages[0] });
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
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldSet>
              <FieldGroup>
                <Field data-invalid={!!errors.name}>
                  <FieldLabel htmlFor="author-name">Name</FieldLabel>
                  <Input id="author-name" {...register("name")} />
                  <FieldError errors={[errors.name]} />
                </Field>

                <Field data-invalid={!!errors.slug}>
                  <FieldLabel htmlFor="author-slug">Slug</FieldLabel>
                  <Controller
                    control={control}
                    name="slug"
                    render={({ field }) => (
                      <SlugField
                        id="author-slug"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        sourceValue={slugSource}
                        prefix="/authors"
                      />
                    )}
                  />
                  <FieldError errors={[errors.slug]} />
                </Field>

                <Field data-invalid={!!errors.role}>
                  <FieldLabel htmlFor="author-role">Role</FieldLabel>
                  <Input id="author-role" placeholder="Novelist" {...register("role")} />
                  <FieldDescription>Shown under the name on author cards.</FieldDescription>
                  <FieldError errors={[errors.role]} />
                </Field>

                <Field data-invalid={!!errors.bio}>
                  <FieldLabel htmlFor="author-bio">Biography</FieldLabel>
                  <Textarea id="author-bio" rows={8} {...register("bio")} />
                  <FieldError errors={[errors.bio]} />
                </Field>

                <Field>
                  <FieldLabel>Links</FieldLabel>
                  <LinkListField control={control} name="socials" addLabel="Add link" />
                  <FieldDescription>
                    Website or social profiles, shown on the author page.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </FieldSet>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Photo</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldSet>
                <FieldGroup>
                  <Field data-invalid={!!errors.photo}>
                    <Controller
                      control={control}
                      name="photo"
                      render={({ field }) => (
                        <ImageUpload
                          label="photo"
                          aspect="aspect-square"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                        />
                      )}
                    />
                    <FieldError errors={[errors.photo]} />
                  </Field>

                  <Field orientation="horizontal">
                    <Controller
                      control={control}
                      name="featured"
                      render={({ field }) => (
                        <Checkbox
                          id="author-featured"
                          checked={!!field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                        />
                      )}
                    />
                    <FieldLabel htmlFor="author-featured">Feature on the homepage</FieldLabel>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? <Spinner /> : null}
              {initial ? "Save changes" : "Create author"}
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
