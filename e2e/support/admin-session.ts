import type { BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";

/**
 * Signs a browser context in as an admin, without going through Google.
 *
 * Staff sign in with Google only, and a test cannot drive Google's consent
 * screen. Instead this writes the same session cookie Auth.js would, signed
 * with AUTH_SECRET, so the app sees an ordinary admin session.
 *
 * The identity is test-only and has no database record. It can do nothing a
 * holder of AUTH_SECRET could not already do — anyone with that secret can
 * mint any session — which is why the secret never leaves the server.
 */

// Auth.js names the cookie after the protocol; the dev server is plain http.
const COOKIE_NAME = "authjs.session-token";

export async function signInAsAdmin(context: BrowserContext): Promise<void> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set. Add it to .env.local.");

  const token = await encode({
    secret,
    salt: COOKIE_NAME,
    maxAge: 60 * 60,
    token: {
      sub: "0".repeat(24),
      id: "0".repeat(24),
      role: "admin",
      name: "E2E Admin",
      email: "e2e-admin@example.com",
    },
  });

  await context.addCookies([
    {
      name: COOKIE_NAME,
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
