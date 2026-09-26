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
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    // Already signed in: skip the form.
    if (isAdmin) return Response.redirect(new URL("/admin", req.nextUrl));
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
