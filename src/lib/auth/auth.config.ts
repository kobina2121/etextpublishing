import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe half of the Auth.js configuration.
 *
 * This file must not import Mongoose, bcrypt, or anything else that needs
 * Node: it is loaded by `proxy.ts`, which runs on the Edge runtime. The
 * Credentials provider lives in `@/lib/auth` instead, which only ever runs in
 * the Node runtime behind the auth route handler.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  /**
   * The public page, not the staff one.
   *
   * These are where Auth.js sends someone when it needs a sign-in or has an
   * error to report, and most of those people are now readers. Pointing them
   * at /admin/login asked a reader for a password they have never had.
   *
   * Staff are unaffected: the proxy redirects to /admin/login itself, the
   * admin form posts its credentials directly, and /login links across to it.
   */
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      // `user` is only present on the sign-in pass; afterwards the claims are
      // read back off the existing token.
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id;
      if (token.role) session.user.role = token.role;
      return session;
    },
  },
} satisfies NextAuthConfig;
