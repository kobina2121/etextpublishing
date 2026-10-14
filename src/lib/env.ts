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

/**
 * A sending address: either a bare `you@domain` or `Display Name <you@domain>`,
 * the form mail clients show as the sender's name.
 */
export const emailSenderSchema = z
  .string()
  .trim()
  .refine((value) => {
    const bracketed = /^[^<>]+<([^<>\s]+)>$/.exec(value);
    return z
      .string()
      .email()
      .safeParse(bracketed ? bracketed[1] : value).success;
  }, "Use you@domain or Display Name <you@domain>.");

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
  EMAIL_FROM: optionalString.pipe(emailSenderSchema.optional()),
  /** Where replies to our emails go. The sending domain has no inbox. */
  EMAIL_REPLY_TO: optionalString.pipe(z.string().email().optional()),
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
/**
 * The site's own address, for links that leave the page: password-reset
 * emails, Paystack's return address, the sitemap and canonical URLs.
 *
 * NEXT_PUBLIC_SITE_URL wins when it is a real address. On a Vercel production
 * deployment where it is missing — or still says localhost, copied from a
 * local .env — the project's production domain is used instead, which Vercel
 * sets on every deployment. A live site must never send people to localhost.
 *
 * The visitor's Host header is deliberately not consulted: building reset
 * links from it lets an attacker request a reset for someone else with their
 * own domain in the header, and receive the token.
 */
export function resolveSiteUrl(env: Record<string, string | undefined>): string {
  const configured = env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  const isLocal = !configured || /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(configured);
  if (configured && !isLocal) return configured;

  const productionDomain = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (env.VERCEL_ENV === "production" && productionDomain) {
    return `https://${productionDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }

  return configured || "http://localhost:3000";
}

export const publicEnv = {
  siteUrl: resolveSiteUrl({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  }),
  assetHost: process.env.NEXT_PUBLIC_ASSET_HOST?.trim() || undefined,
} as const;
