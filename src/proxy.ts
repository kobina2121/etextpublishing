import { auth } from "@/lib/auth";

/**
 * Route gate for /admin, /account and the sign-in and sign-up pages.
 *
 * Next 16 renamed the `middleware` file convention to `proxy`; the file must be
 * named proxy.ts and export the handler as default or as `proxy`.
 *
 * Next 16 runs the proxy on Node.js, so this uses the full auth, which checks
 * each session against the database: a session ended by a password change, or
 * an admin whose role was revoked, is treated as such here too. Deciding from
 * the cookie alone sent an ended session from /account to /login and straight
 * back again, because the cookie still looked signed in.
 *
 * This is still routing, not authorisation — every admin page and Server
 * Action re-checks with `requireAdmin()`, and every account page with
 * `requireUser()`.
 *
 * Both areas bounce to the same place. /admin needs the admin role and
 * /account needs only a session, but there is one sign-in page for everyone
 * and the role decides where they land afterwards.
 */

// /admin/login is now just a redirect to /login, kept for old bookmarks. It has
// to be reachable without a session for that redirect to run.
const PUBLIC_ADMIN_PATHS = new Set(["/admin/login"]);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;
  const isAdmin = role === "admin";
  const isSignedIn = Boolean(req.auth?.user);

  if (pathname === "/login" || pathname === "/register") {
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
  matcher: ["/admin/:path*", "/account/:path*", "/login", "/register"],
};
