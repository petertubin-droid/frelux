/**
 * The honest state of the price book, market by market.
 *
 * Every number here comes from the generated snapshot, so it cannot drift out
 * of step with what the calculators actually use. A market with no recorded
 * prices is shown as such rather than hidden, because a visitor planning a
 * build from abroad is better served by a plain gap than a confident guess.
 */
import { classNames } from "@/lib/utils";
import { coverageList, snapshotDate } from "@/lib/pricing/price-honesty";

const DEFAULT_MARKETS = ["NG", "US", "GB", "CA", "AU", "AE"];

const CODE_TO_LABEL: Record<string, string> = {
  NG: "Nigeria",
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  AE: "United Arab Emirates",
  DE: "Germany",
  ZA: "South Africa",
  KE: "Kenya",
};

export default function PriceCoveragePanel({
  markets = DEFAULT_MARKETS,
  className,
}: {
  markets?: readonly string[];
  className?: string;
}) {
  const rows = coverageList(markets);

  return (
    <div
      className={classNames(
        "rounded-xl border border-border bg-card p-4 text-sm sm:p-5",
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-card-foreground">
          What the price book covers
        </h3>
        <span className="text-xs text-muted-foreground">
          Checked {snapshotDate()}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs sm:text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th scope="col" className="py-1.5 pr-3 font-medium">
                Market
              </th>
              <th scope="col" className="py-1.5 pr-3 font-medium">
                Local prices
              </th>
              <th scope="col" className="py-1.5 pr-3 font-medium">
                From exchange rate
              </th>
              <th scope="col" className="py-1.5 font-medium">
                State
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.marketCode} className="border-t border-border/60">
                <th
                  scope="row"
                  className="py-2 pr-3 text-left font-medium text-card-foreground"
                >
                  {CODE_TO_LABEL[row.marketCode] ?? row.marketCode}
                </th>
                <td className="py-2 pr-3 tabular-nums text-card-foreground">
                  {row.status === "unrecorded"
                    ? "None yet"
                    : `${row.local_verified} of ${row.total}`}
                </td>
                <td className="py-2 pr-3 tabular-nums text-muted-foreground">
                  {row.status === "unrecorded"
                    ? "Not recorded"
                    : row.fx_reference}
                </td>
                <td className="py-2">
                  <span
                    className={classNames(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                      row.status === "local" &&
                        "bg-primary/10 text-brand-purple dark:text-brand-purple-lighter",
                      row.status === "partial" &&
                        "bg-muted text-muted-foreground",
                      (row.status === "reference_only" ||
                        row.status === "unrecorded") &&
                        "bg-muted text-muted-foreground",
                    )}
                  >
                    {row.statusLabel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        A price converted at an exchange rate is a reference figure, not a
        supplier quote. Where a market shows partly local or reference only,
        confirm the total with a supplier before committing money.
      </p>
    </div>
  );
}
