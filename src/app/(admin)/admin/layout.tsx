import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  // Belt and braces: the proxy already gates these routes, but the dashboard
  // must never be indexed even if that gate is ever misconfigured.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-dvh bg-muted/30">{children}</div>;
}
