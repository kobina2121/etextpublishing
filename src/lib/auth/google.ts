import "server-only";

import { connectToDatabase } from "@/lib/db";
import { User } from "@/models";
import type { UserRole } from "@/models/types";

/**
 * Google sign-in, and the rule that keeps it from being a way in.
 *
 * Signing in with Google creates a `customer` and nothing more. If an account
 * already exists for that address its role is left exactly as it is, so an
 * admin who prefers Google can use it — but a Google account on its own can
 * never mint staff access. Anyone who wants an admin has to be made one
 * deliberately, by seed or by hand, which is the only place that decision
 * belongs.
 *
 * Only a Google-verified address is accepted. An unverified one proves nothing
 * about who controls the mailbox, and orders are matched back to an account by
 * email, so trusting it would hand someone else's purchase history away.
 */

export type ResolvedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  image?: string;
};

/** Both halves must be present, or the provider is not registered at all. */
export function googleCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.AUTH_GOOGLE_ID?.trim();
  const clientSecret = process.env.AUTH_GOOGLE_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function isGoogleSignInEnabled(): boolean {
  return googleCredentials() !== null;
}

/**
 * Finds or creates the account behind a verified Google profile.
 *
 * Matching is by email, not by Google's subject id: an admin seeded with a
 * password should be recognised the first time they choose Google, rather than
 * ending up with a second, powerless account at the same address. The subject
 * id is recorded afterwards.
 */
export async function resolveGoogleUser(input: {
  email: string;
  name: string;
  googleId: string;
  image?: string;
}): Promise<ResolvedUser | null> {
  const email = input.email.trim().toLowerCase();
  if (!email) return null;

  await connectToDatabase();

  const existing = await User.findOne({ email });

  if (existing) {
    // Role is deliberately not touched. A name or picture may change; what the
    // account is allowed to do may not, and certainly not from here.
    existing.googleId = input.googleId;
    if (input.image) existing.image = input.image;
    if (!existing.name && input.name) existing.name = input.name;
    await existing.save();

    return {
      id: existing._id.toString(),
      email: existing.email,
      name: existing.name,
      role: existing.role,
      ...(existing.image ? { image: existing.image } : {}),
    };
  }

  const created = await User.create({
    email,
    name: input.name || email.split("@")[0] || "Reader",
    role: "customer",
    googleId: input.googleId,
    ...(input.image ? { image: input.image } : {}),
  });

  return {
    id: created._id.toString(),
    email: created.email,
    name: created.name,
    role: created.role,
    ...(created.image ? { image: created.image } : {}),
  };
}
