/**
 * Admin navigation.
 *
 * One source of truth for the sidebar, the mobile menu and the dashboard's
 * shortcut tiles, so a new section cannot appear in one and not the others.
 */
export const adminNav = [
  { label: "Dashboard", href: "/admin", icon: "LayoutDashboard", exact: true },
  { label: "Publications", href: "/admin/publications", icon: "BookOpen" },
  { label: "Authors", href: "/admin/authors", icon: "Users" },
  { label: "Categories", href: "/admin/categories", icon: "Tags" },
  { label: "Articles", href: "/admin/articles", icon: "Newspaper" },
  { label: "Services", href: "/admin/services", icon: "Wrench" },
  { label: "Manuscripts", href: "/admin/manuscripts", icon: "Inbox" },
  { label: "Messages", href: "/admin/messages", icon: "Mail" },
  { label: "Settings", href: "/admin/settings", icon: "Settings" },
] as const;

export type AdminNavItem = (typeof adminNav)[number];
