import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";

/**
 * Public site shell. The navbar overlays the page so hero sections can run
 * full-bleed beneath it; pages without a hero add their own top spacing.
 */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar overlay />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
