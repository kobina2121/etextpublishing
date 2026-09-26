import {
  AwardIcon,
  BookMarkedIcon,
  BookOpenIcon,
  FileSearchIcon,
  GlobeIcon,
  LayoutTemplateIcon,
  MegaphoneIcon,
  PenLineIcon,
  PrinterIcon,
  ScrollTextIcon,
  SparklesIcon,
  TruckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import type { Service } from "@/types/content";

/**
 * Curated icon set for services.
 *
 * Explicitly enumerated rather than resolved dynamically from the whole of
 * lucide: a namespace import would pull the entire icon library into the
 * bundle, and component identities must be stable across renders. Phase 6
 * offers exactly these keys in the admin.
 */
const SERVICE_ICONS = {
  Award: AwardIcon,
  BookMarked: BookMarkedIcon,
  BookOpen: BookOpenIcon,
  FileSearch: FileSearchIcon,
  Globe: GlobeIcon,
  LayoutTemplate: LayoutTemplateIcon,
  Megaphone: MegaphoneIcon,
  PenLine: PenLineIcon,
  Printer: PrinterIcon,
  ScrollText: ScrollTextIcon,
  Sparkles: SparklesIcon,
  Truck: TruckIcon,
  Users: UsersIcon,
} satisfies Record<string, LucideIcon>;

export const SERVICE_ICON_NAMES = Object.keys(SERVICE_ICONS);

export function ServiceCard({ service }: { service: Service }) {
  // An unrecognised icon name must never break the page.
  const Icon = SERVICE_ICONS[service.icon as keyof typeof SERVICE_ICONS] ?? BookOpenIcon;

  return (
    <article className="border-border hover:border-primary group h-full border p-8 transition-colors">
      <div className="bg-primary text-primary-foreground flex size-14 items-center justify-center">
        <Icon className="size-6" aria-hidden />
      </div>
      <h3 className="group-hover:text-primary mt-6 text-xl transition-colors">{service.title}</h3>
      <p className="text-muted-foreground mt-3 leading-relaxed">{service.summary}</p>
    </article>
  );
}
