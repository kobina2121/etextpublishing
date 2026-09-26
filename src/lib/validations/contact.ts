import { z } from "zod";

/**
 * Shared by the client form and, from Phase 7, the Server Action that persists
 * the message. One schema means the browser and the server can never disagree
 * about what counts as valid.
 */
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.string().trim().email("Please enter a valid email address."),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  subject: z.string().trim().min(3, "Please give your message a subject.").max(200),
  message: z
    .string()
    .trim()
    .min(20, "Please give us a little more detail (at least 20 characters).")
    .max(5000),
  /** Honeypot: real users never see this, so any value means a bot. */
  website: z.string().max(0).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;
