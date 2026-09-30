"use server";

import { revalidatePath } from "next/cache";
import slugify from "slugify";

import { toMinorUnits } from "@/lib/money";

/**
 * Form fields to stored editions.
 *
 * The form asks for availability, a price in major units and (for print) a
 * stock count; the document stores integer minor units. Turning an edition off
 * keeps its price, so an admin who toggles it back does not have to retype it.
 */
function toEditions(values: {
  currency: string;
  hardcopyAvailable: boolean;
  hardcopyPriceMajor: number;
  hardcopyStock: number;
  softcopyAvailable: boolean;
  softcopyPriceMajor: number;
}) {
  return {
    hardcopy: {
      available: values.hardcopyAvailable,
      price: toMinorUnits(values.hardcopyPriceMajor, values.currency),
      stockQuantity: values.hardcopyStock,
    },
    softcopy: {
      available: values.softcopyAvailable,
      price: toMinorUnits(values.softcopyPriceMajor, values.currency),
      // A download cannot run out.
      stockQuantity: 0,
    },
  };
}

import { deleteImageByUrl } from "@/lib/storage/images";
import { publicationSchema } from "@/lib/validations/publication";
import { Author, Publication } from "@/models";
import {
  isDuplicateKeyError,
  toFieldErrors,
  withAdmin,
  type ActionResult,
} from "@/server/actions/shared";

/** Suggests a slug from a title. Exposed so the form can prefill it. */
export async function suggestSlug(title: string): Promise<string> {
  return slugify(title, { lower: true, strict: true, trim: true });
}

async function refresh(slug?: string, authorId?: string) {
  revalidatePath("/");
  revalidatePath("/publications");
  if (slug) revalidatePath(`/publications/${slug}`);
  if (authorId) {
    const author = await Author.findById(authorId, { slug: 1 }).lean<{ slug: string } | null>();
    if (author) revalidatePath(`/authors/${author.slug}`);
  }
}

export async function createPublication(raw: unknown): Promise<ActionResult> {
  return withAdmin(async () => {
    const parsed = publicationSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Please correct the highlighted fields.",
        fieldErrors: toFieldErrors(parsed.error),
      };
    }

    const {
      coverImage,
      currency,
      hardcopyAvailable,
      hardcopyPriceMajor,
      hardcopyStock,
      softcopyAvailable,
      softcopyPriceMajor,
      ...rest
    } = parsed.data;

    try {
      const created = await Publication.create({
        ...rest,
        currency,
        editions: toEditions({
          currency,
          hardcopyAvailable,
          hardcopyPriceMajor,
          hardcopyStock,
          softcopyAvailable,
          softcopyPriceMajor,
        }),
        ...(coverImage ? { coverImage } : {}),
      });
      await refresh(created.slug, created.author.toString());
      return { ok: true, message: "Publication created.", id: created._id.toString() };
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return {
          ok: false,
          error: "That slug is already in use.",
          fieldErrors: { slug: ["Already taken."] },
        };
      }
      throw error;
    }
  });
}

export async function updatePublication(id: string, raw: unknown): Promise<ActionResult> {
  return withAdmin(async () => {
    const parsed = publicationSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Please correct the highlighted fields.",
        fieldErrors: toFieldErrors(parsed.error),
      };
    }

    // Captured before the write so a slug change also refreshes the old URL,
    // which would otherwise keep serving a stale page.
    const previous = await Publication.findById(id, {
      slug: 1,
      author: 1,
      coverImage: 1,
    }).lean<{
      slug: string;
      author: { toString(): string };
      coverImage?: string;
    } | null>();
    if (!previous) return { ok: false, error: "That publication no longer exists." };

    const {
      coverImage,
      currency,
      hardcopyAvailable,
      hardcopyPriceMajor,
      hardcopyStock,
      softcopyAvailable,
      softcopyPriceMajor,
      ...rest
    } = parsed.data;

    try {
      const updated = await Publication.findByIdAndUpdate(
        id,
        {
          $set: {
            ...rest,
            currency,
            editions: toEditions({
              currency,
              hardcopyAvailable,
              hardcopyPriceMajor,
              hardcopyStock,
              softcopyAvailable,
              softcopyPriceMajor,
            }),
            coverImage: coverImage || undefined,
          },
        },
        { returnDocument: "after", runValidators: true },
      );
      if (!updated) return { ok: false, error: "That publication no longer exists." };

      // Drop the old upload once the new value is safely persisted, so a
      // replaced cover does not linger in the database forever.
      if (previous.coverImage && previous.coverImage !== updated.coverImage) {
        await deleteImageByUrl(previous.coverImage);
      }

      await refresh(updated.slug, updated.author.toString());
      if (previous.slug !== updated.slug) revalidatePath(`/publications/${previous.slug}`);
      if (previous.author.toString() !== updated.author.toString()) {
        await refresh(undefined, previous.author.toString());
      }

      return { ok: true, message: "Publication saved." };
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return {
          ok: false,
          error: "That slug is already in use.",
          fieldErrors: { slug: ["Already taken."] },
        };
      }
      throw error;
    }
  });
}

export async function setPublicationStatus(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<ActionResult> {
  return withAdmin(async () => {
    const updated = await Publication.findByIdAndUpdate(
      id,
      { $set: { status } },
      { returnDocument: "after" },
    );
    if (!updated) return { ok: false, error: "That publication no longer exists." };

    await refresh(updated.slug, updated.author.toString());
    return { ok: true, message: status === "published" ? "Published." : `Moved to ${status}.` };
  });
}

export async function deletePublication(id: string): Promise<ActionResult> {
  return withAdmin(async () => {
    const deleted = await Publication.findByIdAndDelete(id);
    if (!deleted) return { ok: false, error: "That publication no longer exists." };

    await deleteImageByUrl(deleted.coverImage);
    await refresh(deleted.slug, deleted.author.toString());
    return { ok: true, message: "Publication deleted." };
  });
}
