import "server-only";

import { connectToDatabase } from "@/lib/db";
import { RateLimit } from "@/models";

/**
 * Fixed-window rate limiting, backed by MongoDB.
 *
 * Not in-memory: serverless instances do not share memory, so a process-local
 * counter resets on every cold start and is evaded by spreading requests across
 * instances. A shared store is the only version of this that actually limits
 * anything.
 *
 * Fixed window rather than sliding — at the edges it permits up to two windows'
 * worth of requests, which is an acceptable trade for a single indexed count.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window clears. Only meaningful when blocked. */
  retryAfter: number;
};

export async function checkRateLimit({
  key,
  limit,
  windowSeconds,
}: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  await connectToDatabase();

  const since = new Date(Date.now() - windowSeconds * 1000);
  const used = await RateLimit.countDocuments({ key, createdAt: { $gte: since } });

  if (used >= limit) {
    // Report when the oldest attempt in the window falls out of it.
    const oldest = await RateLimit.findOne({ key, createdAt: { $gte: since } })
      .sort({ createdAt: 1 })
      .lean<{ createdAt: Date } | null>();

    const retryAfter = oldest
      ? Math.max(
          1,
          Math.ceil((oldest.createdAt.getTime() + windowSeconds * 1000 - Date.now()) / 1000),
        )
      : windowSeconds;

    return { allowed: false, remaining: 0, retryAfter };
  }

  await RateLimit.create({ key, createdAt: new Date() });
  return { allowed: true, remaining: Math.max(0, limit - used - 1), retryAfter: 0 };
}

/**
 * Clears a subject's attempts.
 *
 * Called after a successful sign-in, so a legitimate user who mistyped their
 * password twice is not still carrying those failures.
 */
export async function clearRateLimit(key: string): Promise<void> {
  await connectToDatabase();
  await RateLimit.deleteMany({ key });
}

/** Rate-limit key for a scope and subject. Subjects are lowercased and trimmed. */
export function rateLimitKey(scope: string, subject: string): string {
  return `${scope}:${subject.trim().toLowerCase()}`;
}
