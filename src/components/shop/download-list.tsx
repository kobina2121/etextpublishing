import { DownloadIcon, HourglassIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DownloadItem } from "@/server/downloads";

/** An order's softcopies, each with its download button. */
export function DownloadList({ items }: { items: DownloadItem[] }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {items.map((item) => (
        <li
          key={item.publicationId}
          className="flex flex-wrap items-center justify-between gap-3 py-4"
        >
          <div className="min-w-0">
            <p className="font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">
              {item.url
                ? [
                    "Softcopy",
                    item.fileName.split(".").pop()?.toUpperCase(),
                    item.size ? `${(item.size / 1024 / 1024).toFixed(1)} MB` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Softcopy"}
            </p>
          </div>
          {item.url ? (
            <Button asChild className="font-semibold tracking-[0.08em] uppercase">
              {/* A plain link: a file download, not a page. */}
              <a href={item.url} download>
                <DownloadIcon aria-hidden />
                Download
              </a>
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <HourglassIcon className="size-4" aria-hidden />
              Being prepared — we will email you
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
