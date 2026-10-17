"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { FileTextIcon, UploadIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type Stored = { key: string; fileName: string; size: number };

/** Lowercase, hyphenated — the PDF's name in storage. */
function storageName(fileName: string): string {
  const base = fileName
    .replace(/\.pdf$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `journals/${base || "journal"}.pdf`;
}

/**
 * Uploads a journal's PDF and reports back a storage key.
 *
 * With Vercel Blob the file goes straight from the browser to storage; the
 * server then checks it is a real PDF. Without Blob it is sent to our server,
 * which caps it at 4 MB.
 */
export function JournalPdfField({
  value,
  onChange,
  storage,
  maxBytes,
  invalid,
}: {
  value: Stored | null;
  onChange: (value: Stored | null) => void;
  storage: "blob" | "server";
  maxBytes: number;
  invalid?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const maxMb = maxBytes / 1024 / 1024;

  const send = async (file: File) => {
    setError(null);
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      setError("Choose a PDF file.");
      return;
    }
    if (file.size > maxBytes) {
      setError(`That PDF is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is ${maxMb} MB.`);
      return;
    }

    setPercent(0);
    try {
      let response: Response;
      if (storage === "blob") {
        const blob = await upload(storageName(file.name), file, {
          access: "private",
          handleUploadUrl: "/api/admin/journals/upload",
          multipart: file.size > 5 * 1024 * 1024,
          onUploadProgress: ({ percentage }) => setPercent(Math.round(percentage)),
        });
        response = await fetch("/api/admin/journals/file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blobPathname: blob.pathname, fileName: file.name }),
        });
      } else {
        const body = new FormData();
        body.set("file", file);
        response = await fetch("/api/admin/journals/file", { method: "POST", body });
      }
      const result = (await response.json()) as
        ({ ok: true } & Stored) | { ok: false; error: string };
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onChange({ key: result.key, fileName: result.fileName, size: result.size });
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message
          ? caught.message.replace(/^Vercel Blob: /, "")
          : "The upload failed. Please try again.",
      );
    } finally {
      setPercent(null);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div
      className={`border border-dashed p-4 ${invalid || error ? "border-destructive" : "border-border"}`}
    >
      {value ? (
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <FileTextIcon className="size-5 shrink-0 text-primary" aria-hidden />
            <span className="truncate">{value.fileName}</span>
            <span className="shrink-0 text-muted-foreground">
              {(value.size / 1024 / 1024).toFixed(1)} MB
            </span>
          </span>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => input.current?.click()}
            >
              Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove PDF"
              onClick={() => onChange(null)}
            >
              <XIcon aria-hidden />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-4 text-center text-sm">
          <Button
            type="button"
            variant="outline"
            disabled={percent !== null}
            onClick={() => input.current?.click()}
          >
            {percent !== null ? <Spinner /> : <UploadIcon aria-hidden />}
            {percent !== null ? `Uploading… ${percent}%` : "Upload the PDF"}
          </Button>
          <span className="text-xs text-muted-foreground">PDF only, up to {maxMb} MB.</span>
        </div>
      )}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        aria-label="Journal PDF"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void send(file);
        }}
      />
    </div>
  );
}
