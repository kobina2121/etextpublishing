import { z } from "zod";

import { imageRefSchema, objectIdSchema, slugSchema } from "@/lib/validations/publication";
import { PUBLICATION_STATUSES, SUBMISSION_STATUSES } from "@/types/content";

/** Repeated link rows used by authors and site settings. */
export const linkListSchema = z
  .array(
    z.object({
      label: z.string().trim().min(1, "Give the link a label.").max(60),
      href: z.string().trim().url("Enter a valid URL."),
    }),
  )
  .max(10)
  .default([]);

export const authorSchema = z.object({
  name: z.string().trim().min(2, "A name is required.").max(120),
  slug: slugSchema,
  role: z.string().trim().max(80).optional().or(z.literal("")),
  bio: z.string().trim().min(20, "Write at least a short biography.").max(4000),
  photo: imageRefSchema,
  featured: z.boolean().default(false),
  socials: linkListSchema,
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, "A name is required.").max(80),
  slug: slugSchema,
  description: z.string().trim().max(400).optional().or(z.literal("")),
});

export const articleSchema = z.object({
  title: z.string().trim().min(2, "A title is required.").max(200),
  slug: slugSchema,
  excerpt: z.string().trim().min(10, "Write a short excerpt.").max(300),
  body: z.string().trim().min(50, "Write the article body.").max(50000),
  coverImage: imageRefSchema,
  authorName: z.string().trim().min(2, "Who wrote this?").max(120),
  category: objectIdSchema,
  /** Comma-separated in the form; normalised to an array here. */
  tags: z
    .string()
    .trim()
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12),
    ),
  publishedAt: z.coerce.date({ message: "Choose a publication date." }),
  status: z.enum(PUBLICATION_STATUSES).default("draft"),
  featured: z.boolean().default(false),
});

export const serviceSchema = z.object({
  title: z.string().trim().min(2, "A title is required.").max(120),
  slug: slugSchema,
  summary: z.string().trim().min(10, "Write a one-line summary.").max(300),
  body: z.string().trim().min(20, "Describe the service.").max(8000),
  icon: z.string().trim().min(1, "Choose an icon."),
  order: z.coerce.number().int().min(0).max(999).default(0),
  status: z.enum(PUBLICATION_STATUSES).default("draft"),
});

export const submissionUpdateSchema = z.object({
  status: z.enum(SUBMISSION_STATUSES),
  adminNotes: z.string().trim().max(5000).optional().or(z.literal("")),
});

export const siteSettingsSchema = z.object({
  name: z.string().trim().min(2, "A company name is required.").max(120),
  tagline: z.string().trim().min(2, "A tagline is required.").max(200),
  description: z.string().trim().min(20, "Write a short description.").max(1000),
  contact: z.object({
    email: z.string().trim().email("Enter a valid email address."),
    phone: z.string().trim().min(3, "Enter a phone number.").max(40),
    address: z.object({
      line1: z.string().trim().min(2, "Enter the first address line.").max(120),
      line2: z.string().trim().max(120).optional().or(z.literal("")),
      city: z.string().trim().min(1, "Enter a city.").max(80),
      region: z.string().trim().min(1, "Enter a region.").max(80),
      postalCode: z.string().trim().min(1, "Enter a postal code.").max(20),
      country: z.string().trim().min(1, "Enter a country.").max(80),
    }),
  }),
  socials: linkListSchema,
  footerText: z.string().trim().max(300).optional().or(z.literal("")),
});

export type AuthorInput = z.input<typeof authorSchema>;
export type CategoryInput = z.input<typeof categorySchema>;
export type ArticleInput = z.input<typeof articleSchema>;
/** Output differs from input: `tags` is a comma-separated string that becomes an array. */
export type ArticleValues = z.output<typeof articleSchema>;
export type ServiceInput = z.input<typeof serviceSchema>;
export type SubmissionUpdateInput = z.input<typeof submissionUpdateSchema>;
export type SiteSettingsInput = z.input<typeof siteSettingsSchema>;
