import { Badge } from "@/components/ui/badge";

/**
 * Status pill shared by every admin list.
 *
 * `published` is the only state that uses the brand colour, so scanning a table
 * shows at a glance what is actually live.
 */
const VARIANTS = {
  published: { label: "Published", variant: "default" as const },
  draft: { label: "Draft", variant: "secondary" as const },
  archived: { label: "Archived", variant: "outline" as const },
  new: { label: "New", variant: "default" as const },
  under_review: { label: "Under review", variant: "secondary" as const },
  accepted: { label: "Accepted", variant: "default" as const },
  rejected: { label: "Rejected", variant: "destructive" as const },
};

export function StatusBadge({ status }: { status: string }) {
  const config = VARIANTS[status as keyof typeof VARIANTS] ?? {
    label: status,
    variant: "outline" as const,
  };

  return (
    <Badge variant={config.variant} className="tracking-wide uppercase">
      {config.label}
    </Badge>
  );
}
