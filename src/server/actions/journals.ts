"use server";

import { revalidatePath } from "next/cache";

import { deleteImageByUrl } from "@/lib/storage/images";
import { deleteJournalPdf } from "@/lib/storage/journal-files";
import { journalSchema, splitList, type JournalValues } from "@/lib/validations/journal";
import { Journal } from "@/models";
import {
  isDuplicateKeyError,
  toFieldErrors,
  withAdmin,
  type ActionResult,
} from "@/server/actions/shared";

function toDocument(values: JournalValues) {
  return {
    title: values.title,
    slug: values.slug,
    authors: splitList(values.authors),
    volume: values.volume || undefined,
    issue: values.issue || undefined,
    publishedAt: values.publishedAt,
    abstract: values.abstract,
    keywords: splitList(values.keywords ?? ""),
    coverImage: values.coverImage || undefined,
    pdfKey: values.pdfKey || undefined,
    pdfName: values.pdfName || undefined,
    pdfSize: values.pdfSize || undefined,
    status: values.status,
  };
}

function refresh(...slugs: (string | undefined)[]) {
  revalidatePath("/journals");
  for (const slug of slugs) if (slug) revalidatePath(`/journals/${slug}`);
  revalidatePath("/sitemap.xml");
}

const slugTaken: ActionResult = {
  ok: false,
  error: "That slug is already in use.",
  fieldErrors: { slug: ["Already taken."] },
};

export async function createJournal(raw: unknown): Promise<ActionResult> {
  return withAdmin(async () => {
    const parsed = journalSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Please correct the highlighted fields.",
        fieldErrors: toFieldErrors(parsed.error),
      };
    }
    try {
      const created = await Journal.create(toDocument(parsed.data));
      refresh(created.slug);
      return { ok: true, message: "Journal entry created.", id: created._id.toString() };
    } catch (error) {
      if (isDuplicateKeyError(error)) return slugTaken;
      throw error;
    }
  });
}

export async function updateJournal(id: string, raw: unknown): Promise<ActionResult> {
  return withAdmin(async () => {
    const parsed = journalSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Please correct the highlighted fields.",
        fieldErrors: toFieldErrors(parsed.error),
      };
    }
    const previous = await Journal.findById(id, { slug: 1, pdfKey: 1, coverImage: 1 }).lean<{
      slug: string;
      pdfKey?: string;
      coverImage?: string;
    } | null>();
    if (!previous) return { ok: false, error: "That journal entry no longer exists." };

    try {
      await Journal.findByIdAndUpdate(
        id,
        { $set: toDocument(parsed.data) },
        { runValidators: true },
      );
    } catch (error) {
      if (isDuplicateKeyError(error)) return slugTaken;
      throw error;
    }

    // Replaced files are no longer used anywhere.
    if (previous.pdfKey && previous.pdfKey !== parsed.data.pdfKey) {
      await deleteJournalPdf(previous.pdfKey);
    }
    if (previous.coverImage && previous.coverImage !== parsed.data.coverImage) {
      await deleteImageByUrl(previous.coverImage);
    }

    refresh(previous.slug, parsed.data.slug);
    return { ok: true, message: "Journal entry saved." };
  });
}

export async function setJournalStatus(
  id: string,
  status: "draft" | "published",
): Promise<ActionResult> {
  return withAdmin(async () => {
    const journal = await Journal.findById(id);
    if (!journal) return { ok: false, error: "That journal entry no longer exists." };
    if (status === "published" && !journal.pdfKey) {
      return { ok: false, error: "Upload the PDF before publishing." };
    }
    journal.status = status;
    await journal.save();
    refresh(journal.slug);
    return { ok: true, message: status === "published" ? "Published." : "Moved to drafts." };
  });
}

export async function deleteJournal(id: string): Promise<ActionResult> {
  return withAdmin(async () => {
    const deleted = await Journal.findByIdAndDelete(id);
    if (!deleted) return { ok: false, error: "That journal entry no longer exists." };
    await deleteJournalPdf(deleted.pdfKey);
    await deleteImageByUrl(deleted.coverImage);
    refresh(deleted.slug);
    return { ok: true, message: "Journal entry deleted." };
  });
}
