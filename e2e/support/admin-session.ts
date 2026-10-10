import type { BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";

import { ensureTestAdmin } from "./db";

/**
 * Signs a browser context in as an admin, without going through Google.
 *
 * A test cannot drive Google's consent screen. Instead this writes the same
 * session cookie Auth.js would, signed with AUTH_SECRET, for a real test admin
 * account — sessions are checked against the database on every request, so a
 * made-up identity would be signed straight out. The account is removed when
 * the run ends (see global-teardown.ts).
 *
 * It can do nothing a holder of AUTH_SECRET could not already do — anyone with
 * that secret can mint any session — which is why the secret never leaves the
 * server.
 */

// Auth.js names the cookie after the protocol; the dev server is plain http.
const COOKIE_NAME = "authjs.session-token";

export const TEST_ADMIN_EMAIL = "e2e-admin@example.com";

export async function signInAsAdmin(context: BrowserContext): Promise<void> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set. Add it to .env.local.");

  const admin = await ensureTestAdmin(TEST_ADMIN_EMAIL);

  const token = await encode({
    secret,
    salt: COOKIE_NAME,
    maxAge: 60 * 60,
    token: {
      sub: admin.id,
      id: admin.id,
      role: "admin",
      sv: admin.sessionVersion,
      name: "E2E Admin",
      email: TEST_ADMIN_EMAIL,
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
