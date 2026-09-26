"use client";

import { useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

const ANY = "__any";

/** Search and status filter for an admin list. State lives in the URL. */
export function AdminSearch({
  placeholder = "Search…",
  statuses,
}: {
  placeholder?: string;
  statuses?: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = (mutate: (p: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          defaultValue={searchParams.get("q") ?? ""}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-10 pl-9"
          onChange={(event) => {
            const value = event.target.value;
            if (debounce.current) clearTimeout(debounce.current);
            debounce.current = setTimeout(() => {
              commit((p) => (value.trim() ? p.set("q", value.trim()) : p.delete("q")));
            }, 300);
          }}
        />
        {pending ? (
          <Spinner className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground" />
        ) : null}
      </div>

      {statuses ? (
        <Select
          value={searchParams.get("status") ?? ANY}
          onValueChange={(value) =>
            commit((p) => (value === ANY ? p.delete("status") : p.set("status", value)))
          }
        >
          <SelectTrigger className="h-10 sm:w-44" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}
