import { Fragment, useEffect, useMemo, useState } from "react";
import { Info, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  PS_BOARDS,
  PS_DESIGN_LABELS,
  PS_INSTALLATION_LABELS,
  PS_THICKNESS_LABELS,
  PS_WASTE_BY_DESIGN,
  calculatePolystyreneCeiling,
  type PsBoardSize,
  type PsDesign,
  type PsInstallation,
  type PsLine,
  type PsLineKey,
  type PsResult,
  type PsPrices,
  type PsThickness,
} from "@/lib/polystyrene-ceiling";

/**
 * Polystyrene ceiling panel: the second system inside the POP calculator.
 *
 * It owns its own inputs because a board ceiling is specified differently from
 * a plaster one - a stocked board size and thickness rather than a bulk mix -
 * and handing the panel its own state keeps the plaster questionnaire intact.
 * Prices are the visitor's, stored per market, so a repeated user does not
 * retype their supplier's figures and a board quantity can never be changed by
 * a price.
 */

interface Props {
  currency: string;
  currencySymbol: string;
  marketCode?: string;
  onResetSignal?: number;
  /** Reports the current inputs so the shared template controls can save them. */
  onStateChange?: (data: Record<string, unknown>) => void;
  /** A saved pop template whose stored system is polystyrene. */
  templateData?: Record<string, unknown> | null;
  templateNonce?: number;
}

type Unit = "meters" | "feet";

const UNIT_FACTOR = { meters: 1, feet: 0.3048 } as const;

const toMetres = (value: number, unit: Unit) =>
  Number.isFinite(value) ? value * UNIT_FACTOR[unit] : 0;

const priceStorageKey = (marketCode?: string) =>
  `frelux:ps-ceiling-prices:${marketCode || "default"}`;

function readStoredPrices(marketCode?: string): PsPrices {
  try {
    const raw = localStorage.getItem(priceStorageKey(marketCode));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: PsPrices = {};
    for (const [key, value] of Object.entries(parsed)) {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) out[key as PsLineKey] = n;
    }
    return out;
  } catch {
    return {};
  }
}

function OptionChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        "h-8 rounded-lg border px-3 text-xs font-medium transition-colors " +
        (selected
          ? "border-brand-purple bg-primary/10 text-foreground"
          : "border-border text-muted-foreground hover:border-brand-purple/40 hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

export default function PolystyreneCeilingPanel({
  currency,
  currencySymbol,
  marketCode,
  onResetSignal = 0,
  onStateChange,
  templateData = null,
  templateNonce = 0,
}: Props) {
  const [unit, setUnit] = useState<Unit>("meters");
  const [length, setLength] = useState(0);
  const [width, setWidth] = useState(0);
  const [includeDrops, setIncludeDrops] = useState(false);
  const [dropHeight, setDropHeight] = useState(0.2);
  const [dropRun, setDropRun] = useState(0);
  const [boardSize, setBoardSize] = useState<PsBoardSize>("1200x2400");
  const [thickness, setThickness] = useState<PsThickness>(25);
  const [installation, setInstallation] = useState<PsInstallation>("bonded");
  const [design, setDesign] = useState<PsDesign>("flat");
  const [includeCornice, setIncludeCornice] = useState(false);
  const [includePaint, setIncludePaint] = useState(false);
  const [labourRate, setLabourRate] = useState(0);
  const [prices, setPrices] = useState<PsPrices>(() =>
    readStoredPrices(marketCode),
  );
  const [showPrices, setShowPrices] = useState(false);

  useEffect(() => {
    setPrices(readStoredPrices(marketCode));
  }, [marketCode]);

  useEffect(() => {
    if (onResetSignal === 0) return;
    setLength(0);
    setWidth(0);
    setIncludeDrops(false);
    setDropHeight(0.2);
    setDropRun(0);
    setBoardSize("1200x2400");
    setThickness(25);
    setInstallation("bonded");
    setDesign("flat");
    setIncludeCornice(false);
    setIncludePaint(false);
    setLabourRate(0);
  }, [onResetSignal]);

  useEffect(() => {
    if (!templateData) return;
    const d = templateData as Record<string, unknown>;
    const num = (key: string, fallback: number) => {
      const value = Number(d[key]);
      return Number.isFinite(value) ? value : fallback;
    };
    setUnit(d.unit === "feet" ? "feet" : "meters");
    setLength(num("length", 0));
    setWidth(num("width", 0));
    setIncludeDrops(Boolean(d.includeDrops));
    setDropHeight(num("dropHeight", 0.2));
    setDropRun(num("dropRun", 0));
    setBoardSize(d.boardSize === "1200x3000" ? "1200x3000" : "1200x2400");
    setThickness(d.thickness === 20 || d.thickness === 30 ? d.thickness : 25);
    setInstallation(
      d.installation === "timber" ||
        d.installation === "metal" ||
        d.installation === "wire"
        ? d.installation
        : "bonded",
    );
    setDesign(
      d.design === "stepped" || d.design === "coffered" || d.design === "curved"
        ? d.design
        : "flat",
    );
    setIncludeCornice(Boolean(d.includeCornice));
    setIncludePaint(Boolean(d.includePaint));
    setLabourRate(num("labourRate", 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateNonce]);

  // Publish the inputs so the shared Save/Load controls above the card cover
  // this system as well as the plaster one.
  useEffect(() => {
    onStateChange?.({
      system: "polystyrene",
      unit,
      length,
      width,
      includeDrops,
      dropHeight,
      dropRun,
      boardSize,
      thickness,
      installation,
      design,
      includeCornice,
      includePaint,
      labourRate,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    unit,
    length,
    width,
    includeDrops,
    dropHeight,
    dropRun,
    boardSize,
    thickness,
    installation,
    design,
    includeCornice,
    includePaint,
    labourRate,
  ]);

  const result: PsResult = useMemo(
    () =>
      calculatePolystyreneCeiling(
        {
          lengthM: toMetres(length, unit),
          widthM: toMetres(width, unit),
          includeDrops,
          dropHeightM: includeDrops ? dropHeight : 0,
          dropPerimeterM: includeDrops ? dropRun || 0 : 0,
          boardSize,
          thickness,
          installation,
          design,
          includeCornice,
          includePaint,
          labourRatePerM2: labourRate,
        },
        prices,
      ),
    [
      length,
      width,
      unit,
      includeDrops,
      dropHeight,
      dropRun,
      boardSize,
      thickness,
      installation,
      design,
      includeCornice,
      includePaint,
      labourRate,
      prices,
    ],
  );

  const setPrice = (key: PsLineKey, value: number) => {
    const next = {
      ...prices,
      [key]: Number.isFinite(value) ? Math.max(0, value) : 0,
    };
    setPrices(next);
    try {
      localStorage.setItem(priceStorageKey(marketCode), JSON.stringify(next));
    } catch {
      /* storage may be unavailable; the figure still applies for this session */
    }
  };

  const money = (value: number) => `${currencySymbol}${formatNumber(value)}`;
  const unitLabel = unit === "feet" ? "ft" : "m";
  const groups: { key: string; title: string }[] = [
    { key: "boards", title: "Boards" },
    { key: "jointing", title: "Jointing and bonding" },
    { key: "framing", title: "Framing and fixings" },
    { key: "finishing", title: "Finishing" },
  ];

  return (
    <div className="mt-4">
      <h3 className="text-lg font-bold text-foreground dark:text-primary-foreground">
        Polystyrene board ceiling
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        High-density foam boards, measured in square metres plus drop faces. The
        take-off is exact; enter your supplier's prices to price it in{" "}
        {currency}.
      </p>

      {/* Unit */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Measure in
        </span>
        <OptionChip
          selected={unit === "meters"}
          onClick={() => setUnit("meters")}
        >
          Metres
        </OptionChip>
        <OptionChip selected={unit === "feet"} onClick={() => setUnit("feet")}>
          Feet
        </OptionChip>
      </div>

      {/* Dimensions */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block text-sm font-semibold text-card-foreground">
            Room length
          </span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min={0}
              step="0.01"
              value={length || ""}
              onChange={(e) => setLength(Number(e.target.value))}
              className="input-field"
              placeholder="0.00"
            />
            <span className="text-sm text-muted-foreground">{unitLabel}</span>
          </div>
        </label>
        <label className="block">
          <span className="block text-sm font-semibold text-card-foreground">
            Room width
          </span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min={0}
              step="0.01"
              value={width || ""}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="input-field"
              placeholder="0.00"
            />
            <span className="text-sm text-muted-foreground">{unitLabel}</span>
          </div>
        </label>
      </div>

      {/* Drops */}
      <div className="mt-5 rounded-xl border border-border p-3">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeDrops}
            onChange={(e) => setIncludeDrops(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="block font-semibold text-card-foreground">
              Include tray drops and step risers
            </span>
            <span className="block text-xs text-muted-foreground">
              Vertical faces are measured and added to the flat area, as they
              are cut from board.
            </span>
          </span>
        </label>
        {includeDrops && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="block text-xs font-semibold text-card-foreground">
                Drop height
              </span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={dropHeight || ""}
                  onChange={(e) => setDropHeight(Number(e.target.value))}
                  className="input-field"
                  placeholder="0.20"
                />
                <span className="text-sm text-muted-foreground">m</span>
              </div>
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-card-foreground">
                Running length of the step
              </span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={dropRun || ""}
                  onChange={(e) => setDropRun(Number(e.target.value))}
                  className="input-field"
                  placeholder="Leave blank to use the room perimeter"
                />
                <span className="text-sm text-muted-foreground">m</span>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Board size */}
      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-card-foreground">
          Board size
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(PS_BOARDS) as PsBoardSize[]).map((size) => (
            <OptionChip
              key={size}
              selected={boardSize === size}
              onClick={() => setBoardSize(size)}
            >
              {PS_BOARDS[size].label} · {PS_BOARDS[size].areaM2} m²
            </OptionChip>
          ))}
        </div>
      </fieldset>

      {/* Thickness */}
      <fieldset className="mt-4">
        <legend className="text-sm font-semibold text-card-foreground">
          Board thickness
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {([20, 25, 30] as PsThickness[]).map((t) => (
            <OptionChip
              key={t}
              selected={thickness === t}
              onClick={() => setThickness(t)}
            >
              {t} mm
            </OptionChip>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {PS_THICKNESS_LABELS[thickness]}
        </p>
      </fieldset>

      {/* Installation */}
      <fieldset className="mt-4">
        <legend className="text-sm font-semibold text-card-foreground">
          Installation
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(PS_INSTALLATION_LABELS) as PsInstallation[]).map(
            (type) => (
              <OptionChip
                key={type}
                selected={installation === type}
                onClick={() => setInstallation(type)}
              >
                {PS_INSTALLATION_LABELS[type]}
              </OptionChip>
            ),
          )}
        </div>
      </fieldset>

      {/* Design */}
      <fieldset className="mt-4">
        <legend className="text-sm font-semibold text-card-foreground">
          Design
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(PS_DESIGN_LABELS) as PsDesign[]).map((d) => (
            <OptionChip
              key={d}
              selected={design === d}
              onClick={() => setDesign(d)}
            >
              {PS_DESIGN_LABELS[d]}
            </OptionChip>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Wastage for this design: {PS_WASTE_BY_DESIGN[design]}% of the measured
          surface.
        </p>
      </fieldset>

      {/* Extras */}
      <div className="mt-4 space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeCornice}
            onChange={(e) => setIncludeCornice(e.target.checked)}
          />
          <span className="text-card-foreground">
            Include polystyrene cornice by room perimeter
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includePaint}
            onChange={(e) => setIncludePaint(e.target.checked)}
          />
          <span className="text-card-foreground">
            Include two coats of water-based paint
          </span>
        </label>
      </div>

      <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
        <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Never specify solvent, gloss or oil-based paint on polystyrene: it
          dissolves the foam. Water-based emulsion and satin only.
        </span>
      </p>

      {/* Result */}
      <div className="mt-6 rounded-xl border border-border p-4">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <span className="block text-xs text-muted-foreground">
              Flat area
            </span>
            <span className="font-semibold">
              {formatNumber(result.flatAreaM2)} m²
            </span>
          </div>
          <div>
            <span className="block text-xs text-muted-foreground">
              Drop faces
            </span>
            <span className="font-semibold">
              {formatNumber(result.dropAreaM2)} m²
            </span>
          </div>
          <div>
            <span className="block text-xs text-muted-foreground">
              Total surface
            </span>
            <span className="font-semibold">
              {formatNumber(result.surfaceM2)} m²
            </span>
          </div>
          <div>
            <span className="block text-xs text-muted-foreground">
              Boards ({result.boardAreaM2} m² each)
            </span>
            <span className="font-semibold">{result.boardsRequired}</span>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-2">Item</th>
                <th className="py-2 pr-2 text-right">Quantity</th>
                <th className="py-2 pr-2 text-right">Buy</th>
                <th className="py-2 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const rows = result.lines.filter((l) => l.group === group.key);
                if (rows.length === 0) return null;
                return (
                  <Fragment key={group.key}>
                    <tr>
                      <td
                        colSpan={4}
                        className="pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {group.title}
                      </td>
                    </tr>
                    {rows.map((row) => (
                      <tr key={row.key} className="border-b border-border/60">
                        <td className="py-2 pr-2">
                          <span className="block text-card-foreground">
                            {row.label}
                          </span>
                          {row.note && (
                            <span className="block text-xs text-muted-foreground">
                              {row.note}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums">
                          {formatNumber(row.quantity)} {row.unit}
                        </td>
                        <td className="py-2 pr-2 text-right text-xs text-muted-foreground">
                          {row.packLabel}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {row.unitPrice > 0 ? money(row.cost) : "—"}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3">
          <label className="block">
            <span className="block text-xs font-semibold text-card-foreground">
              Labour per m² (optional)
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {currencySymbol}
              </span>
              <input
                type="number"
                min={0}
                step="50"
                value={labourRate || ""}
                onChange={(e) => setLabourRate(Number(e.target.value))}
                className="input-field max-w-[140px]"
                placeholder="0"
              />
            </div>
          </label>
          <dl className="text-sm">
            <div className="flex justify-between gap-6">
              <dt className="text-muted-foreground">Materials</dt>
              <dd className="tabular-nums">{money(result.materialCost)}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-muted-foreground">Labour</dt>
              <dd className="tabular-nums">{money(result.labourCost)}</dd>
            </div>
            <div className="mt-1 flex justify-between gap-6 border-t border-border pt-1 font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{money(result.grandTotal)}</dd>
            </div>
          </dl>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setShowPrices((v) => !v)}
          className="mt-4 h-8 text-xs"
        >
          {showPrices
            ? "Hide supplier prices"
            : `Enter your supplier prices (${currency})`}
        </Button>

        {showPrices && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {result.lines.map((line) => (
              <label key={line.key} className="block">
                <span className="block text-xs font-medium text-card-foreground">
                  {line.label}
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="10"
                    value={prices[line.key] || ""}
                    onChange={(e) => setPrice(line.key, Number(e.target.value))}
                    className="input-field max-w-[140px]"
                    placeholder={`per ${line.unit}`}
                  />
                </div>
              </label>
            ))}
          </div>
        )}

        {result.warnings.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {result.warnings.map((warning) => (
              <li key={warning}>· {warning}</li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Quantities are locked to the measurement and the board geometry.
          Changing a price moves the cost, never the quantity. Confirmed
          supplier prices change between states and seasons, so check the figure
          you enter against a current quote.
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          setLength(0);
          setWidth(0);
          setIncludeDrops(false);
          setDropRun(0);
          setIncludeCornice(false);
          setIncludePaint(false);
          setLabourRate(0);
        }}
        className="mt-3 h-8 text-xs"
      >
        <RotateCcw aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
        Clear polystyrene inputs
      </Button>
    </div>
  );
}
