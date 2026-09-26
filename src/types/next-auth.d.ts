import type { UserRole } from "@/models/types";

/**
 * Adds `role` and `id` to the session, user and token.
 *
 * Augmentation targets `@auth/core/*`, not `next-auth`: next-auth only
 * re-exports these interfaces, so declaring them on the `next-auth` module
 * creates new, unrelated types instead of merging with the real ones.
 *
 * The role is carried on the JWT rather than looked up per request, because
 * `proxy.ts` runs on the Edge runtime where Mongoose cannot — the token is the
 * only thing it can read to make an access decision.
 */
declare module "@auth/core/types" {
  interface User {
    role: UserRole;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
  }
}

export {};
