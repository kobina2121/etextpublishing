import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth/auth.config";

/**
 * Route gate for /admin, /account and the sign-in page.
 *
 * Next 16 renamed the `middleware` file convention to `proxy`; the file must be
 * named proxy.ts and export the handler as default or as `proxy`.
 *
 * Only the edge-safe half of the auth config is loaded here, so the decision is
 * made from the JWT alone. This is routing, not authorisation — every admin
 * page and Server Action re-checks with `requireAdmin()`, and every account
 * page with `requireUser()`.
 *
 * Both areas bounce to the same place. /admin needs the admin role and
 * /account needs only a session, but there is one sign-in page for everyone
 * and the role decides where they land afterwards.
 */
const { auth } = NextAuth(authConfig);

// Reachable without a session, by necessity: /admin/verify is where a magic
// link lands, and gating it would redirect the token away before it could be
// exchanged for a session. /admin/login is now just a redirect to /login, and
// has to be reachable for that redirect to run.
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
    // Signed in, but not staff. Sending them to the sign-in page would be a
    // dead end — they are already signed in, and signing in again changes
    // nothing — so they go where their account actually lives.
    if (isSignedIn) {
      return Response.redirect(new URL("/account", req.nextUrl));
    }

    const url = new URL("/login", req.nextUrl);
    // Preserve where they were heading so sign-in can send them back.
    url.searchParams.set("callbackUrl", pathname);
    return Response.redirect(url);
  }

  return undefined;
});

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/login"],
};
