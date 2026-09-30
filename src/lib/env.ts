import { z } from "zod";

/**
 * Server-only environment access.
 *
 * Validation is lazy and memoised on purpose: `next build` must succeed on a
 * machine with no secrets configured, so nothing is checked until a module
 * actually needs a value. Consumers get a loud, specific error instead of a
 * vague `undefined` crash at request time.
 *
 * Never import this from a Client Component.
 */

const optionalString = z
  .string()
  .trim()
  .min(1)
  .optional()
  .or(z.literal("").transform(() => undefined));

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Database (Phase 4)
  MONGODB_URI: z.string().trim().min(1, "MONGODB_URI is not set"),

  // Auth (Phase 5)
  AUTH_SECRET: z.string().trim().min(32, "AUTH_SECRET must be at least 32 characters"),

  // Google sign-in. Optional: without both, the provider is not registered and
  // the button does not render, rather than offering a route that 500s.
  AUTH_GOOGLE_ID: optionalString,
  AUTH_GOOGLE_SECRET: optionalString,

  // Seed (Phase 4)
  SEED_ADMIN_EMAIL: optionalString.pipe(z.string().email().optional()),
  SEED_ADMIN_PASSWORD: optionalString,
  SEED_ADMIN_NAME: optionalString,

  // Storage (Phase 7)
  S3_REGION: optionalString,
  S3_BUCKET: optionalString,
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,
  S3_ENDPOINT: optionalString,

  // Payments
  PAYSTACK_SECRET_KEY: optionalString,
  PAYSTACK_PUBLIC_KEY: optionalString,

  // Email (Phase 7)
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: optionalString.pipe(z.string().email().optional()),
  EMAIL_TO_SUBMISSIONS: optionalString.pipe(z.string().email().optional()),
  EMAIL_TO_CONTACT: optionalString.pipe(z.string().email().optional()),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}\n\nSee .env.example.`);
  }

  cached = parsed.data;
  return cached;
}

/**
 * Reads a single required server variable. Prefer this in modules that only
 * need one or two values, so an unrelated missing secret cannot break them.
 */
export function requireEnv(key: keyof ServerEnv): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}. See .env.example.`);
  }
  return value;
}

/**
 * NEXT_PUBLIC_* values are inlined at build time, so they are read directly
 * rather than through the schema above.
 */
export const publicEnv = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  assetHost: process.env.NEXT_PUBLIC_ASSET_HOST?.trim() || undefined,
} as const;
