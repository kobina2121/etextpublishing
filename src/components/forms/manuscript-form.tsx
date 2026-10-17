"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { upload } from "@vercel/blob/client";
import { UploadIcon } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  GENRES,
  MANUSCRIPT_EXTENSIONS,
  manuscriptSchema,
  megabytes,
  validateManuscriptFile,
  type ManuscriptInput,
} from "@/lib/validations/manuscript";
import { PUBLICATION_FORMATS } from "@/types/content";

const FORMAT_LABELS: Record<string, string> = {
  paperback: "Paperback",
  hardcover: "Hardcover",
  ebook: "E-book",
  audiobook: "Audiobook",
};

/** Lowercase, hyphenated, no path parts — the name the file gets in storage. */
function storageName(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const ext = dot > 0 ? fileName.slice(dot).toLowerCase() : "";
  const base = (dot > 0 ? fileName.slice(0, dot) : fileName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `manuscripts/${base || "manuscript"}${ext}`;
}

/**
 * `storage` is decided on the server. With Vercel Blob the file goes straight
 * from the browser to storage, which is what allows 10 MB; otherwise it is
 * sent with the form and capped lower.
 */
export function ManuscriptForm({
  storage = "server",
  maxBytes,
}: {
  storage?: "blob" | "server";
  maxBytes: number;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  // Remounting is the only way to clear a file input; its value is read-only.
  const [fileInputKey, setFileInputKey] = useState(0);

  const form = useForm<ManuscriptInput>({
    resolver: zodResolver(manuscriptSchema),
    defaultValues: {
      authorName: "",
      email: "",
      phone: "",
      title: "",
      synopsis: "",
      website: "",
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = form;

  const onFileChange = (selected: File | null) => {
    setFile(selected);
    setFileError(validateManuscriptFile(selected, maxBytes));
  };

  const onSubmit = async (values: ManuscriptInput) => {
    const problem = validateManuscriptFile(file, maxBytes);
    if (problem || !file) {
      setFileError(problem);
      return;
    }

    const body = new FormData();
    for (const [name, value] of Object.entries(values)) {
      if (value !== undefined && value !== null) body.set(name, String(value));
    }

    if (storage === "blob") {
      // Straight to storage first; the form then says where the file went.
      try {
        setUploadPercent(0);
        const blob = await upload(storageName(file.name), file, {
          access: "private",
          handleUploadUrl: "/api/submissions/manuscript/upload",
          multipart: file.size > 5 * 1024 * 1024,
          onUploadProgress: ({ percentage }) => setUploadPercent(Math.round(percentage)),
        });
        body.set("blobPathname", blob.pathname);
        body.set("fileName", file.name);
      } catch (error) {
        setUploadPercent(null);
        toast.error("Your manuscript could not be uploaded.", {
          description:
            error instanceof Error && error.message
              ? error.message.replace(/^Vercel Blob: /, "")
              : "Please try again.",
        });
        return;
      }
      setUploadPercent(null);
    } else {
      body.set("file", file);
    }

    let result: { ok: boolean; error?: string };
    try {
      const response = await fetch("/api/submissions/manuscript", { method: "POST", body });
      result = await response.json();
    } catch {
      result = { ok: false, error: "We could not reach the server. Please try again." };
    }

    if (!result.ok) {
      toast.error("Your manuscript was not submitted.", {
        description: result.error ?? "Please try again.",
      });
      return;
    }

    toast.success("Manuscript received.", {
      description: "Our editorial team will review it and be in touch.",
    });
    reset();
    setFile(null);
    setFileInputKey((key) => key + 1);
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
            <Field data-invalid={!!errors.authorName}>
              <FieldLabel htmlFor="ms-name">Your name</FieldLabel>
              <Input id="ms-name" autoComplete="name" {...register("authorName")} />
              <FieldError errors={[errors.authorName]} />
            </Field>

            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="ms-email">Email</FieldLabel>
              <Input id="ms-email" type="email" autoComplete="email" {...register("email")} />
              <FieldError errors={[errors.email]} />
            </Field>
          </div>

          <Field data-invalid={!!errors.phone}>
            <FieldLabel htmlFor="ms-phone">Phone (optional)</FieldLabel>
            <Input id="ms-phone" type="tel" autoComplete="tel" {...register("phone")} />
            <FieldError errors={[errors.phone]} />
          </Field>

          <Field data-invalid={!!errors.title}>
            <FieldLabel htmlFor="ms-title">Manuscript title</FieldLabel>
            <Input id="ms-title" {...register("title")} />
            <FieldError errors={[errors.title]} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field data-invalid={!!errors.genre}>
              <FieldLabel htmlFor="ms-genre">Genre</FieldLabel>
              <Controller
                control={control}
                name="genre"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="ms-genre" onBlur={field.onBlur}>
                      <SelectValue placeholder="Choose…" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENRES.map((genre) => (
                        <SelectItem key={genre} value={genre}>
                          {genre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.genre]} />
            </Field>

            <Field data-invalid={!!errors.preferredFormat}>
              <FieldLabel htmlFor="ms-format">Preferred format (optional)</FieldLabel>
              <Controller
                control={control}
                name="preferredFormat"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="ms-format" onBlur={field.onBlur}>
                      <SelectValue placeholder="Choose…" />
                    </SelectTrigger>
                    <SelectContent>
                      {PUBLICATION_FORMATS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {FORMAT_LABELS[value] ?? value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.preferredFormat]} />
            </Field>

            <Field data-invalid={!!errors.wordCount}>
              <FieldLabel htmlFor="ms-words">Word count</FieldLabel>
              <Input
                id="ms-words"
                type="number"
                inputMode="numeric"
                min={500}
                {...register("wordCount", { valueAsNumber: true })}
              />
              <FieldError errors={[errors.wordCount]} />
            </Field>
          </div>

          <Field data-invalid={!!errors.synopsis}>
            <FieldLabel htmlFor="ms-synopsis">Synopsis</FieldLabel>
            <Textarea id="ms-synopsis" rows={6} {...register("synopsis")} />
            <FieldDescription>
              A short summary of the work, its audience and where it sits on our lists.
            </FieldDescription>
            <FieldError errors={[errors.synopsis]} />
          </Field>

          <Field data-invalid={!!fileError}>
            <FieldLabel htmlFor="ms-file">Manuscript file</FieldLabel>
            <Input
              key={fileInputKey}
              id="ms-file"
              type="file"
              accept={MANUSCRIPT_EXTENSIONS.join(",")}
              onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
              className="h-auto py-2"
            />
            <FieldDescription>
              PDF, DOC or DOCX, up to {megabytes(maxBytes)} MB.{" "}
              {file ? `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)` : null}
            </FieldDescription>
            {fileError ? <FieldError errors={[{ message: fileError }]} /> : null}
          </Field>

          <div>
            <Button
              type="submit"
              size="xl"
              disabled={isSubmitting}
              className="font-semibold tracking-[0.1em] uppercase"
            >
              {isSubmitting ? <Spinner /> : <UploadIcon aria-hidden />}
              {uploadPercent !== null ? `Uploading… ${uploadPercent}%` : "Submit manuscript"}
            </Button>
          </div>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}
