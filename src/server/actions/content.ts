"use server";

import { revalidatePath } from "next/cache";

import { deleteImageByUrl } from "@/lib/storage/images";
import {
  articleSchema,
  authorSchema,
  categorySchema,
  serviceSchema,
} from "@/lib/validations/content";
import { Article, Author, Category, Publication, Service } from "@/models";
import {
  isDuplicateKeyError,
  toFieldErrors,
  withAdmin,
  type ActionResult,
} from "@/server/actions/shared";

const invalid = (error: Parameters<typeof toFieldErrors>[0]): ActionResult => ({
  ok: false,
  error: "Please correct the highlighted fields.",
  fieldErrors: toFieldErrors(error),
});

const duplicateSlug: ActionResult = {
  ok: false,
  error: "That slug is already in use.",
  fieldErrors: { slug: ["Already taken."] },
};

// --- Authors ----------------------------------------------------------------

function refreshAuthor(slug?: string) {
  revalidatePath("/");
  revalidatePath("/authors");
  revalidatePath("/publications");
  if (slug) revalidatePath(`/authors/${slug}`);
}

export async function createAuthor(raw: unknown): Promise<ActionResult> {
  return withAdmin(async () => {
    const parsed = authorSchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);

    const { photo, role, ...rest } = parsed.data;
    try {
      const created = await Author.create({
        ...rest,
        ...(photo ? { photo } : {}),
        ...(role ? { role } : {}),
      });
      refreshAuthor(created.slug);
      return { ok: true, message: "Author created.", id: created._id.toString() };
    } catch (error) {
      if (isDuplicateKeyError(error)) return duplicateSlug;
      throw error;
    }
  });
}

export async function updateAuthor(id: string, raw: unknown): Promise<ActionResult> {
  return withAdmin(async () => {
    const parsed = authorSchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);

    const previous = await Author.findById(id, { slug: 1, photo: 1 }).lean<{
      slug: string;
      photo?: string;
    } | null>();
    if (!previous) return { ok: false, error: "That author no longer exists." };

    const { photo, role, ...rest } = parsed.data;
    try {
      const updated = await Author.findByIdAndUpdate(
        id,
        { $set: { ...rest, photo: photo || undefined, role: role || undefined } },
        { returnDocument: "after", runValidators: true },
      );
      if (!updated) return { ok: false, error: "That author no longer exists." };

      if (previous.photo && previous.photo !== updated.photo) {
        await deleteImageByUrl(previous.photo);
      }
      refreshAuthor(updated.slug);
      if (previous.slug !== updated.slug) revalidatePath(`/authors/${previous.slug}`);
      return { ok: true, message: "Author saved." };
    } catch (error) {
      if (isDuplicateKeyError(error)) return duplicateSlug;
      throw error;
    }
  });
}

export async function deleteAuthor(id: string): Promise<ActionResult> {
  return withAdmin(async () => {
    // Refused rather than cascaded: deleting an author would orphan every
    // publication pointing at them, and silently destroying titles is worse
    // than making the admin reassign them first.
    const inUse = await Publication.countDocuments({ author: id });
    if (inUse > 0) {
      return {
        ok: false,
        error: `This author has ${inUse} ${inUse === 1 ? "title" : "titles"}. Reassign or delete those first.`,
      };
    }

    const deleted = await Author.findByIdAndDelete(id);
    if (!deleted) return { ok: false, error: "That author no longer exists." };

    await deleteImageByUrl(deleted.photo);
    refreshAuthor(deleted.slug);
    return { ok: true, message: "Author deleted." };
  });
}

// --- Categories -------------------------------------------------------------

function refreshCategory() {
  revalidatePath("/");
  revalidatePath("/publications");
  revalidatePath("/news");
}

export async function createCategory(raw: unknown): Promise<ActionResult> {
  return withAdmin(async () => {
    const parsed = categorySchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);

    const { description, ...rest } = parsed.data;
    try {
      const created = await Category.create({ ...rest, ...(description ? { description } : {}) });
      refreshCategory();
      return { ok: true, message: "Category created.", id: created._id.toString() };
    } catch (error) {
      if (isDuplicateKeyError(error)) return duplicateSlug;
      throw error;
    }
  });
}

export async function updateCategory(id: string, raw: unknown): Promise<ActionResult> {
  return withAdmin(async () => {
    const parsed = categorySchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);

    const { description, ...rest } = parsed.data;
    try {
      const updated = await Category.findByIdAndUpdate(
        id,
        { $set: { ...rest, description: description || undefined } },
        { returnDocument: "after", runValidators: true },
      );
      if (!updated) return { ok: false, error: "That category no longer exists." };
      refreshCategory();
      return { ok: true, message: "Category saved." };
    } catch (error) {
      if (isDuplicateKeyError(error)) return duplicateSlug;
      throw error;
    }
  });
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  return withAdmin(async () => {
    const [pubs, articles] = await Promise.all([
      Publication.countDocuments({ category: id }),
      Article.countDocuments({ category: id }),
    ]);
    const total = pubs + articles;
    if (total > 0) {
      return {
        ok: false,
        error: `This category is used by ${total} ${total === 1 ? "record" : "records"}. Move them first.`,
      };
    }

    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) return { ok: false, error: "That category no longer exists." };
    refreshCategory();
    return { ok: true, message: "Category deleted." };
  });
}

// --- Articles ---------------------------------------------------------------

function refreshArticle(slug?: string) {
  revalidatePath("/");
  revalidatePath("/news");
  if (slug) revalidatePath(`/news/${slug}`);
}

export async function createArticle(raw: unknown): Promise<ActionResult> {
  return withAdmin(async () => {
    const parsed = articleSchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);

    const { coverImage, ...rest } = parsed.data;
    try {
      const created = await Article.create({ ...rest, ...(coverImage ? { coverImage } : {}) });
      refreshArticle(created.slug);
      return { ok: true, message: "Article created.", id: created._id.toString() };
    } catch (error) {
      if (isDuplicateKeyError(error)) return duplicateSlug;
      throw error;
    }
  });
}

export async function updateArticle(id: string, raw: unknown): Promise<ActionResult> {
  return withAdmin(async () => {
    const parsed = articleSchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);

    const previous = await Article.findById(id, { slug: 1, coverImage: 1 }).lean<{
      slug: string;
      coverImage?: string;
    } | null>();
    if (!previous) return { ok: false, error: "That article no longer exists." };

    const { coverImage, ...rest } = parsed.data;
    try {
      const updated = await Article.findByIdAndUpdate(
        id,
        { $set: { ...rest, coverImage: coverImage || undefined } },
        { returnDocument: "after", runValidators: true },
      );
      if (!updated) return { ok: false, error: "That article no longer exists." };

      if (previous.coverImage && previous.coverImage !== updated.coverImage) {
        await deleteImageByUrl(previous.coverImage);
      }
      refreshArticle(updated.slug);
      if (previous.slug !== updated.slug) revalidatePath(`/news/${previous.slug}`);
      return { ok: true, message: "Article saved." };
    } catch (error) {
      if (isDuplicateKeyError(error)) return duplicateSlug;
      throw error;
    }
  });
}

export async function setArticleStatus(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<ActionResult> {
  return withAdmin(async () => {
    const updated = await Article.findByIdAndUpdate(
      id,
      { $set: { status } },
      { returnDocument: "after" },
    );
    if (!updated) return { ok: false, error: "That article no longer exists." };
    refreshArticle(updated.slug);
    return { ok: true, message: status === "published" ? "Published." : `Moved to ${status}.` };
  });
}

export async function deleteArticle(id: string): Promise<ActionResult> {
  return withAdmin(async () => {
    const deleted = await Article.findByIdAndDelete(id);
    if (!deleted) return { ok: false, error: "That article no longer exists." };
    await deleteImageByUrl(deleted.coverImage);
    refreshArticle(deleted.slug);
    return { ok: true, message: "Article deleted." };
  });
}

// --- Services ---------------------------------------------------------------

function refreshService() {
  revalidatePath("/");
  revalidatePath("/services");
}

export async function createService(raw: unknown): Promise<ActionResult> {
  return withAdmin(async () => {
    const parsed = serviceSchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);
    try {
      const created = await Service.create(parsed.data);
      refreshService();
      return { ok: true, message: "Service created.", id: created._id.toString() };
    } catch (error) {
      if (isDuplicateKeyError(error)) return duplicateSlug;
      throw error;
    }
  });
}

export async function updateService(id: string, raw: unknown): Promise<ActionResult> {
  return withAdmin(async () => {
    const parsed = serviceSchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);
    try {
      const updated = await Service.findByIdAndUpdate(
        id,
        { $set: parsed.data },
        { returnDocument: "after", runValidators: true },
      );
      if (!updated) return { ok: false, error: "That service no longer exists." };
      refreshService();
      return { ok: true, message: "Service saved." };
    } catch (error) {
      if (isDuplicateKeyError(error)) return duplicateSlug;
      throw error;
    }
  });
}

export async function setServiceStatus(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<ActionResult> {
  return withAdmin(async () => {
    const updated = await Service.findByIdAndUpdate(
      id,
      { $set: { status } },
      { returnDocument: "after" },
    );
    if (!updated) return { ok: false, error: "That service no longer exists." };
    refreshService();
    return { ok: true, message: status === "published" ? "Published." : `Moved to ${status}.` };
  });
}

export async function deleteService(id: string): Promise<ActionResult> {
  return withAdmin(async () => {
    const deleted = await Service.findByIdAndDelete(id);
    if (!deleted) return { ok: false, error: "That service no longer exists." };
    refreshService();
    return { ok: true, message: "Service deleted." };
  });
}
