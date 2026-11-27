import { useMemo, useState } from "react";
import {
  calculateEn12056Drainage,
  calculateUpcIpcDrainage,
} from "@/lib/estimation/plumbing-standards-engine";
import { Badge } from "@/components/ui/shadcn/badge";
import { AlertTriangle } from "lucide-react";

export default function RegionalDrainageCheck({
  marketCode,
}: {
  marketCode: string;
}) {
  const market = marketCode.trim().toUpperCase();
  const isDefaultUs = market === "US" || market === "CA";
  const isDefaultEu = market === "GB" || market === "IE";

  const [selectedStandard, setSelectedStandard] = useState<"us" | "eu">(
    isDefaultEu ? "eu" : "us",
  );

  const [wcs, setWcs] = useState("2");
  const [basins, setBasins] = useState("2");
  const [showers, setShowers] = useState("2");
  const [sinks, setSinks] = useState("1");
  const [usage, setUsage] = useState<
    | "residential_intermittent"
    | "commercial_regular"
    | "public_frequent"
    | "heavy_congested"
  >("residential_intermittent");
  const [slope, setSlope] = useState<"1/8" | "1/4">("1/4");

  const counts = [wcs, basins, showers, sinks].map((v) =>
    Math.max(0, Number(v) || 0),
  );

  const isNativeMarket =
    (selectedStandard === "us" && isDefaultUs) ||
    (selectedStandard === "eu" && isDefaultEu);

  const result = useMemo(() => {
    if (selectedStandard === "us") {
      return {
        system: "us" as const,
        data: calculateUpcIpcDrainage(
          {
            water_closets: counts[0],
            lavatories: counts[1],
            showers: counts[2],
            kitchen_sinks: counts[3],
          },
          slope,
        ),
      };
    }
    return {
      system: "eu" as const,
      data: calculateEn12056Drainage(
        {
          wcs_6l: counts[0],
          wash_basins: counts[1],
          showers: counts[2],
          kitchen_sinks: counts[3],
        },
        usage,
      ),
    };
  }, [selectedStandard, counts, slope, usage]);

  const field = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";

  return (
    <section
      aria-labelledby="regional-drainage-heading"
      className="mt-6 rounded-xl border border-border bg-card p-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <h2
            id="regional-drainage-heading"
            className="text-sm font-semibold text-foreground"
          >
            Sanitary Drainage Fixture Load & Sizing Check
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Preliminary fixture aggregation and stack/drain dimensioning.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="drainage-standard-selector"
            className="text-xs font-medium text-foreground whitespace-nowrap"
          >
            Plumbing Code Reference:
          </label>
          <select
            id="drainage-standard-selector"
            className="rounded-md border border-input bg-background px-2.5 py-1 text-xs"
            value={selectedStandard}
            onChange={(e) => setSelectedStandard(e.target.value as "us" | "eu")}
          >
            <option value="us">IPC / UPC (North America - DFU)</option>
            <option value="eu">EN 12056-2 (Europe/UK - System I DU)</option>
          </select>
        </div>
      </div>

      {!isNativeMarket && (
        <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <p>
            <strong>Market Adoption Note:</strong> Market{" "}
            <strong>{market || "International"}</strong> is not natively mapped
            to {selectedStandard === "us" ? "IPC/UPC" : "EN 12056"}. This
            assessment uses the selected standard purely as an indicative
            engineering reference. Consult local municipal bylaws, trap
            requirements, and a licensed mechanical engineer.
          </p>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Water closets (WC)", wcs, setWcs],
          [
            selectedStandard === "us" ? "Lavatories" : "Wash basins",
            basins,
            setBasins,
          ],
          ["Showers", showers, setShowers],
          ["Kitchen sinks", sinks, setSinks],
        ].map(([label, value, setter]) => (
          <label key={String(label)} className="text-xs">
            <span className="font-medium text-foreground">{String(label)}</span>
            <input
              className={field}
              inputMode="numeric"
              type="number"
              min="0"
              value={String(value)}
              onChange={(e) => (setter as (v: string) => void)(e.target.value)}
            />
          </label>
        ))}

        {selectedStandard === "us" && (
          <label className="text-xs">
            <span className="font-medium text-foreground">
              Drain slope class
            </span>
            <select
              className={field}
              value={slope}
              onChange={(e) => setSlope(e.target.value as "1/8" | "1/4")}
            >
              <option value="1/4">1/4 in/ft (2.08% standard slope)</option>
              <option value="1/8">1/8 in/ft (1.04% min for ≥ 4" pipes)</option>
            </select>
          </label>
        )}

        {selectedStandard === "eu" && (
          <label className="text-xs">
            <span className="font-medium text-foreground">
              Building usage category
            </span>
            <select
              className={field}
              value={usage}
              onChange={(e) => setUsage(e.target.value as typeof usage)}
            >
              <option value="residential_intermittent">
                Residential intermittent (K = 0.5)
              </option>
              <option value="commercial_regular">
                Commercial regular (K = 0.7)
              </option>
              <option value="public_frequent">Public frequent (K = 1.0)</option>
              <option value="heavy_congested">
                Heavy / congested (K = 1.2)
              </option>
            </select>
          </label>
        )}
      </div>

      <div
        aria-live="polite"
        className="mt-4 rounded-lg bg-muted/40 p-4 text-xs space-y-2 border border-border/60"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2">
          <p className="font-semibold text-sm text-foreground">
            {result.system === "us"
              ? `${result.data.total_dfu} DFU · Recommended Min Drain: ${result.data.recommended_drain_size_inches}`
              : `${result.data.sum_du} DU · Peak Flow: ${result.data.total_design_flow_qtot_lps} L/s · Recommended Stack: ${result.data.recommended_stack_dn}`}
          </p>
          <Badge variant="outline" className="text-xs bg-card">
            {result.system === "us"
              ? `Slope ${result.data.minimum_slope_inch_per_ft}`
              : usage.replace("_", " ")}
          </Badge>
        </div>

        <p className="text-muted-foreground">
          <strong>Governing Reference:</strong>{" "}
          {result.data.standards_reference}
        </p>
        <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
          {result.data.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
