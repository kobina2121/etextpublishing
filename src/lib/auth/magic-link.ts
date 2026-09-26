import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { connectToDatabase } from "@/lib/db";
import { MagicLinkToken, User } from "@/models";

/**
 * Single-use sign-in links.
 *
 * The token is a 32-byte random value shown only in the emailed URL. Only its
 * SHA-256 hash is stored, so the collection is useless to anyone who reads it.
 * A plain hash is right here — unlike a password, the token is high-entropy and
 * short-lived, so slow hashing buys nothing.
 */

export const MAGIC_LINK_TTL_MINUTES = 15;

/** Requests allowed per address inside the TTL window, before we stop issuing. */
const MAX_REQUESTS_PER_WINDOW = 3;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type IssueResult =
  | { ok: true; token: string }
  /** Deliberately vague: the caller must not reveal which case occurred. */
  | { ok: false; reason: "no-account" | "rate-limited" };

export async function issueMagicLink(email: string, ip?: string): Promise<IssueResult> {
  await connectToDatabase();
  const normalised = email.trim().toLowerCase();

  // Only an existing admin ever gets a link. Checked here, and again when the
  // token is consumed, in case the account changes in between.
  const user = await User.findOne({ email: normalised }, { role: 1 }).lean<{
    role: string;
  } | null>();
  if (!user || user.role !== "admin") return { ok: false, reason: "no-account" };

  const since = new Date(Date.now() - MAGIC_LINK_TTL_MINUTES * 60_000);
  const recent = await MagicLinkToken.countDocuments({
    email: normalised,
    createdAt: { $gte: since },
  });
  if (recent >= MAX_REQUESTS_PER_WINDOW) return { ok: false, reason: "rate-limited" };

  const token = randomBytes(32).toString("base64url");

  await MagicLinkToken.create({
    email: normalised,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60_000),
    ...(ip ? { requestedIp: ip } : {}),
  });

  return { ok: true, token };
}

export type ConsumeResult =
  | { ok: true; user: { id: string; email: string; name: string; role: "admin" | "editor" } }
  | { ok: false; reason: "invalid" | "expired" | "used" };

/**
 * Validates a token and spends it.
 *
 * The update is conditional on `usedAt` still being unset, so two requests
 * racing the same link cannot both succeed — the second matches nothing.
 */
export async function consumeMagicLink(token: string): Promise<ConsumeResult> {
  if (!token || token.length < 16) return { ok: false, reason: "invalid" };

  await connectToDatabase();
  const tokenHash = hashToken(token);

  const record = await MagicLinkToken.findOne({ tokenHash });
  if (!record) return { ok: false, reason: "invalid" };

  // Both values are ours and the same length; compared in constant time anyway
  // so a lookup never leaks progress through timing.
  const matches = timingSafeEqual(Buffer.from(record.tokenHash), Buffer.from(tokenHash));
  if (!matches) return { ok: false, reason: "invalid" };

  if (record.usedAt) return { ok: false, reason: "used" };
  if (record.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  const spent = await MagicLinkToken.findOneAndUpdate(
    { _id: record._id, usedAt: { $exists: false } },
    { $set: { usedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!spent) return { ok: false, reason: "used" };

  const user = await User.findOne({ email: record.email });
  if (!user || user.role !== "admin") return { ok: false, reason: "invalid" };

  // Any other outstanding link for this address is void once one is used.
  await MagicLinkToken.deleteMany({ email: record.email, usedAt: { $exists: false } });

  return {
    ok: true,
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}
