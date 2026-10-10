import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe half of the Auth.js configuration.
 *
 * This file must not import Mongoose or anything else that needs Node: it
 * is loaded by `proxy.ts`, which runs on the Edge runtime. The Google provider
 * and its database lookup live in `@/lib/auth` instead, which only ever runs in
 * the Node runtime behind the auth route handler.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  /**
   * The one sign-in page, for readers and staff alike. Where someone lands
   * afterwards is decided by the role on their account.
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
