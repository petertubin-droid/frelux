import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Shared admin pagination control.
 *
 * Used by every admin list page that queries with `.range()` so tables of
 * any size (color galleries, message inboxes, price submissions…) page
 * through data instead of loading everything at once.
 *
 * Renders "Showing X–Y of Z", a compact page-number window, prev/next
 * buttons, and an optional page-size selector.
 */

export interface AdminPaginationProps {
  /** Zero-based page index. */
  page: number;
  pageSize: number;
  /** Total row count (from a `count: "exact"` head query). */
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  /** Optional page-size choices for the selector. First is the default shown. */
  pageSizeOptions?: number[];
  loading?: boolean;
}

export const ADMIN_PAGINATION_PAGE_SIZES = [10, 25, 50, 100];

function pageWindow(current: number, totalPages: number): number[] {
  // Compact window of at most 5 page numbers around the current page.
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i);
  let start = Math.max(0, current - 2);
  const end = Math.min(totalPages - 1, start + 4);
  start = Math.max(0, end - 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export default function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = ADMIN_PAGINATION_PAGE_SIZES,
  loading = false,
}: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pages = useMemo(
    () => pageWindow(safePage, totalPages),
    [safePage, totalPages],
  );

  const from = total === 0 ? 0 : safePage * pageSize + 1;
  const to = Math.min(total, (safePage + 1) * pageSize);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
      <p aria-live="polite">
        {loading && total === 0
          ? "Loading…"
          : `Showing ${from}\u2013${to} of ${total}`}
      </p>
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5">
            <span className="sr-only">Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Rows per page"
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-brand-purple/50 dark:border-border dark:bg-card dark:text-primary-foreground"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={safePage === 0 || loading}
            onClick={() => onPageChange(safePage - 1)}
            aria-label="Previous page"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 dark:border-border dark:text-primary-foreground dark:hover:bg-card-foreground/90"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              disabled={loading}
              onClick={() => onPageChange(p)}
              aria-label={`Page ${p + 1}`}
              aria-current={p === safePage ? "page" : undefined}
              className={
                p === safePage
                  ? "h-8 min-w-8 rounded-md bg-primary px-2 text-xs font-semibold text-primary-foreground"
                  : "h-8 min-w-8 rounded-md border border-border px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40 dark:border-border dark:text-primary-foreground dark:hover:bg-card-foreground/90"
              }
            >
              {p + 1}
            </button>
          ))}
          <button
            type="button"
            disabled={safePage >= totalPages - 1 || loading}
            onClick={() => onPageChange(safePage + 1)}
            aria-label="Next page"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 dark:border-border dark:text-primary-foreground dark:hover:bg-card-foreground/90"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
