import type { NextAuthConfig } from "next-auth";

/**
 * The database-free base of the Auth.js configuration: pages, session strategy,
 * and copying our claims onto the session.
 *
 * Providers and every database check are added in `@/lib/auth`, which is what
 * the app and the proxy use. Kept apart so this part stays importable anywhere,
 * including on the Edge should the proxy ever move back there.
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
