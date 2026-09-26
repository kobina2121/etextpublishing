"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, LinkIcon, Trash2Icon, UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  IMAGE_ACCEPT,
  IMAGE_MAX_BYTES,
  IMAGE_MIME_TYPES,
  describeImageLimits,
} from "@/lib/validations/upload";

type UploadResponse = { ok: true; url: string } | { ok: false; error: string };

/**
 * Image picker.
 *
 * Uploads from the device by default, with a URL field behind a toggle for
 * images already hosted elsewhere. The value handed back is always a plain
 * string, so the surrounding form does not care which was used.
 *
 * Uses XHR rather than fetch purely for upload progress, which fetch cannot
 * report.
 */
export function ImageUpload({
  value,
  onChange,
  label = "Image",
  aspect = "aspect-[2/3]",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  aspect?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState(false);
  const [dragging, setDragging] = useState(false);

  const upload = (file: File) => {
    setError(null);

    // Cheap local checks so an obviously wrong file never leaves the machine.
    // The server repeats both against the actual bytes.
    if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError("Choose a PNG, JPEG, WebP or AVIF image.");
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setError(
        `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. ${describeImageLimits()}`,
      );
      return;
    }

    const body = new FormData();
    body.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/uploads");

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    });

    xhr.addEventListener("load", () => {
      setProgress(null);
      let payload: UploadResponse;
      try {
        payload = JSON.parse(xhr.responseText) as UploadResponse;
      } catch {
        setError("The upload failed. Please try again.");
        return;
      }
      if (payload.ok) onChange(payload.url);
      else setError(payload.error);
    });

    xhr.addEventListener("error", () => {
      setProgress(null);
      setError("The upload failed. Please check your connection.");
    });

    setProgress(0);
    xhr.send(body);
  };

  const onFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) upload(file);
  };

  return (
    <div className="space-y-3">
      {value ? (
        <div className="flex items-start gap-4">
          <div className={cn("relative w-28 shrink-0 overflow-hidden border bg-muted", aspect)}>
            <Image src={value} alt="" fill sizes="112px" className="object-cover" unoptimized />
          </div>
          <div className="min-w-0 space-y-2">
            <p className="truncate font-mono text-xs text-muted-foreground">{value}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                <UploadIcon aria-hidden />
                Replace
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  onChange("");
                  setError(null);
                }}
              >
                <Trash2Icon aria-hidden />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            onFiles(event.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-2 border border-dashed px-4 py-8 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border",
          )}
        >
          {progress === null ? (
            <>
              <ImageIcon className="size-6 text-muted-foreground" aria-hidden />
              <p className="text-sm">
                Drag an image here, or{" "}
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="text-primary underline underline-offset-4"
                >
                  choose a file
                </button>
              </p>
              <p className="text-xs text-muted-foreground">{describeImageLimits()}</p>
            </>
          ) : (
            <>
              <Spinner className="size-5" />
              <p className="text-sm">Uploading… {progress}%</p>
              <div className="h-1 w-40 overflow-hidden bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        aria-label={`Upload ${label.toLowerCase()}`}
        onChange={(event) => {
          onFiles(event.target.files);
          // Reset so picking the same file twice still fires a change.
          event.target.value = "";
        }}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div>
        <button
          type="button"
          onClick={() => setShowUrl((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          <LinkIcon className="size-3" aria-hidden />
          {showUrl ? "Hide URL field" : "Or paste a URL"}
        </button>
        {showUrl ? (
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="https://…"
            className="mt-2"
          />
        ) : null}
      </div>
    </div>
  );
}
