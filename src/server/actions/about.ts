"use server";

import { revalidatePath } from "next/cache";

import { deleteImageByUrl } from "@/lib/storage/images";
import { aboutPageSchema } from "@/lib/validations/content";
import { AboutPage } from "@/models";
import { toFieldErrors, withAdmin, type ActionResult } from "@/server/actions/shared";

/** Saves the About page. The first save creates the record. */
export async function updateAboutPage(raw: unknown): Promise<ActionResult> {
  return withAdmin(async () => {
    const parsed = aboutPageSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Please correct the highlighted fields.",
        fieldErrors: toFieldErrors(parsed.error),
      };
    }

    const previous = await AboutPage.findOne({ key: "about" }, { heroImage: 1 }).lean<{
      heroImage?: string;
    } | null>();

    const { heroImage, sectionSubtitle, ...rest } = parsed.data;
    await AboutPage.findOneAndUpdate(
      { key: "about" },
      {
        $set: {
          ...rest,
          key: "about",
          heroImage: heroImage || undefined,
          sectionSubtitle: sectionSubtitle || undefined,
        },
      },
      { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
    );

    // A replaced banner upload is no longer used anywhere.
    if (previous?.heroImage && previous.heroImage !== heroImage) {
      await deleteImageByUrl(previous.heroImage);
    }

    revalidatePath("/about");
    revalidatePath("/admin/about");
    return { ok: true, message: "About page saved." };
  });
}
