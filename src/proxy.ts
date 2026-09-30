import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth/auth.config";

/**
 * Route gate for /admin and /account.
 *
 * Next 16 renamed the `middleware` file convention to `proxy`; the file must be
 * named proxy.ts and export the handler as default or as `proxy`.
 *
 * Only the edge-safe half of the auth config is loaded here, so the decision is
 * made from the JWT alone. This is routing, not authorisation — every admin
 * page and Server Action re-checks with `requireAdmin()`, and every account
 * page with `requireUser()`.
 *
 * The two areas answer to different rules and bounce to different places.
 * /admin needs the admin role; /account needs only a session, and a customer
 * sent to the admin form would be asked for a password they have never set.
 */
const { auth } = NextAuth(authConfig);

// Reachable without a session, by necessity: /admin/verify is where a magic
// link lands, and gating it would redirect the token away before it could be
// exchanged for a session.
const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/admin/verify"]);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;
  const isAdmin = role === "admin";
  const isSignedIn = Boolean(req.auth?.user);

  if (pathname === "/login") {
    // Already signed in: skip the form, and send staff somewhere useful.
    if (isSignedIn) {
      return Response.redirect(new URL(isAdmin ? "/admin" : "/account", req.nextUrl));
    }
    return undefined;
  }

  if (pathname.startsWith("/account")) {
    if (!isSignedIn) {
      const url = new URL("/login", req.nextUrl);
      url.searchParams.set("callbackUrl", pathname);
      return Response.redirect(url);
    }
    return undefined;
  }

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
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
  matcher: ["/admin/:path*", "/account/:path*", "/login"],
};
