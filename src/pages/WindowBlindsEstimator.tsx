// =========================================================
// WINDOW BLIND ESTIMATOR (/window-blind-calculator)
//
// Measured openings in, priced blinds out. One deterministic engine call does
// the arithmetic (area, waste, minimum charge, fitting); this page only
// collects the opening and shows the result with the assumptions beside it.
//
// Nigeria carries verified local rates. Every other market is asked for its own
// rate rather than being handed a Lagos price, and tax is never assumed.
// =========================================================

import { useMemo, useState } from "react";
import { Blinds, Info, Ruler, Wrench } from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { useSeo } from "@/lib/seo";
import { formatCurrency } from "@/lib/utils";
import {
  BLIND_MARKETS,
  BLIND_TYPES,
  type BlindTypeKey,
} from "@/config/window-blinds";
import {
  calculateWindowBlinds,
  type LengthUnit,
} from "@/lib/estimation/window-blinds-engine";

const labelClass = "text-sm font-medium text-foreground";
const fieldClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";

const SAMPLE_SIZES: {
  label: string;
  width: number;
  height: number;
  unit: LengthUnit;
}[] = [
  { label: "3 x 4 ft", width: 3, height: 4, unit: "ft" },
  { label: "4 x 4 ft", width: 4, height: 4, unit: "ft" },
  { label: "5 x 4 ft", width: 5, height: 4, unit: "ft" },
  { label: "6 x 4 ft", width: 6, height: 4, unit: "ft" },
  { label: "Door 3 x 7 ft", width: 3, height: 7, unit: "ft" },
];

export default function WindowBlindsEstimator() {
  useSeo({
    title:
      "Window Blind Calculator: Cost per Window and per Square Metre | FRELUX",
    description:
      "Price roller, zebra, day and night, vertical, venetian, roman and wooden blinds from the measured opening. Widest and highest local rates, minimum charge per window and fitting included.",
  });

  const [market, setMarket] = useState("NG");
  const [unit, setUnit] = useState<LengthUnit>("ft");
  const [typeKey, setTypeKey] = useState<BlindTypeKey>("day-night");
  const [width, setWidth] = useState("4");
  const [height, setHeight] = useState("4");
  const [quantity, setQuantity] = useState("1");
  const [install, setInstall] = useState(true);
  const [manualRate, setManualRate] = useState("");
  const [manualMinimum, setManualMinimum] = useState("");

  const marketOption =
    BLIND_MARKETS.find((m) => m.code === market) ?? BLIND_MARKETS[0];
  const type = BLIND_TYPES.find((t) => t.key === typeKey) ?? BLIND_TYPES[0];

  const result = useMemo(
    () =>
      calculateWindowBlinds({
        market,
        unit,
        typeKey,
        width: Number(width) || 0,
        height: Number(height) || 0,
        quantity: Number(quantity) || 1,
        install,
        manualPerM2: Number(manualRate) || undefined,
        manualMinimumPerWindow: Number(manualMinimum) || undefined,
      }),
    [
      market,
      unit,
      typeKey,
      width,
      height,
      quantity,
      install,
      manualRate,
      manualMinimum,
    ],
  );

  const money = (value: number | null) =>
    value === null
      ? "Manual price required"
      : formatCurrency(
          value,
          result.currencySymbol ?? marketOption.currencySymbol,
        );

  const switchMarket = (code: string) => {
    setMarket(code);
    const next = BLIND_MARKETS.find((m) => m.code === code);
    if (next && next.defaultUnit !== unit) {
      setUnit(next.defaultUnit);
      setWidth(next.defaultUnit === "ft" ? "4" : "1.2");
      setHeight(next.defaultUnit === "ft" ? "4" : "1.2");
    }
  };

  const switchUnit = (next: LengthUnit) => {
    if (next === unit) return;
    const factor = next === "m" ? 0.3048 : 1 / 0.3048;
    setWidth((w) =>
      Number(w) ? String(Math.round(Number(w) * factor * 100) / 100) : w,
    );
    setHeight((h) =>
      Number(h) ? String(Math.round(Number(h) * factor * 100) / 100) : h,
    );
    setUnit(next);
  };

  const applySample = (sample: {
    width: number;
    height: number;
    unit: LengthUnit;
  }) => {
    if (sample.unit !== unit) {
      const factor = unit === "m" ? 0.3048 : 1 / 0.3048;
      setWidth(String(Math.round(sample.width * factor * 100) / 100));
      setHeight(String(Math.round(sample.height * factor * 100) / 100));
    } else {
      setWidth(String(sample.width));
      setHeight(String(sample.height));
    }
  };

  const downloadCsv = () => {
    const rows = [
      ["Window blind estimate", ""],
      ["Market", marketOption.name],
      ["Type", type.label],
      ["Opening", `${result.geometry.widthM} m x ${result.geometry.heightM} m`],
      ["Windows", String(result.geometry.quantity)],
      ["Measured area per window (m2)", String(result.geometry.areaM2)],
      [
        "Charged area per window with waste (m2)",
        String(result.geometry.chargeableAreaM2),
      ],
      [
        "Rate per m2",
        result.provenance.ratePerM2 === null
          ? "manual"
          : String(result.provenance.ratePerM2),
      ],
      [
        "Minimum per window",
        result.provenance.minimumPerWindow === null
          ? "none"
          : String(result.provenance.minimumPerWindow),
      ],
      [
        "Price per window",
        result.perWindow === null ? "manual" : String(result.perWindow),
      ],
      [
        "Blinds total",
        result.totals.blinds === null ? "manual" : String(result.totals.blinds),
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
      ["Assumption", ""],
      ...result.assumptions.map((a) => [a, ""]),
    ];
    const csv = rows
      .map((r) => r.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "frelux-window-blinds.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-background">
      <Container className="py-8 md:py-12">
        <PageHeader
          title="Window blind estimator"
          subtitle="Measure the opening, pick the type, and see what the blinds cost before the shop quotes you."
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
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
                            ? "flex-1 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground"
                            : "flex-1 rounded-xl border border-border px-3 py-2.5 text-sm"
                        }
                      >
                        {u === "ft" ? "Feet" : "Metres"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass} htmlFor="blind-width">
                    Opening width ({unit})
                  </label>
                  <input
                    id="blind-width"
                    className={fieldClass}
                    inputMode="decimal"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass} htmlFor="blind-height">
                    Opening drop ({unit})
                  </label>
                  <input
                    id="blind-height"
                    className={fieldClass}
                    inputMode="decimal"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass} htmlFor="blind-quantity">
                    Windows this size
                  </label>
                  <input
                    id="blind-quantity"
                    className={fieldClass}
                    inputMode="numeric"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
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
                <p className="text-xs text-muted-foreground">Common openings</p>
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
              <div className="flex items-center gap-2">
                <Blinds className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-medium text-foreground">
                  Blind type
                </h2>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {BLIND_TYPES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTypeKey(t.key)}
                    className={
                      typeKey === t.key
                        ? "rounded-xl border border-primary bg-primary/5 p-3 text-left"
                        : "rounded-xl border border-border p-3 text-left hover:bg-muted"
                    }
                  >
                    <div className="text-sm font-medium text-foreground">
                      {t.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t.family}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t.observedBand}
                    </div>
                  </button>
                ))}
              </div>
              <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {type.note}
              </p>
            </div>

            {result.status === "manual_price_required" && (
              <div className="rounded-xl border border-dashed border-border bg-card p-4 md:p-5">
                <h2 className="text-sm font-medium text-foreground">
                  This needs a local rate
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  There is no verified blind price book for {marketOption.name}.
                  Enter what a local shop quoted and the estimator will do the
                  rest.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className={labelClass} htmlFor="manual-rate">
                      Rate per m2 ({marketOption.currencySymbol})
                    </label>
                    <input
                      id="manual-rate"
                      className={fieldClass}
                      inputMode="decimal"
                      value={manualRate}
                      onChange={(e) => setManualRate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelClass} htmlFor="manual-minimum">
                      Minimum per window (optional)
                    </label>
                    <input
                      id="manual-minimum"
                      className={fieldClass}
                      inputMode="decimal"
                      value={manualMinimum}
                      onChange={(e) => setManualMinimum(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 md:p-5">
              <h2 className="text-sm font-medium text-foreground">Estimate</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">Measured area each</dt>
                  <dd>{result.geometry.areaM2} m2</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">Charged area each</dt>
                  <dd>{result.geometry.chargeableAreaM2} m2</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">Rate per m2</dt>
                  <dd>
                    {result.provenance.ratePerM2 === null
                      ? "manual"
                      : formatCurrency(
                          result.provenance.ratePerM2,
                          result.currencySymbol ?? marketOption.currencySymbol,
                        )}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
                  <dt className="text-muted-foreground">Per window</dt>
                  <dd className="font-medium">{money(result.perWindow)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">
                    Blinds x {result.geometry.quantity}
                  </dt>
                  <dd>{money(result.totals.blinds)}</dd>
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
                Download estimate (CSV)
              </button>
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
          </aside>
        </div>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Blind pricing questions
          </h2>
          {[
            {
              q: "Why does the calculator charge more than the rate per square metre?",
              a: "Because shops quote both. The per metre rate is the headline, then a minimum charge per window applies to small openings, and fabric is cut with a waste allowance. A 4 by 4 window quoted at 7,500 per metre still costs about 14,700 once those two rules land.",
            },
            {
              q: "Which blind type is cheapest in Nigeria?",
              a: "Aluminium venetian at 25 mm, from about 4,500 per square metre. Wooden blinds are the most expensive at 15,000 to 25,000 per square metre, and sellers usually quote 33,000 to 75,000 per window instead.",
            },
            {
              q: "Can I price blinds outside Nigeria?",
              a: "Yes, the measurement and the arithmetic are the same everywhere. Enter the rate your local shop quoted and the calculator applies the same waste, minimum charge and fitting rules.",
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
