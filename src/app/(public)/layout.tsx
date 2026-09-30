import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { getSessionUser } from "@/lib/auth/guards";

/**
 * Public site shell. The navbar overlays the page so hero sections can run
 * full-bleed beneath it; pages without a hero add their own top spacing.
 *
 * The session is read here and handed down rather than fetched inside the
 * navbar: the navbar is a Client Component, and a `useSession` there would
 * need a provider around the whole tree and a second round trip to learn what
 * the server already knows.
 */
export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar
        account={
          user ? { name: user.name, isAdmin: user.role === "admin" } : null
        }
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
