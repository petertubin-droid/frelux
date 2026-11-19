import { useMemo, useState } from "react";
import {
  calculateEn12056Drainage,
  calculateUpcIpcDrainage,
} from "@/lib/estimation/plumbing-standards-engine";

export default function RegionalDrainageCheck({
  marketCode,
}: {
  marketCode: string;
}) {
  const market = marketCode.trim().toUpperCase();
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
  const us = market === "US" || market === "CA";
  const eu = market === "GB" || market === "IE";
  const counts = [wcs, basins, showers, sinks].map((v) =>
    Math.max(0, Number(v) || 0),
  );
  const result = useMemo(() => {
    if (us)
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
    if (eu)
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
    return null;
  }, [us, eu, counts.join(","), slope, usage]);
  if (!result)
    return (
      <section className="mt-6 rounded-lg border border-amber-600/40 bg-amber-600/5 p-4 text-sm">
        <h3 className="font-semibold">
          Regional drainage reference unavailable for {market || "this market"}
        </h3>
        <p className="mt-1 text-muted-foreground">
          The attached IPC/UPC and EN 12056 preliminary references do not cover
          this market. Use locally adopted requirements and a qualified plumbing
          designer.
        </p>
      </section>
    );
  const field = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";
  return (
    <section
      aria-labelledby="regional-drainage-heading"
      className="mt-6 rounded-lg border p-5"
    >
      <h2 id="regional-drainage-heading" className="font-semibold">
        Regional sanitary drainage reference check
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Planning-level fixture aggregation only. Confirm adopted code edition,
        pipe layout, venting, fixture branches, material and local amendments
        before design.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Water closets", wcs, setWcs],
          [us ? "Lavatories" : "Wash basins", basins, setBasins],
          ["Showers", showers, setShowers],
          ["Kitchen sinks", sinks, setSinks],
        ].map(([label, value, setter]) => (
          <label key={String(label)} className="text-sm">
            <span className="font-medium">{String(label)}</span>
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
        {us && (
          <label className="text-sm">
            <span className="font-medium">Drain slope class</span>
            <select
              className={field}
              value={slope}
              onChange={(e) => setSlope(e.target.value as "1/8" | "1/4")}
            >
              <option value="1/4">1/4 in/ft</option>
              <option value="1/8">1/8 in/ft</option>
            </select>
          </label>
        )}
        {eu && (
          <label className="text-sm">
            <span className="font-medium">Building usage</span>
            <select
              className={field}
              value={usage}
              onChange={(e) => setUsage(e.target.value as typeof usage)}
            >
              <option value="residential_intermittent">
                Residential intermittent
              </option>
              <option value="commercial_regular">Commercial regular</option>
              <option value="public_frequent">Public frequent</option>
              <option value="heavy_congested">Heavy/congested</option>
            </select>
          </label>
        )}
      </div>
      <div
        aria-live="polite"
        className="mt-4 rounded-md bg-muted/40 p-3 text-sm"
      >
        <p className="font-medium">
          {result.system === "us"
            ? `${result.data.total_dfu} DFU · preliminary ${result.data.recommended_drain_size_inches} drain`
            : `${result.data.sum_du} DU · ${result.data.total_design_flow_qtot_lps} L/s · preliminary ${result.data.recommended_stack_dn} stack`}
        </p>
        <p className="mt-1 text-muted-foreground">
          Reference: {result.data.standards_reference}
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          {result.data.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
