import { z } from "zod";

const email = z.string().trim().email("Enter a valid email address.");

/** Shared by the sign-in form and the Credentials provider's authorize(). */
export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Length over composition rules: a long passphrase is stronger than a short
 * string with a symbol in it. The upper bound is bcrypt's — it silently ignores
 * everything past 72 bytes.
 */
const newPassword = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(72, "Use 72 characters or fewer.");

/** Shared by the sign-up form and the `registerAccount` Server Action. */
export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name.").max(100, "That name is too long."),
    email,
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "The passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Setting or changing the password on an account that is already signed in.
 *
 * `currentPassword` is required by the Server Action whenever the account
 * already has one; it is optional here only because a Google-only account has
 * nothing to enter.
 */
export const setPasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "The passwords do not match.",
    path: ["confirmPassword"],
  });

export type SetPasswordInput = z.infer<typeof setPasswordSchema>;

/** The forgot-password form: just the address to send a link to. */
export const forgotPasswordSchema = z.object({ email });

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** Choosing a new password from an emailed link. The token travels with it. */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(32, "That reset link is not valid."),
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "The passwords do not match.",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
