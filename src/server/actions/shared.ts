import "server-only";

import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { requireAdmin } from "@/lib/auth/guards";
import { connectToDatabase } from "@/lib/db";

/**
 * Result shape returned by every Server Action.
 *
 * Actions return errors rather than throwing them: a thrown error in a Server
 * Action surfaces to the user as a generic digest with no field detail, which
 * is useless for a form.
 */
export type ActionResult =
  | { ok: true; message?: string; id?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Wraps an action with the admin check and a database connection.
 *
 * `requireAdmin()` runs inside every action, not just in the page or the proxy:
 * a Server Action is reachable by POST without ever rendering a gated page, so
 * routing alone is not authorisation.
 */
export async function withAdmin<T>(fn: () => Promise<T>): Promise<T> {
  await requireAdmin();
  await connectToDatabase();
  return fn();
}

/** Flattens a Zod error into the field map the forms expect. */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const flattened: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (flattened[key] ??= []).push(issue.message);
  }
  return flattened;
}

/** MongoDB duplicate-key error, raised when a unique index is violated. */
export function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

/**
 * Refreshes the public pages a content change can affect.
 *
 * Deliberately broad: a publication appears on its own page, the listing, the
 * homepage's featured strip and its author's page, and getting this wrong means
 * an admin publishes something and cannot see it.
 */
export function revalidatePublicContent(paths: string[] = []) {
  for (const path of ["/", ...paths]) {
    revalidatePath(path);
  }
}
