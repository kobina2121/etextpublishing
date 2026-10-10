import "server-only";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db";
import { PasswordResetToken, User } from "@/models";

/**
 * Single-use password reset links.
 *
 * The token is a 32-byte random value that appears only in the emailed URL.
 * Only its SHA-256 hash is stored, so the collection is useless to anyone who
 * reads it. A fast hash is right here: unlike a password, the token is
 * high-entropy and short-lived, so slow hashing buys nothing.
 *
 * Works for every account, including ones that have only ever used Google —
 * following the link proves the person reads that mailbox, which is all a
 * password needs.
 */

export const RESET_TTL_MINUTES = 30;

/** Links issued per account inside the TTL window before we stop sending. */
const MAX_PER_WINDOW = 3;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type IssueResult =
  | { ok: true; token: string; name: string }
  /** The caller must not reveal which of these happened. */
  | { ok: false; reason: "no-account" | "too-many" };

export async function issuePasswordReset(email: string): Promise<IssueResult> {
  await connectToDatabase();

  const user = await User.findOne({ email: email.trim().toLowerCase() })
    .select("_id name")
    .lean<{ _id: Types.ObjectId; name: string } | null>();
  if (!user) return { ok: false, reason: "no-account" };

  const since = new Date(Date.now() - RESET_TTL_MINUTES * 60_000);
  const recent = await PasswordResetToken.countDocuments({
    user: user._id,
    createdAt: { $gte: since },
  });
  if (recent >= MAX_PER_WINDOW) return { ok: false, reason: "too-many" };

  const token = randomBytes(32).toString("base64url");
  await PasswordResetToken.create({
    user: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60_000),
  });

  return { ok: true, token, name: user.name };
}

export type TokenState = "valid" | "invalid" | "expired" | "used";

/** For the reset page: is this link worth showing a form for? Spends nothing. */
export async function checkPasswordReset(token: string): Promise<TokenState> {
  if (!token || token.length < 32) return "invalid";
  await connectToDatabase();
  const record = await PasswordResetToken.findOne({ tokenHash: hashToken(token) }).lean<{
    expiresAt: Date;
    usedAt?: Date;
  } | null>();
  if (!record) return "invalid";
  if (record.usedAt) return "used";
  if (record.expiresAt.getTime() < Date.now()) return "expired";
  return "valid";
}

export type ConsumeResult =
  { ok: true; email: string } | { ok: false; state: Exclude<TokenState, "valid"> };

/**
 * Spends a token and sets the new password.
 *
 * The claim is conditional on `usedAt` still being unset, so two submissions
 * racing the same link cannot both succeed — the second matches nothing.
 */
export async function consumePasswordReset(
  token: string,
  newPassword: string,
): Promise<ConsumeResult> {
  const state = await checkPasswordReset(token);
  if (state !== "valid") return { ok: false, state };

  const claimed = await PasswordResetToken.findOneAndUpdate(
    { tokenHash: hashToken(token), usedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!claimed) return { ok: false, state: "used" };

  const user = await User.findById(claimed.user);
  if (!user) return { ok: false, state: "invalid" };

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  // Following the link proved they read this mailbox.
  user.emailVerifiedAt ??= new Date();
  await user.save();

  // Any other outstanding link for this account is void once one is used.
  await PasswordResetToken.deleteMany({ user: user._id, usedAt: { $exists: false } });

  return { ok: true, email: user.email };
}
