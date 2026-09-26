"use client";

import { useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

export type FilterOption = { label: string; value: string };

export type FilterGroup = {
  /** Query-string key this group writes to. */
  name: string;
  label: string;
  options: FilterOption[];
};

/** Sentinel for "no filter"; empty string is not a valid Radix Select value. */
const ANY = "__any";

/**
 * Search and filter controls for a listing.
 *
 * All state lives in the URL rather than in React, so a filtered listing is
 * shareable, survives a refresh, and is rendered on the server. Changing a
 * control resets to page 1, because page 3 of a different result set is
 * meaningless.
 */
export function SearchFilters({
  groups = [],
  placeholder = "Search…",
}: {
  groups?: FilterGroup[];
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page");
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
  };

  const onSearch = (value: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      commit((params) => {
        if (value.trim()) params.set("q", value.trim());
        else params.delete("q");
      });
    }, 300);
  };

  const activeCount =
    (searchParams.get("q") ? 1 : 0) +
    groups.filter((group) => searchParams.get(group.name)).length;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <SearchIcon
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          type="search"
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-11 pl-9"
        />
        {isPending ? (
          <Spinner className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2" />
        ) : null}
      </div>

      {groups.map((group) => (
        <Select
          key={group.name}
          value={searchParams.get(group.name) ?? ANY}
          onValueChange={(value) =>
            commit((params) => {
              if (value === ANY) params.delete(group.name);
              else params.set(group.name, value);
            })
          }
        >
          <SelectTrigger className="h-11 sm:w-44" aria-label={group.label}>
            <SelectValue placeholder={group.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All {group.label.toLowerCase()}</SelectItem>
            {group.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {activeCount > 0 ? (
        <Button
          variant="ghost"
          className="h-11"
          onClick={() => startTransition(() => router.replace(pathname))}
        >
          <XIcon aria-hidden />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
