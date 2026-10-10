import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";

import { authConfig } from "@/lib/auth/auth.config";
import { googleCredentials, resolveGoogleUser } from "@/lib/auth/google";
import { connectToDatabase } from "@/lib/db";
import { checkRateLimit, clearRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations/auth";
import { User } from "@/models";

/**
 * Two ways in: an email and password, or Google.
 *
 * Signing in never grants more than a customer, and neither does signing up.
 * What an account may do is decided by the role already on the record, set
 * with `npm run grant-admin -- <email>` on the server.
 */
const google = googleCredentials();

/**
 * A valid bcrypt hash of a value nobody knows.
 *
 * When no account matches, or it has no password, the password is still
 * compared against this so every failure takes the same time. Without it,
 * response timing tells an attacker which email addresses exist.
 */
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        await connectToDatabase();

        // Brute-force guard, keyed on the address being attempted. Checked
        // before the password is compared, so a locked-out attacker learns
        // nothing further and costs us no bcrypt work.
        const key = rateLimitKey("login", parsed.data.email);
        const limit = await checkRateLimit({ key, limit: 5, windowSeconds: 900 });
        if (!limit.allowed) return null;

        const user = await User.findOne({ email: parsed.data.email.toLowerCase() });

        // An account that only ever signs in with Google has no hash.
        if (!user?.passwordHash) {
          await bcrypt.compare(parsed.data.password, DUMMY_HASH);
          return null;
        }

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        // Signing in clears the counter, so someone who mistyped twice is not
        // still carrying those failures into their next session.
        await clearRateLimit(key);

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          ...(user.image ? { image: user.image } : {}),
        };
      },
    }),
    /**
     * Registered only when both halves of the credential are present. An
     * unconfigured provider would still publish a callback route that fails at
     * the redirect, which reads as a broken site rather than one that has the
     * feature switched off.
     */
    ...(google ? [Google(google)] : []),
  ],
  callbacks: {
    ...authConfig.callbacks,

    /**
     * Google hands back a profile, not one of our accounts. The `jwt` callback
     * in auth.config.ts has to stay free of Mongoose — the proxy loads it on
     * the Edge — so the lookup happens here, in the Node-only half, and only
     * on the sign-in pass where `user` is present.
     */
    async jwt({ token, user, account, profile }) {
      if (!user) return token;

      if (account?.provider === "google") {
        // Auth.js has already validated the ID token; this checks the claim we
        // actually depend on. An unverified address proves nothing about who
        // reads that mailbox, and orders are matched back by email.
        if (profile?.email_verified !== true || !profile.email) return token;

        const resolved = await resolveGoogleUser({
          email: profile.email,
          name: typeof profile.name === "string" ? profile.name : "",
          googleId: typeof profile.sub === "string" ? profile.sub : "",
          ...(typeof profile.picture === "string" ? { image: profile.picture } : {}),
        });
        if (!resolved) return token;

        token.id = resolved.id;
        token.role = resolved.role;
        token.name = resolved.name;
        token.email = resolved.email;
        if (resolved.image) token.picture = resolved.image;
        return token;
      }

      token.id = user.id;
      token.role = user.role;
      return token;
    },
  },
});
