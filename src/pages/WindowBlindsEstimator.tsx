// =========================================================
// WINDOW BLIND ESTIMATOR (/window-blind-calculator)
//
// A job is a schedule of openings, not one window, so the page collects the
// whole list: label, type, size, count and whether it is motorised. The
// deterministic engine prices each row (rate, then the market minimum, then the
// type's waste allowance), applies the grade, adds extras and fitting, and the
// page shows the schedule, the blended rate and every assumption beside it.
//
// Nigeria carries verified rates. Every other market is asked for its own rate
// rather than being handed a Lagos price, extras are priced only when the owner
// supplies the figure, and tax is never assumed.
// =========================================================

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Blinds, Info, Plus, Ruler, Trash2, Wrench } from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { useSeo } from "@/lib/seo";
import { formatCurrency } from "@/lib/utils";
import {
  BLIND_EXTRAS,
  BLIND_GRADES,
  BLIND_MARKETS,
  BLIND_TYPES,
  type BlindExtraKey,
  type BlindGradeKey,
  type BlindTypeKey,
} from "@/config/window-blinds";
import {
  calculateBlindProject,
  type BlindOpening,
  type LengthUnit,
} from "@/lib/estimation/window-blinds-engine";

const labelClass = "text-sm font-medium text-foreground";
const fieldClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";

const SAMPLE_SIZES = [
  { label: "3 x 4 ft", width: 3, height: 4 },
  { label: "4 x 4 ft", width: 4, height: 4 },
  { label: "5 x 4 ft", width: 5, height: 4 },
  { label: "6 x 4 ft", width: 6, height: 4 },
  { label: "Door 3 x 7 ft", width: 3, height: 7 },
];

let rowSeq = 0;
const nextId = () => `row-${++rowSeq}`;

const newOpening = (over: Partial<BlindOpening> = {}): BlindOpening => ({
  id: nextId(),
  label: "",
  typeKey: "day-night",
  width: 4,
  height: 4,
  quantity: 1,
  motorised: false,
  ...over,
});

export default function WindowBlindsEstimator() {
  useSeo({
    title:
      "Window Blind Calculator: Cost per Window and per Square Metre | FRELUX",
    description:
      "Price a whole schedule of roller, zebra, day and night, vertical, venetian, roman, faux wood and wooden blinds from the measured openings, with waste, minimum charge per window, grade and fitting.",
  });

  const [market, setMarket] = useState("NG");
  const [unit, setUnit] = useState<LengthUnit>("ft");
  const [grade, setGrade] = useState<BlindGradeKey>("standard");
  const [install, setInstall] = useState(true);
  const [openings, setOpenings] = useState<BlindOpening[]>([
    newOpening({ label: "Living room", typeKey: "day-night" }),
    newOpening({ label: "Bedroom", typeKey: "roller", width: 3 }),
  ]);
  const [activeRow, setActiveRow] = useState<string | null>(null);
  const [manualRate, setManualRate] = useState("");
  const [manualMinimum, setManualMinimum] = useState("");
  const [extras, setExtras] = useState<Partial<Record<BlindExtraKey, string>>>(
    {},
  );

  const marketOption =
    BLIND_MARKETS.find((m) => m.code === market) ?? BLIND_MARKETS[0];

  const result = useMemo(() => {
    const extrasNumbers: Partial<Record<BlindExtraKey, number>> = {};
    for (const extra of BLIND_EXTRAS) {
      const raw = Number(extras[extra.key]);
      if (raw > 0) extrasNumbers[extra.key] = raw;
    }
    return calculateBlindProject({
      market,
      unit,
      grade,
      openings,
      install,
      extras: extrasNumbers,
      manualPerM2: Number(manualRate) || undefined,
      manualMinimumPerWindow: Number(manualMinimum) || undefined,
    });
  }, [
    market,
    unit,
    grade,
    openings,
    install,
    extras,
    manualRate,
    manualMinimum,
  ]);

  const money = (value: number | null) =>
    value === null
      ? "Needs a price"
      : formatCurrency(
          value,
          result.currencySymbol ?? marketOption.currencySymbol,
        );

  const patch = (id: string, changes: Partial<BlindOpening>) =>
    setOpenings((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...changes } : row)),
    );

  const switchMarket = (code: string) => {
    setMarket(code);
    const next = BLIND_MARKETS.find((m) => m.code === code);
    if (next && next.defaultUnit !== unit) {
      const factor = next.defaultUnit === "m" ? 0.3048 : 1 / 0.3048;
      setUnit(next.defaultUnit);
      setOpenings((rows) =>
        rows.map((row) => ({
          ...row,
          width: Math.round(row.width * factor * 100) / 100,
          height: Math.round(row.height * factor * 100) / 100,
        })),
      );
    }
  };

  const switchUnit = (next: LengthUnit) => {
    if (next === unit) return;
    const factor = next === "m" ? 0.3048 : 1 / 0.3048;
    setUnit(next);
    setOpenings((rows) =>
      rows.map((row) => ({
        ...row,
        width: Math.round(row.width * factor * 100) / 100,
        height: Math.round(row.height * factor * 100) / 100,
      })),
    );
  };

  const applySample = (sample: { width: number; height: number }) => {
    const target = activeRow ?? openings[openings.length - 1]?.id;
    if (!target) return;
    const factor = unit === "m" ? 0.3048 : 1;
    patch(target, {
      width: Math.round(sample.width * factor * 100) / 100,
      height: Math.round(sample.height * factor * 100) / 100,
    });
  };

  const downloadCsv = () => {
    const header = [
      "Opening",
      "Type",
      "Width m",
      "Height m",
      "Area m2",
      "Charged m2",
      "Windows",
      "Rate per m2",
      "Minimum",
      "Per window",
      "Blinds",
      "Extras",
    ];
    const rows = result.rows.map((row) => [
      row.label,
      row.typeLabel,
      String(row.widthM),
      String(row.heightM),
      String(row.areaM2),
      String(row.chargeableAreaM2),
      String(row.quantity),
      row.ratePerM2 === null ? "manual" : String(row.ratePerM2),
      row.minimumPerWindow === null ? "none" : String(row.minimumPerWindow),
      row.perWindow === null ? "manual" : String(row.perWindow),
      row.blindsTotal === null ? "manual" : String(row.blindsTotal),
      row.extrasTotal === null ? "manual" : String(row.extrasTotal),
    ]);
    const summary = [
      [],
      ["Windows", String(result.geometry.windowCount)],
      ["Charged area m2", String(result.geometry.totalChargeableAreaM2)],
      [
        "Blended rate per m2",
        result.geometry.blendedRatePerM2 === null
          ? "manual"
          : String(result.geometry.blendedRatePerM2),
      ],
      [
        "Blinds",
        result.totals.blinds === null ? "manual" : String(result.totals.blinds),
      ],
      [
        "Extras",
        result.totals.extras === null ? "manual" : String(result.totals.extras),
      ],
      [
        "Fitting",
        result.totals.installation === null
          ? "not priced"
          : String(result.totals.installation),
      ],
      [
        "Total before tax",
        result.totals.total === null ? "manual" : String(result.totals.total),
      ],
      ["Tax", result.taxStatus],
      [],
      ["Assumption"],
      ...result.assumptions.map((a) => [a]),
    ];
    const csv = [header, ...rows, ...summary]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "frelux-window-blind-schedule.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-background">
      <Container className="py-8 md:py-12">
        <PageHeader
          variant="tool"
          eyebrow="Finishes"
          title="Window blind estimator"
          subtitle="List every opening, pick the type and grade, and see the price per window and for the whole job before a shop quotes you."
          breadcrumbs={[
            { label: "Calculators", path: "/calculators" },
            { label: "Window blinds" },
          ]}
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
          <section className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-4 md:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className={labelClass} htmlFor="blind-market">
                    Market
                  </label>
                  <select
                    id="blind-market"
                    className={fieldClass}
                    value={market}
                    onChange={(e) => switchMarket(e.target.value)}
                  >
                    {BLIND_MARKETS.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.name}
                        {m.priced ? "" : " (rate needed)"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <span className={labelClass}>Measure in</span>
                  <div className="flex gap-2">
                    {(["ft", "m"] as LengthUnit[]).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => switchUnit(u)}
                        className={
                          unit === u
                            ? "flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                            : "flex-1 rounded-xl border border-border px-3 py-2 text-sm"
                        }
                      >
                        {u === "ft" ? "Feet" : "Metres"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className={labelClass}>Grade</span>
                  <div className="flex gap-2">
                    {BLIND_GRADES.map((g) => (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => setGrade(g.key)}
                        title={g.note}
                        className={
                          grade === g.key
                            ? "flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                            : "flex-1 rounded-xl border border-border px-3 py-2 text-sm"
                        }
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2 self-end pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={install}
                    onChange={(e) => setInstall(e.target.checked)}
                  />
                  Include fitting
                </label>
              </div>

              <div className="mt-4">
                <p className="text-xs text-muted-foreground">
                  Quick sizes, applied to the opening you last edited
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SAMPLE_SIZES.map((sample) => (
                    <button
                      key={sample.label}
                      type="button"
                      onClick={() => applySample(sample)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 md:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Blinds className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-medium text-foreground">
                    Openings
                  </h2>
                </div>
                <span className="text-xs text-muted-foreground">
                  {result.geometry.windowCount} window
                  {result.geometry.windowCount === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-3 space-y-3">
                {openings.map((row) => (
                  <div
                    key={row.id}
                    onFocus={() => setActiveRow(row.id)}
                    className="rounded-xl border border-border p-3"
                  >
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]">
                      <input
                        aria-label="Opening name"
                        placeholder="Living room"
                        className={fieldClass}
                        value={row.label}
                        onChange={(e) =>
                          patch(row.id, { label: e.target.value })
                        }
                      />
                      <select
                        aria-label="Blind type"
                        className={fieldClass}
                        value={row.typeKey}
                        onChange={(e) =>
                          patch(row.id, {
                            typeKey: e.target.value as BlindTypeKey,
                          })
                        }
                      >
                        {BLIND_TYPES.map((type) => (
                          <option key={type.key} value={type.key}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        aria-label={`Remove ${row.label || "opening"}`}
                        onClick={() =>
                          setOpenings((rows) =>
                            rows.filter((r) => r.id !== row.id),
                          )
                        }
                        className="justify-self-end rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <label className="space-y-1 text-xs">
                        <span className="text-muted-foreground">
                          Width ({unit})
                        </span>
                        <input
                          className={fieldClass}
                          inputMode="decimal"
                          value={row.width}
                          onChange={(e) =>
                            patch(row.id, {
                              width: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </label>
                      <label className="space-y-1 text-xs">
                        <span className="text-muted-foreground">
                          Drop ({unit})
                        </span>
                        <input
                          className={fieldClass}
                          inputMode="decimal"
                          value={row.height}
                          onChange={(e) =>
                            patch(row.id, {
                              height: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </label>
                      <label className="space-y-1 text-xs">
                        <span className="text-muted-foreground">How many</span>
                        <input
                          className={fieldClass}
                          inputMode="numeric"
                          value={row.quantity}
                          onChange={(e) =>
                            patch(row.id, {
                              quantity: Number(e.target.value) || 1,
                            })
                          }
                        />
                      </label>
                      <label className="flex items-end gap-2 pb-2 text-xs">
                        <input
                          type="checkbox"
                          checked={Boolean(row.motorised)}
                          onChange={(e) =>
                            patch(row.id, { motorised: e.target.checked })
                          }
                        />
                        Motorised
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpenings((rows) => [...rows, newOpening({ label: "" })])
                }
                className="mt-3 inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                <Plus className="h-4 w-4" /> Add opening
              </button>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 md:p-5">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-medium text-foreground">
                  Extras, priced by you
                </h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                A motor, a cassette headrail and taking down old blinds vary too
                much by supplier for a made up figure. Enter what you were
                quoted and the estimator adds it.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {BLIND_EXTRAS.map((extra) => (
                  <label key={extra.key} className="space-y-1 text-xs">
                    <span className="text-muted-foreground">
                      {extra.label} ({marketOption.currencySymbol})
                    </span>
                    <input
                      className={fieldClass}
                      inputMode="decimal"
                      placeholder={extra.detail}
                      value={extras[extra.key] ?? ""}
                      onChange={(e) =>
                        setExtras((current) => ({
                          ...current,
                          [extra.key]: e.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </div>

            {result.missing.length > 0 && (
              <div className="rounded-xl border border-dashed border-border bg-card p-4 md:p-5">
                <h2 className="text-sm font-medium text-foreground">
                  This needs a local rate
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {marketOption.priced
                    ? "One of these openings has no verified local rate yet. Enter the rate a shop quoted."
                    : `There is no verified blind price book for ${marketOption.name}. Enter what a local shop quoted and the estimator does the rest.`}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs">
                    <span className="text-muted-foreground">
                      Rate per m2 ({marketOption.currencySymbol})
                    </span>
                    <input
                      className={fieldClass}
                      inputMode="decimal"
                      value={manualRate}
                      onChange={(e) => setManualRate(e.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="text-muted-foreground">
                      Minimum per window (optional)
                    </span>
                    <input
                      className={fieldClass}
                      inputMode="decimal"
                      value={manualMinimum}
                      onChange={(e) => setManualMinimum(e.target.value)}
                    />
                  </label>
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 md:p-5">
              <h2 className="text-sm font-medium text-foreground">
                Job estimate
              </h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">Charged area</dt>
                  <dd>{result.geometry.totalChargeableAreaM2} m2</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">Blended rate</dt>
                  <dd>
                    {result.geometry.blendedRatePerM2 === null
                      ? "manual"
                      : formatCurrency(
                          result.geometry.blendedRatePerM2,
                          result.currencySymbol ?? marketOption.currencySymbol,
                        )}
                    <span className="text-muted-foreground"> /m2</span>
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">Blinds</dt>
                  <dd>{money(result.totals.blinds)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">Extras</dt>
                  <dd>{money(result.totals.extras)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="flex items-center gap-1 text-muted-foreground">
                    <Wrench className="h-3.5 w-3.5" /> Fitting
                  </dt>
                  <dd>{money(result.totals.installation)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
                  <dt className="font-medium">Total before tax</dt>
                  <dd className="text-lg font-semibold">
                    {money(result.totals.total)}
                  </dd>
                </div>
              </dl>
              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Ruler className="h-3.5 w-3.5" /> Tax not determined for blinds
              </p>
              <button
                type="button"
                onClick={downloadCsv}
                className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
              >
                Download schedule (CSV)
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <h2 className="border-b border-border p-4 text-sm font-medium text-foreground">
                Schedule
              </h2>
              <div className="divide-y divide-border">
                {result.rows.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-start justify-between gap-3 p-3 text-sm"
                  >
                    <div>
                      <div className="font-medium text-foreground">
                        {row.label || row.typeLabel}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {row.typeLabel} · {row.widthM} x {row.heightM} m ·{" "}
                        {row.quantity} off
                        {row.motorised ? " · motorised" : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div>
                        {row.blindsTotal === null
                          ? "manual"
                          : money(row.blindsTotal)}
                      </div>
                      {row.extrasTotal ? (
                        <div className="text-xs text-muted-foreground">
                          + {money(row.extrasTotal)} extras
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 md:p-5">
              <h2 className="text-sm font-medium text-foreground">
                How this was worked out
              </h2>
              <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                {result.assumptions.map((assumption) => (
                  <li key={assumption} className="flex gap-2">
                    <span
                      aria-hidden
                      className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted-foreground"
                    />
                    <span>{assumption}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                Source: {result.provenance.source}
              </p>
            </div>

            <p className="flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Sizes are the finished opening. Blinds need 10 to 20 mm clearance
              inside a reveal, which the waste allowance already covers.
            </p>
          </aside>
        </div>

        <section aria-labelledby="blind-steps" className="mt-10 space-y-4">
          <h2
            id="blind-steps"
            className="text-lg font-semibold text-foreground"
          >
            How this estimate is built
          </h2>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: "1",
                title: "Measure the opening",
                body: "Width across the reveal and the drop from head to sill, in feet or metres. Both are converted to metres before any rate is applied.",
              },
              {
                n: "2",
                title: "Charge the area",
                body: "The measured area is multiplied by the waste allowance for that blind type, because folded fabric is cut with more spare than a rigid slat.",
              },
              {
                n: "3",
                title: "Apply rate and minimum",
                body: "The area is priced at the market rate, then lifted to the minimum charge per window whenever the opening prices below it.",
              },
              {
                n: "4",
                title: "Scale and finish",
                body: "Count, grade, extras and fitting are added, giving a price per window and a total for the schedule before tax.",
              },
            ].map((step) => (
              <li
                key={step.n}
                className="rounded-xl border border-border bg-card p-4"
              >
                <span className="text-xs font-medium text-muted-foreground">
                  Step {step.n}
                </span>
                <h3 className="mt-1 text-sm font-medium text-foreground">
                  {step.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="blind-types" className="mt-10 space-y-4">
          <h2
            id="blind-types"
            className="text-lg font-semibold text-foreground"
          >
            Blind types and what they cost
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Every band below is the top of what the Nigerian market actually
            quotes, from vendor price lists and marketplace listings scanned in
            November 2026. The estimator prices at the top of the band, because
            under quoting a blind costs the installer money.
          </p>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="p-3 font-medium">
                    Type
                  </th>
                  <th scope="col" className="p-3 font-medium">
                    Made of
                  </th>
                  <th scope="col" className="p-3 font-medium">
                    Local band
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {BLIND_TYPES.map((type) => (
                  <tr key={type.key}>
                    <th scope="row" className="p-3 font-medium text-foreground">
                      {type.label}
                    </th>
                    <td className="p-3 text-muted-foreground">{type.family}</td>
                    <td className="p-3 text-muted-foreground">
                      {type.observedBand}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="blind-next" className="mt-10 space-y-3">
          <h2 id="blind-next" className="text-lg font-semibold text-foreground">
            Next in the job
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                to: "/fence-block-calculator",
                label: "Fence and coach blocks",
                note: "Perimeter wall, blocks, cement and sand.",
              },
              {
                to: "/german-floor-calculator",
                label: "German floor",
                note: "Laterite, slab and mix for a ground floor.",
              },
              {
                to: "/construction-tools",
                label: "All construction tools",
                note: "Every calculator in the FRELUX set.",
              },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-xl border border-border bg-card p-4 hover:bg-muted"
              >
                <span className="block text-sm font-medium text-foreground">
                  {link.label}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {link.note}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="blind-faq" className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            <h2
              id="blind-faq"
              className="text-lg font-semibold text-foreground"
            >
              Blind pricing questions
            </h2>
          </h2>
          {[
            {
              q: "Why does the calculator charge more than the rate per square metre?",
              a: "Because shops quote both. The per metre rate is the headline, then a minimum charge per window applies to small openings, and fabric is cut with a waste allowance. A 4 by 4 window quoted at 7,500 per metre still costs about 14,700 once those two rules land.",
            },
            {
              q: "How much does premium grade add?",
              a: "About forty percent on the rate. Nigerian premium print lists price a 3 by 4 day and night at 20,000 and a 6 by 4 at 38,000, which works out at 17,000 to 18,000 per square metre against 8,000 to 13,500 for standard stock.",
            },
            {
              q: "Can I price a whole house at once?",
              a: "Yes. Add each opening with its own name, type, size and count, and the schedule totals the job and shows a blended rate per square metre alongside the individual window prices.",
            },
            {
              q: "Can I price blinds outside Nigeria?",
              a: "Yes, the measurement and the arithmetic are the same everywhere. Enter the rate your local shop quoted and the calculator applies the same waste, minimum charge, extras and fitting rules.",
            },
          ].map((item) => (
            <details
              key={item.q}
              className="rounded-xl border border-border bg-card p-4 md:p-5"
            >
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                {item.q}
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </section>
      </Container>
    </div>
  );
}
