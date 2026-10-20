import { z } from "zod";

import { storageKeySchema } from "@/lib/validations/journal";
import { imageRefSchema, objectIdSchema, slugSchema } from "@/lib/validations/publication";
import { PUBLICATION_STATUSES, SUBMISSION_STATUSES } from "@/types/content";

/** Repeated link rows used by authors and site settings. */
export const linkListSchema = z
  .array(
    z.object({
      label: z.string().trim().min(1, "Give the link a label.").max(60),
      // http(s) only: `javascript:` and `data:` also parse as URLs.
      href: z
        .string()
        .trim()
        .url("Enter a valid URL.")
        .refine((value) => /^https?:\/\//i.test(value), "Start the address with https://."),
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
  /**
   * Comma-separated in the form; normalised to an array here. Also accepts the
   * array: the form submits values already parsed by this schema, and the
   * server action parses them again.
   */
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) =>
      (Array.isArray(value) ? value.join(",") : (value ?? ""))
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12),
    ),
  publishedAt: z.coerce.date({ message: "Choose a publication date." }),
  status: z.enum(PUBLICATION_STATUSES).default("draft"),
  featured: z.boolean().default(false),
  /** Further reading, shown under the article: label and address. */
  links: linkListSchema,
  /** Optional: a PDF readers can open or download from the article page. */
  pdfKey: storageKeySchema,
  pdfName: z.string().trim().max(200).optional().or(z.literal("")),
  pdfSize: z.coerce.number().int().min(0).optional().default(0),
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

/**
 * The About page, edited from /admin/about.
 *
 * Limits keep the layout intact: the banner title has to fit the banner, and
 * "What we do" is laid out as a row of cards, which stops reading as a row
 * past six.
 */
export const aboutPageSchema = z.object({
  heroTitle: z.string().trim().min(2, "Give the page a title.").max(120),
  heroDescription: z
    .string()
    .trim()
    .min(10, "Write a sentence for under the title.")
    .max(300, "Keep this under 300 characters — it sits in the banner."),
  // Uploads only. An external URL would be refused by the CSP (img-src 'self')
  // and by next/image, which only optimises configured hosts — the banner
  // would break rather than show it.
  heroImage: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\/api\/images\/[a-f\d]{24}$/i.test(value),
      "Upload the banner image here rather than linking to one.",
    )
    .optional()
    .default(""),
  intro: z
    .string()
    .trim()
    .min(20, "Write at least a sentence about the company.")
    .max(6000, "That is too long for this section."),
  sectionTitle: z.string().trim().min(2, "Give the section a heading.").max(80),
  sectionSubtitle: z.string().trim().max(120).optional().or(z.literal("")),
  pillars: z
    .array(
      z.object({
        title: z.string().trim().min(2, "Give this card a title.").max(80),
        body: z.string().trim().min(10, "Write a sentence for this card.").max(400),
      }),
    )
    .min(1, "Add at least one card.")
    .max(6, "Six cards at most."),
});

export type AboutPageInput = z.input<typeof aboutPageSchema>;
export type AboutPageValues = z.output<typeof aboutPageSchema>;
