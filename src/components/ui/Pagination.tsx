import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";

/**
 * Shared pagination control: Previous / page numbers / Next.
 *
 * Used by the paginated article listings (Learn hub "All articles",
 * LearnCategory) at 20 articles per page. URL state (?page=N) is owned
 * by the caller via onPageChange; this component is purely presentational.
 */
export default function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  /** Current page, 1-indexed. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Sliding page-number window: always show 1 and totalPages, plus the
  // pages around the current one, with ellipsis for gaps.
  const numbers: (number | "…")[] = [];
  const windowStart = Math.max(2, page - 1);
  const windowEnd = Math.min(totalPages - 1, page + 1);
  numbers.push(1);
  if (windowStart > 2) numbers.push("…");
  for (let i = windowStart; i <= windowEnd; i++) numbers.push(i);
  if (windowEnd < totalPages - 1) numbers.push("…");
  if (totalPages > 1) numbers.push(totalPages);

  return (
    <nav
      aria-label="Article pagination"
      className="mt-10 flex flex-wrap items-center justify-center gap-2"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
        className="gap-1.5"
      >
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        Previous
      </Button>
      {numbers.map((n, i) =>
        n === "…" ? (
          <span
            key={`ellipsis-${i}`}
            className="px-2 text-sm text-muted-foreground"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <Button
            key={n}
            type="button"
            variant={n === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(n)}
            aria-label={`Page ${n}`}
            aria-current={n === page ? "page" : undefined}
            className="min-w-[2.5rem]"
          >
            {n}
          </Button>
        ),
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
        className="gap-1.5"
      >
        Next
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </Button>
    </nav>
  );
}
