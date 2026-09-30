import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import type { UserRole } from "@/models/types";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  image?: string;
};

/** Kept as an alias: admin code reads better saying what it requires. */
export type AdminSessionUser = SessionUser;

/**
 * Asserts an admin session.
 *
 * The proxy already redirects unauthenticated requests, but that is routing,
 * not authorisation: a Server Action is reachable by POST without ever passing
 * through a matched page. Every action and every admin page re-checks here.
 */
export async function requireAdmin(): Promise<AdminSessionUser> {
  const session = await auth();
  const user = session?.user;

  if (!user || user.role !== "admin") {
    redirect("/admin/login");
  }

  return {
    id: user.id,
    email: user.email ?? "",
    name: user.name ?? "",
    role: user.role,
  };
}

/** Non-redirecting variant, for places that need to branch rather than bounce. */
export async function getAdminSession(): Promise<AdminSessionUser | null> {
  const session = await auth();
  const user = session?.user;
  if (!user || user.role !== "admin") return null;
  return {
    id: user.id,
    email: user.email ?? "",
    name: user.name ?? "",
    role: user.role,
  };
}

/**
 * Asserts any signed-in account, whatever its role.
 *
 * Account pages show a person their own orders, which staff have as much right
 * to as a reader. The gate here is "is this someone", not "is this staff".
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user;

  if (!user) redirect("/login");

  return {
    id: user.id,
    email: user.email ?? "",
    name: user.name ?? "",
    role: user.role,
    ...(user.image ? { image: user.image } : {}),
  };
}

/** Non-redirecting variant, for chrome that renders either way. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const user = session?.user;
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? "",
    name: user.name ?? "",
    role: user.role,
    ...(user.image ? { image: user.image } : {}),
  };
}
