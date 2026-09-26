import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

/**
 * Pagination rendered as real links, so pages are crawlable and work without
 * JavaScript. Existing filters are preserved in every href.
 */
export function ListPagination({
  page,
  pageCount,
  basePath,
  params,
}: {
  page: number;
  pageCount: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  const hrefFor = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set("page", String(target));
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  // Always show first and last, plus a window around the current page.
  const numbers = [...Array(pageCount).keys()]
    .map((index) => index + 1)
    .filter((n) => n === 1 || n === pageCount || Math.abs(n - page) <= 1);

  return (
    <Pagination className="mt-12">
      <PaginationContent>
        {page > 1 ? (
          <PaginationItem>
            <PaginationPrevious href={hrefFor(page - 1)} />
          </PaginationItem>
        ) : null}

        {numbers.map((n, index) => {
          const previous = numbers[index - 1];
          return (
            <PaginationItem key={n}>
              {previous !== undefined && n - previous > 1 ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink href={hrefFor(n)} isActive={n === page}>
                  {n}
                </PaginationLink>
              )}
            </PaginationItem>
          );
        })}

        {page < pageCount ? (
          <PaginationItem>
            <PaginationNext href={hrefFor(page + 1)} />
          </PaginationItem>
        ) : null}
      </PaginationContent>
    </Pagination>
  );
}
