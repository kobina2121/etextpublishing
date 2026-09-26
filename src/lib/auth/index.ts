import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { authConfig } from "@/lib/auth/auth.config";
import { consumeMagicLink } from "@/lib/auth/magic-link";
import { connectToDatabase } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";
import { User } from "@/models";

/**
 * A valid bcrypt hash of a value nobody knows.
 *
 * When no user matches, the password is still compared against this so a
 * missing account and a wrong password take the same time. Without it, response
 * timing tells an attacker which email addresses exist.
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
        const user = await User.findOne({ email: parsed.data.email.toLowerCase() });

        if (!user) {
          await bcrypt.compare(parsed.data.password, DUMMY_HASH);
          return null;
        }

        // This application only has an admin login. Any other role is refused
        // here as well as in the proxy, so a downgraded account cannot sign in.
        if (user.role !== "admin") {
          await bcrypt.compare(parsed.data.password, DUMMY_HASH);
          return null;
        }

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
    /**
     * Magic-link sign-in.
     *
     * A second Credentials provider rather than Auth.js's Email provider,
     * which requires a database adapter. Hand-rolling the token keeps JWT
     * sessions, which the edge proxy depends on, and keeps the storage and
     * expiry rules visible in one place.
     */
    Credentials({
      id: "magic-link",
      name: "Email link",
      credentials: { token: { label: "Token", type: "text" } },
      async authorize(raw) {
        const token = typeof raw?.token === "string" ? raw.token : "";
        const result = await consumeMagicLink(token);
        if (!result.ok) return null;
        return result.user;
      },
    }),
  ],
});
