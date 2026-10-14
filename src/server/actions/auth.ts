"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/guards";
import {
  consumePasswordReset,
  issuePasswordReset,
  RESET_TTL_MINUTES,
  withdrawPasswordReset,
} from "@/lib/auth/password-reset";
import { connectToDatabase } from "@/lib/db";
import { isEmailConfigured, sendMail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email/templates";
import { publicEnv } from "@/lib/env";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import {
  forgotPasswordSchema,
  registerSchema,
  resetPasswordSchema,
  setPasswordSchema,
} from "@/lib/validations/auth";
import { User } from "@/models";

export type RegisterResult =
  | { ok: true }
  /** `exists` lets the form offer "sign in" and "reset your password" links. */
  | { ok: false; message: string; exists?: boolean };

/**
 * Creates a reader account with an email and password.
 *
 * Only ever a `customer`: staff access is granted on the server with
 * `npm run grant-admin`, never by filling in a form.
 *
 * The client signs in with the same credentials afterwards, so the password is
 * checked by exactly one code path — the Credentials provider.
 *
 * Saying "that address already has an account" does confirm the address is
 * registered. Every sign-up form leaks that; the rate limit keeps it from
 * being used to sweep a list of addresses.
 */
export async function registerAccount(raw: unknown): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the form and try again.",
    };
  }

  const limit = await checkRateLimit({
    key: rateLimitKey("register", await clientIp()),
    limit: 5,
    windowSeconds: 3600,
  });
  if (!limit.allowed) {
    return { ok: false, message: "Too many sign-up attempts. Please try again later." };
  }

  await connectToDatabase();

  const email = parsed.data.email.toLowerCase();
  if (await User.exists({ email })) {
    return { ok: false, message: "That email address already has an account.", exists: true };
  }

  try {
    await User.create({
      email,
      name: parsed.data.name,
      role: "customer",
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
    });
  } catch (error) {
    // Two submissions racing past the check above: the unique index decides.
    if ((error as { code?: number }).code === 11000) {
      return { ok: false, message: "That email address already has an account.", exists: true };
    }
    throw error;
  }

  return { ok: true };
}

export type SetPasswordResult =
  /** `email`: the form signs straight back in with it, since this session just ended. */
  { ok: true; message: string; email: string } | { ok: false; message: string };

/**
 * Adds a password to the signed-in account, or changes the one it has.
 *
 * This is how an account made through Google — every admin is — gets a second
 * way in. Two rules keep it from becoming a way to take an account over:
 *
 * - Changing an existing password needs the current one, so a session left
 *   open on a shared computer cannot lock its owner out.
 * - Adding a first password needs Google to have linked the account. Google
 *   has then verified the address; without that, whoever is signed in has
 *   proved nothing about owning it.
 *
 * Keyed on the account, not the IP, so guessing the current password is capped
 * however many addresses it is tried from.
 *
 * Every session on the account ends, this one included; the form signs back in
 * with the new password straight away.
 */
export async function setAccountPassword(raw: unknown): Promise<SetPasswordResult> {
  const sessionUser = await requireUser();

  const parsed = setPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the form and try again.",
    };
  }

  const limit = await checkRateLimit({
    key: rateLimitKey("set-password", sessionUser.id),
    limit: 5,
    windowSeconds: 900,
  });
  if (!limit.allowed) {
    return { ok: false, message: "Too many attempts. Please wait a few minutes." };
  }

  await connectToDatabase();
  const user = await User.findById(sessionUser.id);
  if (!user) return { ok: false, message: "That account no longer exists." };

  const hadPassword = Boolean(user.passwordHash);

  if (user.passwordHash) {
    const current = parsed.data.currentPassword ?? "";
    if (!current || !(await bcrypt.compare(current, user.passwordHash))) {
      return { ok: false, message: "Your current password is not correct." };
    }
  } else if (!user.googleId) {
    return {
      ok: false,
      message: "Sign in with Google once first, so we know this address is yours.",
    };
  }

  user.passwordHash = await bcrypt.hash(parsed.data.password, 12);
  // Signs out every other device. A changed password is often a response to
  // someone else knowing the old one; their session should not outlive it.
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  await user.save();

  revalidatePath("/account");
  return {
    ok: true,
    email: user.email,
    message: hadPassword
      ? "Password changed."
      : "Password set. You can now sign in with your email and password, or with Google.",
  };
}

export type RequestResetResult = { ok: true; message: string } | { ok: false; message: string };

/**
 * Sends a password reset link.
 *
 * Answers identically whether or not the address has an account, and whether
 * or not it was throttled. Saying "no such account" would turn this into a way
 * to test which addresses are registered.
 */
export async function requestPasswordReset(raw: unknown): Promise<RequestResetResult> {
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Enter a valid email address." };

  // Production with no mail provider: every request would silently go nowhere,
  // so say so plainly. Development prints the email to the server console.
  if (!isEmailConfigured() && process.env.NODE_ENV === "production") {
    return {
      ok: false,
      message:
        "Password reset is not available yet. Sign in with Google if you can, or contact us.",
    };
  }

  const generic: RequestResetResult = {
    ok: true,
    message: `If that address has an account, a reset link is on its way. It expires in ${RESET_TTL_MINUTES} minutes.`,
  };

  const limit = await checkRateLimit({
    key: rateLimitKey("reset", await clientIp()),
    limit: 10,
    windowSeconds: 3600,
  });
  if (!limit.allowed) return generic;

  const issued = await issuePasswordReset(parsed.data.email);
  if (!issued.ok) return generic;

  const url = `${publicEnv.siteUrl}/reset-password?token=${encodeURIComponent(issued.token)}`;
  const sent = await sendMail({
    to: parsed.data.email,
    ...passwordResetEmail({ name: issued.name, url, expiresMinutes: RESET_TTL_MINUTES }),
  });
  if (!sent.ok) {
    console.error("[password-reset] email failed", sent.error);
    // Nobody received it, so it must not use up one of their three tries.
    await withdrawPasswordReset(issued.token);
    return { ok: false, message: "The reset email could not be sent. Please try again later." };
  }

  return generic;
}

export type ResetPasswordResult = { ok: true; email: string } | { ok: false; message: string };

/** Sets a new password from an emailed link. The token is the only credential. */
export async function resetPassword(raw: unknown): Promise<ResetPasswordResult> {
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the form and try again.",
    };
  }

  const result = await consumePasswordReset(parsed.data.token, parsed.data.password);
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.state === "expired"
          ? "That reset link has expired. Ask for a new one."
          : result.state === "used"
            ? "That reset link has already been used. Ask for a new one if you need it."
            : "That reset link is not valid. Ask for a new one.",
    };
  }

  return { ok: true, email: result.email };
}
