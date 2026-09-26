import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/guards";

/**
 * Shell for the authenticated admin area.
 *
 * Scoped to this route group so /admin/login, which sits outside it, does not
 * render a sidebar to someone who is not signed in. The guard here is the
 * server-side check; the proxy handles routing.
 */
export default async function DashboardLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  return <AdminShell admin={admin}>{children}</AdminShell>;
}
