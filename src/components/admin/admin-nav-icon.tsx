import {
  BookOpenIcon,
  InboxIcon,
  LayoutDashboardIcon,
  MailIcon,
  NewspaperIcon,
  SettingsIcon,
  TagsIcon,
  UsersIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";

/**
 * Explicit map rather than a namespace import: importing all of lucide pulls
 * the whole icon library into the bundle, and component identities must be
 * stable across renders.
 */
const ICONS = {
  LayoutDashboard: LayoutDashboardIcon,
  BookOpen: BookOpenIcon,
  Users: UsersIcon,
  Tags: TagsIcon,
  Newspaper: NewspaperIcon,
  Wrench: WrenchIcon,
  Inbox: InboxIcon,
  Mail: MailIcon,
  Settings: SettingsIcon,
} satisfies Record<string, LucideIcon>;

export type AdminIconName = keyof typeof ICONS;

export function AdminNavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name as AdminIconName] ?? LayoutDashboardIcon;
  return <Icon className={className} aria-hidden />;
}
