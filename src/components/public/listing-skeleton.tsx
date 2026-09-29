import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Listing placeholders.
 *
 * Deliberately per-listing rather than one boundary on the whole public
 * segment: a blanket loading.tsx would flash a book grid on /contact, and its
 * Suspense boundary starts the response streaming, which pins detail pages to
 * HTTP 200 even when they call notFound().
 */
export function ListingSkeleton({
  variant,
  count = 6,
}: {
  variant: "grid" | "cards" | "articles";
  count?: number;
}) {
  return (
    <>
      <div className="bg-brand-dark pt-36 pb-16 sm:pt-40 sm:pb-20">
        <Container width="wide">
          <Skeleton className="h-11 w-64 bg-white/15" />
          <Skeleton className="mt-4 h-5 w-full max-w-xl bg-white/10" />
        </Container>
      </div>

      <Section>
        <Container width="wide">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="mt-6 h-4 w-24" />

          {variant === "articles" ? (
            <div className="mt-8 space-y-8">
              {Array.from({ length: count }, (_, index) => (
                <div key={index} className="border-border space-y-3 border-b pb-6">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-7 w-2/3" />
                  <Skeleton className="h-4 w-full max-w-xl" />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: count }, (_, index) => (
                <div key={index} className="space-y-3">
                  <Skeleton
                    className={variant === "grid" ? "aspect-[2/3] w-full" : "h-56 w-full"}
                  />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
