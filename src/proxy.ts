import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth/auth.config";

/**
 * Route gate for /admin.
 *
 * Next 16 renamed the `middleware` file convention to `proxy`; the file must be
 * named proxy.ts and export the handler as default or as `proxy`.
 *
 * Only the edge-safe half of the auth config is loaded here, so the decision is
 * made from the JWT alone. This is routing, not authorisation — every admin
 * page and Server Action re-checks the session with `requireAdmin()`.
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAdmin = req.auth?.user?.role === "admin";

  // Reachable without a session, by necessity: /admin/verify is where a magic
  // link lands, and gating it would redirect the token away before it could be
  // exchanged for a session.
  const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/admin/verify"]);

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    // Already signed in: skip the form. Verify is left alone, so following a
    // link while signed in still lands somewhere sensible.
    if (isAdmin && pathname === "/admin/login") {
      return Response.redirect(new URL("/admin", req.nextUrl));
    }
    return undefined;
  }

  if (!isAdmin) {
    const url = new URL("/admin/login", req.nextUrl);
    // Preserve where they were heading so login can send them back.
    url.searchParams.set("callbackUrl", pathname);
    return Response.redirect(url);
  }

  return undefined;
});

export const config = {
  matcher: ["/admin/:path*"],
};
