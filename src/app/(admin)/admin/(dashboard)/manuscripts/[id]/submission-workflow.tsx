"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { DeleteDialog } from "@/components/admin/delete-dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { submissionUpdateSchema, type SubmissionUpdateInput } from "@/lib/validations/content";
import { SUBMISSION_STATUSES } from "@/types/content";
import { deleteSubmission, updateSubmission } from "@/server/actions/inbox";

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  under_review: "Under review",
  accepted: "Accepted",
  rejected: "Rejected",
  archived: "Archived",
};

export function SubmissionWorkflow({
  id,
  title,
  status,
  adminNotes,
}: {
  id: string;
  title: string;
  status: string;
  adminNotes: string;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SubmissionUpdateInput>({
    resolver: zodResolver(submissionUpdateSchema),
    defaultValues: { status: status as SubmissionUpdateInput["status"], adminNotes },
  });

  const onSubmit = async (values: SubmissionUpdateInput) => {
    setFormError(null);
    const result = await updateSubmission(id, values);
    if (result.ok) {
      toast.success(result.message ?? "Saved.");
      router.refresh();
    } else {
      setFormError(result.error);
      toast.error(result.error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldSet>
            <FieldGroup>
              <Field data-invalid={!!errors.status}>
                <FieldLabel htmlFor="sub-status">Status</FieldLabel>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger id="sub-status" onBlur={field.onBlur}>
                        <SelectValue placeholder="Choose…" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBMISSION_STATUSES.map((v) => (
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

              <Field data-invalid={!!errors.adminNotes}>
                <FieldLabel htmlFor="sub-notes">Internal notes</FieldLabel>
                <Textarea id="sub-notes" rows={6} {...register("adminNotes")} />
                <FieldDescription>
                  Only ever shown here. The author never sees these.
                </FieldDescription>
                <FieldError errors={[errors.adminNotes]} />
              </Field>

              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Spinner /> : null}
                  Save
                </Button>
                <DeleteDialog
                  name={title}
                  entity="Submission"
                  action={() => deleteSubmission(id)}
                  onDeleted="/admin/manuscripts"
                />
              </div>
            </FieldGroup>
          </FieldSet>
        </form>
      </CardContent>
    </Card>
  );
}
