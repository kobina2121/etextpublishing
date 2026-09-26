"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { AdminNavIcon } from "@/components/admin/admin-nav-icon";
import { SlugField } from "@/components/admin/slug-field";
import { SERVICE_ICON_NAMES } from "@/components/public/service-card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { serviceSchema, type ServiceInput } from "@/lib/validations/content";
import { PUBLICATION_STATUSES } from "@/types/content";
import { createService, updateService } from "@/server/actions/content";
import type { ServiceFormValues } from "@/server/admin/queries";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export function ServiceForm({ initial }: { initial?: ServiceFormValues }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ServiceInput>({
    resolver: zodResolver(serviceSchema),
    defaultValues: initial
      ? { ...initial, status: initial.status as ServiceInput["status"] }
      : {
          title: "",
          slug: "",
          summary: "",
          body: "",
          icon: "FileSearch",
          order: 0,
          status: "draft",
        },
  });

  // useWatch rather than watch(): watch() is not memoizable, which the
  // React compiler lint flags.
  const slugSource = useWatch({ control, name: "title" }) ?? "";

  const onSubmit = async (values: ServiceInput) => {
    setFormError(null);
    const result = initial ? await updateService(initial.id, values) : await createService(values);
    if (result.ok) {
      toast.success(result.message ?? "Saved.");
      router.push("/admin/services");
      router.refresh();
      return;
    }
    setFormError(result.error);
    for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
      if (name in values && messages[0])
        setError(name as keyof ServiceInput, { message: messages[0] });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-3xl space-y-6">
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Service</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldSet>
            <FieldGroup>
              <Field data-invalid={!!errors.title}>
                <FieldLabel htmlFor="svc-title">Title</FieldLabel>
                <Input id="svc-title" {...register("title")} />
                <FieldError errors={[errors.title]} />
              </Field>

              <Field data-invalid={!!errors.slug}>
                <FieldLabel htmlFor="svc-slug">Slug</FieldLabel>
                <Controller
                  control={control}
                  name="slug"
                  render={({ field }) => (
                    <SlugField
                      id="svc-slug"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      sourceValue={slugSource}
                      prefix="/services"
                    />
                  )}
                />
                <FieldError errors={[errors.slug]} />
              </Field>

              <Field data-invalid={!!errors.summary}>
                <FieldLabel htmlFor="svc-summary">Summary</FieldLabel>
                <Textarea id="svc-summary" rows={2} {...register("summary")} />
                <FieldDescription>One line, shown on the services grid.</FieldDescription>
                <FieldError errors={[errors.summary]} />
              </Field>

              <Field data-invalid={!!errors.body}>
                <FieldLabel htmlFor="svc-body">Description</FieldLabel>
                <Textarea id="svc-body" rows={8} {...register("body")} />
                <FieldError errors={[errors.body]} />
              </Field>

              <Field data-invalid={!!errors.icon}>
                <FieldLabel>Icon</FieldLabel>
                <Controller
                  control={control}
                  name="icon"
                  render={({ field }) => (
                    <div className="flex flex-wrap gap-2">
                      {SERVICE_ICON_NAMES.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => field.onChange(name)}
                          aria-label={name}
                          aria-pressed={field.value === name}
                          className={cn(
                            "flex size-10 items-center justify-center border transition-colors",
                            field.value === name
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-primary",
                          )}
                        >
                          <AdminNavIcon name={name} className="size-4" />
                        </button>
                      ))}
                    </div>
                  )}
                />
                <FieldDescription>
                  Chosen from a fixed set so the bundle stays small.
                </FieldDescription>
                <FieldError errors={[errors.icon]} />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field data-invalid={!!errors.order}>
                  <FieldLabel htmlFor="svc-order">Order</FieldLabel>
                  <Input id="svc-order" type="number" min={0} {...register("order")} />
                  <FieldDescription>Lower numbers appear first.</FieldDescription>
                  <FieldError errors={[errors.order]} />
                </Field>

                <Field data-invalid={!!errors.status}>
                  <FieldLabel htmlFor="svc-status">Status</FieldLabel>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger id="svc-status" onBlur={field.onBlur}>
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
              </div>
            </FieldGroup>
          </FieldSet>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          {initial ? "Save changes" : "Create service"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
