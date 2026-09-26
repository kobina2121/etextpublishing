"use server";

import { revalidatePath } from "next/cache";

import { siteSettingsSchema, submissionUpdateSchema } from "@/lib/validations/content";
import { ContactMessage, ManuscriptSubmission, SiteSettings } from "@/models";
import { toFieldErrors, withAdmin, type ActionResult } from "@/server/actions/shared";

/**
 * Submissions, messages and site settings.
 *
 * None of these are created from the admin: submissions and messages arrive
 * from the public forms, and settings is a singleton seeded once. The admin
 * only moves them through their workflow.
 */

// --- Manuscript submissions -------------------------------------------------

export async function updateSubmission(id: string, raw: unknown): Promise<ActionResult> {
  return withAdmin(async () => {
    const parsed = submissionUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Please correct the highlighted fields.",
        fieldErrors: toFieldErrors(parsed.error),
      };
    }

    const { status, adminNotes } = parsed.data;
    const updated = await ManuscriptSubmission.findByIdAndUpdate(
      id,
      { $set: { status, adminNotes: adminNotes || undefined } },
      { returnDocument: "after", runValidators: true },
    );
    if (!updated) return { ok: false, error: "That submission no longer exists." };

    revalidatePath("/admin");
    revalidatePath("/admin/manuscripts");
    return { ok: true, message: "Submission updated." };
  });
}

export async function deleteSubmission(id: string): Promise<ActionResult> {
  return withAdmin(async () => {
    const deleted = await ManuscriptSubmission.findByIdAndDelete(id);
    if (!deleted) return { ok: false, error: "That submission no longer exists." };
    revalidatePath("/admin");
    revalidatePath("/admin/manuscripts");
    return { ok: true, message: "Submission deleted." };
  });
}

// --- Contact messages -------------------------------------------------------

export async function setMessageRead(id: string, read: boolean): Promise<ActionResult> {
  return withAdmin(async () => {
    const updated = await ContactMessage.findByIdAndUpdate(
      id,
      { $set: { read } },
      { returnDocument: "after" },
    );
    if (!updated) return { ok: false, error: "That message no longer exists." };
    revalidatePath("/admin");
    revalidatePath("/admin/messages");
    return { ok: true, message: read ? "Marked as read." : "Marked as unread." };
  });
}

export async function setMessageArchived(id: string, archived: boolean): Promise<ActionResult> {
  return withAdmin(async () => {
    const updated = await ContactMessage.findByIdAndUpdate(
      id,
      // Archiving also marks it read: an archived message should never keep
      // showing up in the unread count.
      { $set: archived ? { archived: true, read: true } : { archived: false } },
      { returnDocument: "after" },
    );
    if (!updated) return { ok: false, error: "That message no longer exists." };
    revalidatePath("/admin");
    revalidatePath("/admin/messages");
    return { ok: true, message: archived ? "Archived." : "Restored." };
  });
}

export async function deleteMessage(id: string): Promise<ActionResult> {
  return withAdmin(async () => {
    const deleted = await ContactMessage.findByIdAndDelete(id);
    if (!deleted) return { ok: false, error: "That message no longer exists." };
    revalidatePath("/admin");
    revalidatePath("/admin/messages");
    return { ok: true, message: "Message deleted." };
  });
}

// --- Site settings ----------------------------------------------------------

export async function updateSiteSettings(raw: unknown): Promise<ActionResult> {
  return withAdmin(async () => {
    const parsed = siteSettingsSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Please correct the highlighted fields.",
        fieldErrors: toFieldErrors(parsed.error),
      };
    }

    // Upsert on the fixed key, so settings exist even if the seed never ran.
    await SiteSettings.findOneAndUpdate(
      { key: "site" },
      { $set: { ...parsed.data, key: "site" } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, runValidators: true },
    );

    // Settings feed the footer and metadata on every page, so everything is
    // refreshed rather than guessing which routes read which field.
    for (const path of [
      "/",
      "/about",
      "/publications",
      "/authors",
      "/services",
      "/news",
      "/contact",
      "/submit",
    ]) {
      revalidatePath(path);
    }
    return { ok: true, message: "Settings saved." };
  });
}
