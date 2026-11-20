import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layers, Info, AlertTriangle, Ruler } from "lucide-react";
import ToolShell from "@/components/tools/ToolShell";
import { ShareEstimateButton } from "@/components/ShareEstimateButton";
import { useTechnicalLabels } from "@/lib/construction-dictionary/use-technical-labels";
import {
  calculatePlasterRender,
  type PlasterRenderInput,
  type PlasterSubstrate,
  type PlasterSystem,
  type RenderGrainMm,
} from "@/lib/estimation/plaster-render-engine";
import { useMarket } from "@/lib/international/market-context";

const SYSTEMS: Array<{
  key: PlasterSystem;
  label: string;
  blurb: string;
}> = [
  {
    key: "gypsum_interior",
    label: "Interior gypsum plaster (Gipsputz)",
    blurb: "DIN EN 13279 · 10–15 mm single coat · dry rooms",
  },
  {
    key: "exterior_render",
    label: "Exterior render (Außenputz)",
    blurb: "EN 15824 · mesh + quartz primer + 1.5/2/3 mm topcoat",
  },
  {
    key: "textured_tyrolene",
    label: "Tyrolene textured render",
    blurb: "Sand-cement backing + textured mineral coat + sealer",
  },
];

const SUBSTRATES: Array<{ key: PlasterSubstrate; label: string }> = [
  { key: "clay_brick", label: "Clay brick" },
  { key: "sandcrete_block", label: "Sandcrete block" },
  { key: "aac", label: "AAC block" },
  { key: "concrete", label: "Smooth concrete" },
  { key: "eps_insulation", label: "EPS board (ETICS)" },
  { key: "mineral_wool", label: "Mineral wool (ETICS)" },
];

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
      )}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-brand-purple focus:outline-none";

export default function PlasterRenderCalculator() {
  const { marketCode } = useMarket();
  const { t } = useTechnicalLabels();

  const [system, setSystem] = useState<PlasterSystem>("exterior_render");
  const [substrate, setSubstrate] = useState<PlasterSubstrate>("clay_brick");
  const [areaM2, setAreaM2] = useState("100");
  const [thicknessMm, setThicknessMm] = useState("15");
  const [grainMm, setGrainMm] = useState<RenderGrainMm>(2);
  const [texturedCoatMm, setTexturedCoatMm] = useState("4");
  const [openingAreaM2, setOpeningAreaM2] = useState("0");
  const [cornerM, setCornerM] = useState("0");
  const [perimeterM, setPerimeterM] = useState("0");
  const [wastePercent, setWastePercent] = useState("10");
  const [wetZone, setWetZone] = useState(false);

  const input: PlasterRenderInput = useMemo(
    () => ({
      system,
      marketCode: marketCode || "GB",
      areaM2: Number(areaM2) || 0,
      openingAreaM2: Number(openingAreaM2) || 0,
      substrate,
      thicknessMm: Number(thicknessMm) || undefined,
      grainMm,
      texturedCoatMm: Number(texturedCoatMm) || undefined,
      externalCornerLengthM: Number(cornerM) || 0,
      openingPerimeterM: Number(perimeterM) || 0,
      wastePercent: Number(wastePercent) || 0,
      wetZone,
    }),
    [
      system,
      marketCode,
      areaM2,
      openingAreaM2,
      substrate,
      thicknessMm,
      grainMm,
      texturedCoatMm,
      cornerM,
      perimeterM,
      wastePercent,
      wetZone,
    ],
  );

  const result = useMemo(() => calculatePlasterRender(input), [input]);

  return (
    <ToolShell
      route="/plaster-render-calculator"
      subtitle="Three systems, calculated as layered assemblies, packaged the way your market sells them."
    >
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Inputs */}
          <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Layers className="h-4 w-4 text-brand-purple" /> System
              </p>
              <div className="space-y-2">
                {SYSTEMS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSystem(s.key)}
                    aria-pressed={system === s.key}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      system === s.key
                        ? "border-brand-purple bg-primary/5"
                        : "border-border hover:border-brand-purple/40"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-foreground">
                      {s.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {s.blurb}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Net area (m²)">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={areaM2}
                  onChange={(e) => setAreaM2(e.target.value)}
                />
              </Field>
              <Field label="Openings deducted (m²)">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={openingAreaM2}
                  onChange={(e) => setOpeningAreaM2(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Substrate">
              <select
                className={inputClass}
                value={substrate}
                onChange={(e) =>
                  setSubstrate(e.target.value as PlasterSubstrate)
                }
              >
                {SUBSTRATES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>

            {system === "gypsum_interior" && (
              <>
                <Field label="Thickness (mm)" hint="Single coat: 10–15 mm">
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={thicknessMm}
                    onChange={(e) => setThicknessMm(e.target.value)}
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={wetZone}
                    onChange={(e) => setWetZone(e.target.checked)}
                  />
                  Wet zone (bathroom, kitchen, laundry)
                </label>
              </>
            )}

            {system === "exterior_render" && (
              <Field
                label="Topcoat grain"
                hint="Consumption scales by grain, not thickness"
              >
                <div className="flex gap-2">
                  {([1.5, 2, 3] as RenderGrainMm[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrainMm(g)}
                      aria-pressed={grainMm === g}
                      className={`flex-1 rounded-lg border px-2 py-2 text-sm ${
                        grainMm === g
                          ? "border-brand-purple bg-primary/5 font-semibold"
                          : "border-border"
                      }`}
                    >
                      {g} mm
                    </button>
                  ))}
                </div>
              </Field>
            )}

            {system === "textured_tyrolene" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Backing (mm)" hint="12–18 mm at 1:4">
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={thicknessMm}
                    onChange={(e) => setThicknessMm(e.target.value)}
                  />
                </Field>
                <Field label="Textured coat (mm)" hint="3–5 mm">
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={texturedCoatMm}
                    onChange={(e) => setTexturedCoatMm(e.target.value)}
                  />
                </Field>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="External corners (m)">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={cornerM}
                  onChange={(e) => setCornerM(e.target.value)}
                />
              </Field>
              <Field label="Reveal perimeter (m)">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={perimeterM}
                  onChange={(e) => setPerimeterM(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Waste (%)">
              <input
                className={inputClass}
                inputMode="decimal"
                value={wastePercent}
                onChange={(e) => setWastePercent(e.target.value)}
              />
            </Field>
          </section>

          {/* Results */}
          <section className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {result.systemLabel}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {result.standardRef} · {result.marketCode} ·{" "}
                    {result.packaging.unitSystem === "imperial"
                      ? "imperial packaging"
                      : "metric packaging"}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  <Ruler className="mr-1 inline h-4 w-4" />
                  {result.netAreaDisplay.value.toLocaleString()}{" "}
                  {result.netAreaDisplay.unit} net
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ShareEstimateButton
                  showPdf
                  compact
                  estimate={{
                    kind: `Plaster / render: ${result.systemLabel}`,
                    summaryLines: [
                      {
                        label: "System",
                        value: `${result.standardRef} · ${result.marketCode}`,
                      },
                      {
                        label: "Net area",
                        value: `${result.netAreaDisplay.value.toLocaleString()} ${result.netAreaDisplay.unit}`,
                      },
                      {
                        label: "Substrate",
                        value: result.substrate.label,
                      },
                    ],
                    lineItems: [...result.layers, ...result.accessories].map(
                      (line) => ({
                        description: t(line.material),
                        quantity: `${line.quantity.toLocaleString()} ${line.unit}`,
                        section: line.optional ? "Optional" : undefined,
                      }),
                    ),
                    totals: [
                      {
                        label: "Bags of plaster",
                        value: `${result.totals.bags.toLocaleString()}`,
                        emphasized: true,
                      },
                    ],
                    notes: [
                      result.substrate.note,
                      ...result.assumptions,
                      ...result.warnings,
                    ],
                    link: "/plaster-render-calculator",
                  }}
                />
              </div>

              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2">Layer</th>
                    <th className="pb-2 text-right">Quantity</th>
                    <th className="pb-2 text-right">Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...result.layers, ...result.accessories].map((line) => (
                    <tr
                      key={line.key}
                      className={line.optional ? "opacity-70" : ""}
                    >
                      <td className="py-2 pr-3">
                        <span className="font-medium text-foreground">
                          {t(line.material)}
                        </span>
                        {line.optional && (
                          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                            optional
                          </span>
                        )}
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {line.basis}
                        </span>
                      </td>
                      <td className="py-2 text-right font-mono text-foreground">
                        {line.quantity.toLocaleString()} {line.unit}
                      </td>
                      <td className="py-2 text-right text-xs text-muted-foreground">
                        {line.packs && line.packs.length > 0
                          ? `${line.packs[0].count} × ${line.packs[0].label}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Info className="h-4 w-4 text-brand-purple" /> Substrate
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.substrate.label}: {result.substrate.note}
              </p>
              <p className="mt-2 text-sm text-foreground">
                Primer{" "}
                <strong>
                  {result.substrate.primerRequired ? "required" : "optional"}
                </strong>{" "}
                · {result.totals.primerLitres.toLocaleString()} L
              </p>
            </div>

            {result.warnings.length > 0 && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" /> Read before ordering
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {result.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.assumptions.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-sm font-semibold text-foreground">
                  Assumptions
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {result.assumptions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Rates are published manufacturer figures (Knauf MP 75, Baumit
              GranoporTop, Cullamix Tyrolean) and vary by product. Upload an IFC
              model on the{" "}
              <Link
                to="/bim-ifc-import"
                className="text-brand-purple hover:underline"
              >
                BIM takeoff page
              </Link>{" "}
              to read IfcCovering areas instead of typing them.
            </p>
          </section>
        </div>

        <section className="mt-10 rounded-2xl border border-border bg-muted/30 p-5 text-sm">
          <h2 className="mb-2 font-semibold text-foreground">
            How to use this calculator
          </h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-muted-foreground">
            <li>
              Choose the system you are building. Gypsum plaster, exterior
              render and Tyrolene are priced by different rules, so the system
              decides which layers appear.
            </li>
            <li>
              Enter the net wall area, or the length, height and number of walls
              with the openings you want deducted. Render is not ordered for the
              openings it does not cover.
            </li>
            <li>
              Pick the substrate. AAC, sandcrete, smooth concrete and insulation
              boards raise the primer requirement and the multiplier, and the
              reason is printed beside the line.
            </li>
            <li>
              Set the thickness for plaster or the grain for an exterior
              topcoat, and the textured coat thickness for Tyrolene. Add corner
              heights and reveal perimeters so beads are counted.
            </li>
            <li>
              Read the layer table against the pack counts, then check the
              warnings before ordering. Each line prints the arithmetic behind
              it.
            </li>
          </ol>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm">
          <h2 className="mb-2 font-semibold text-foreground">
            How much does plastering cost?
          </h2>
          <p className="text-muted-foreground">
            This page sizes materials, which is the part that can be calculated
            honestly: bags of plaster, pails of topcoat, mesh rolls and beads.
            The price of those materials depends on the merchant and the market,
            and the labour, scaffold and drying time on top vary even more. The
            price library holds no verified plaster band, so the page does not
            publish a rate it cannot support. Take the quantities and the system
            from here and check a local quote line by line: the three choices
            that move the material cost most are the system, the topcoat grain,
            and whether the substrate forces a bonding primer.
          </p>
        </section>
      </div>
    </ToolShell>
  );
}
