/**
 * Public site shell. The Navbar and Footer land here in Phase 3; the wrapper
 * exists now so public routes are separated from the admin route group.
 */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return <div className="flex min-h-dvh flex-col">{children}</div>;
}
