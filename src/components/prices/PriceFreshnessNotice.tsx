import { Clock, ShieldAlert } from "lucide-react";
import { classNames } from "@/lib/utils";
import {
  freshnessMessage,
  needsVerification,
  priceBookMessage,
  summariseFreshness,
  type FreshnessSummary,
  type PriceBookSummary,
  type PriceStampRow,
} from "@/lib/prices/freshness";

/**
 * States how old the prices behind an estimate are. Sits close to the total,
 * because that is where the number is trusted. Renders nothing when there is
 * nothing true to say.
 */
export function PriceFreshnessNotice({
  rows,
  summary,
  bookSummary,
  className,
}: {
  rows?: PriceStampRow[];
  summary?: FreshnessSummary;
  bookSummary?: PriceBookSummary;
  className?: string;
}) {
  const resolved = summary ?? (rows ? summariseFreshness(rows) : null);
  if (!resolved && !bookSummary) return null;

  const verify = bookSummary
    ? bookSummary.level === "stale" ||
      bookSummary.level === "unknown" ||
      bookSummary.staleCount > 0
    : needsVerification(resolved!);

  const message = bookSummary
    ? priceBookMessage(bookSummary)
    : freshnessMessage(resolved!);

  return (
    <div
      className={classNames(
        "mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 backdrop-blur-sm",
        verify
          ? "border-amber-500/30 bg-amber-500/10"
          : "border-border/70 bg-muted/40 dark:border-white/10 dark:bg-white/5",
        className,
      )}
      role="note"
    >
      {verify ? (
        <ShieldAlert
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
        />
      ) : (
        <Clock
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
        />
      )}
      <div className="text-xs leading-relaxed">
        <p
          className={
            verify
              ? "text-amber-800 dark:text-amber-300"
              : "text-muted-foreground"
          }
        >
          {message}
        </p>
        {!bookSummary && resolved && resolved.level === "unknown" ? (
          <p className="mt-1 text-muted-foreground">
            Confirm current prices with a local supplier before you quote a
            client.
          </p>
        ) : verify ? (
          <p className="mt-1 text-amber-800/90 dark:text-amber-300/90">
            Confirm with a local supplier before you quote a client.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default PriceFreshnessNotice;
