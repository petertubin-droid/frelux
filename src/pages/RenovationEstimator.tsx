/**
 * Renovation Estimator page.
 *
 * The page owns the property brief (which rooms, what work) and the buyer's own
 * supplier prices. The deterministic renovation engine owns every quantity: no
 * dimension is typed into a formula here, and no rate is invented. Money only
 * appears once a price exists, which is why an unpriced line shows an entry box
 * instead of a zero.
 *
 * Start from a property template or build a custom room list. Templates fill the
 * same rows a custom build uses, so a template is a head start, never a second
 * code path.
 */

import { useMemo, useState } from "react";
import { Building2, DoorOpen, Ruler } from "lucide-react";
import SpecialtyCalculatorShell from "@/components/calculators/SpecialtyCalculatorShell";
import {
  FieldGroup,
  NumberField,
  SelectField,
} from "@/components/calculators/SpecialtyFields";
import {
  mergePriceOverrides,
  useSpecialtyPrices,
} from "@/components/calculators/useSpecialtyPrices";
import {
  calculateRenovation,
  type RenovationProjectInput,
  type RenovationRoomInput,
  type RenovationRoomUse,
  type RenovationScopeLine,
} from "@/lib/estimation/renovation-engine";
import {
  priceLines,
  TAX_NOT_DETERMINED,
  type SpecialtyLine,
  type SpecialtyResult,
} from "@/lib/estimation/specialty";
import { applyPriceBook } from "@/lib/pricing/price-book";
import { usePriceBook } from "@/lib/pricing/price-book-context";
import { useMarket } from "@/lib/international/market-context";
import { track } from "@/lib/analytics";
import { unitShortLabel, unitToMeters } from "@/lib/utils";
import type { Unit } from "@/types";

/** One editable room row. Figures are text so a field can be empty. */
interface RoomRow {
  key: string;
  name: string;
  use: RenovationRoomUse;
  length: string;
  width: string;
  height: string;
  doors: string;
  existingWall: "paint" | "tiles" | "wallpaper" | "render" | "none";
  existingFloor: "tiles" | "screed" | "timber" | "carpet" | "vinyl" | "none";
  stripWalls: boolean;
  stripFloor: boolean;
  stripCeiling: boolean;
  plaster: boolean;
  screed: boolean;
  tileFloor: boolean;
  tileWalls: boolean;
  newFloor: boolean;
  newCeiling: boolean;
  paintWalls: boolean;
  paintCeiling: boolean;
  sockets: string;
  plumbingPoints: string;
}

interface RoomPreset {
  name: string;
  use: RenovationRoomUse;
  /** Typical internal clear sizes in metres. */
  lengthM: number;
  widthM: number;
  heightM: number;
  doors: number;
  existingWall: RoomRow["existingWall"];
  existingFloor: RoomRow["existingFloor"];
}

interface PropertyTemplate {
  key: string;
  label: string;
  blurb: string;
  rooms: RoomPreset[];
}

const PRESET: Record<string, RoomPreset> = {
  living: {
    name: "Living room",
    use: "living",
    lengthM: 5,
    widthM: 4,
    heightM: 2.7,
    doors: 1,
    existingWall: "paint",
    existingFloor: "tiles",
  },
  bedroom: {
    name: "Bedroom",
    use: "bedroom",
    lengthM: 3.6,
    widthM: 3.2,
    heightM: 2.7,
    doors: 1,
    existingWall: "paint",
    existingFloor: "tiles",
  },
  kitchen: {
    name: "Kitchen",
    use: "kitchen",
    lengthM: 3,
    widthM: 2.7,
    heightM: 2.7,
    doors: 1,
    existingWall: "tiles",
    existingFloor: "tiles",
  },
  bathroom: {
    name: "Bathroom",
    use: "bathroom",
    lengthM: 2.1,
    widthM: 1.8,
    heightM: 2.4,
    doors: 1,
    existingWall: "tiles",
    existingFloor: "tiles",
  },
  wc: {
    name: "WC",
    use: "wc",
    lengthM: 1.5,
    widthM: 1,
    heightM: 2.4,
    doors: 1,
    existingWall: "tiles",
    existingFloor: "tiles",
  },
  corridor: {
    name: "Corridor",
    use: "corridor",
    lengthM: 4,
    widthM: 1.2,
    heightM: 2.7,
    doors: 1,
    existingWall: "paint",
    existingFloor: "tiles",
  },
};

/**
 * Whole-property starts. Each is a room list, not a different calculation, so a
 * visitor can load one, delete a room they do not have, and add one the
 * template missed.
 */
const PROPERTY_TEMPLATES: PropertyTemplate[] = [
  {
    key: "flat-1",
    label: "1-bedroom flat",
    blurb: "Lounge, bedroom, kitchen, bathroom.",
    rooms: [PRESET.living, PRESET.bedroom, PRESET.kitchen, PRESET.bathroom],
  },
  {
    key: "flat-2",
    label: "2-bedroom flat",
    blurb: "Lounge, two bedrooms, kitchen, bathroom, corridor.",
    rooms: [
      PRESET.living,
      PRESET.bedroom,
      PRESET.bedroom,
      PRESET.kitchen,
      PRESET.bathroom,
      PRESET.corridor,
    ],
  },
  {
    key: "house-3",
    label: "3-bedroom house",
    blurb: "Lounge, three bedrooms, kitchen, two bathrooms, corridor.",
    rooms: [
      PRESET.living,
      PRESET.bedroom,
      PRESET.bedroom,
      PRESET.bedroom,
      PRESET.kitchen,
      PRESET.bathroom,
      PRESET.wc,
      PRESET.corridor,
    ],
  },
  {
    key: "bathroom-only",
    label: "Bathroom only",
    blurb: "One wet room, stripped out and refinished.",
    rooms: [PRESET.bathroom],
  },
  {
    key: "kitchen-only",
    label: "Kitchen only",
    blurb: "One kitchen, stripped out and refinished.",
    rooms: [PRESET.kitchen],
  },
];

const ROOM_USES: RenovationRoomUse[] = [
  "living",
  "bedroom",
  "kitchen",
  "bathroom",
  "wc",
  "corridor",
  "stair",
  "store",
  "other",
];

const WALL_FINISHES: RoomRow["existingWall"][] = [
  "paint",
  "tiles",
  "wallpaper",
  "render",
  "none",
];

const FLOOR_FINISHES: RoomRow["existingFloor"][] = [
  "tiles",
  "screed",
  "timber",
  "carpet",
  "vinyl",
  "none",
];

/** Display figure for a room entered in metres, in the visitor's unit. */
function toDisplay(metres: number, unit: Unit): string {
  const factor = unitToMeters(1, unit);
  if (!factor || !Number.isFinite(factor)) return "";
  const value = metres / factor;
  return String(Math.round(value * 100) / 100);
}

function rowFromPreset(preset: RoomPreset, index: number, unit: Unit): RoomRow {
  return {
    key: `tpl-${preset.use}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    name: preset.name,
    use: preset.use,
    length: toDisplay(preset.lengthM, unit),
    width: toDisplay(preset.widthM, unit),
    height: toDisplay(preset.heightM, unit),
    doors: String(preset.doors),
    existingWall: preset.existingWall,
    existingFloor: preset.existingFloor,
    stripWalls: preset.existingWall !== "none",
    stripFloor: preset.existingFloor !== "none",
    stripCeiling: false,
    plaster: preset.existingWall !== "none",
    screed: false,
    tileFloor: preset.use === "bathroom" || preset.use === "wc",
    tileWalls: preset.use === "bathroom" || preset.use === "wc",
    newFloor: false,
    newCeiling: false,
    paintWalls: true,
    paintCeiling: true,
    sockets: "",
    plumbingPoints: "",
  };
}

/** A blank room. Every figure starts empty, never at zero. */
function blankRow(index: number): RoomRow {
  return {
    key: `custom-${index}-${Math.random().toString(36).slice(2, 7)}`,
    name: `Room ${index + 1}`,
    use: "living",
    length: "",
    width: "",
    height: "",
    doors: "",
    existingWall: "paint",
    existingFloor: "tiles",
    stripWalls: false,
    stripFloor: false,
    stripCeiling: false,
    plaster: false,
    screed: false,
    tileFloor: false,
    tileWalls: false,
    newFloor: false,
    newCeiling: false,
    paintWalls: true,
    paintCeiling: false,
    sockets: "",
    plumbingPoints: "",
  };
}

/** A figure typed as text, or null when the field is empty. */
function countOf(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function positiveLength(text: string): number | null {
  const value = Number(text);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Unit price slug: stable, readable, and the same for the same line. */
function slugFor(row: RenovationScopeLine): string {
  return `renovation_${row.trade}_${row.id}`.replace(/[^a-z0-9_]/gi, "_");
}

export default function RenovationEstimator() {
  const {
    priceMap,
    ruleRows: _ruleRows,
    bookSummary,
  } = useSpecialtyPrices("renovation");
  const { market } = useMarket();
  const { resolve } = usePriceBook();
  const priceCurrency = market?.currencyCode ?? "NGN";
  const bookRates = useMemo(
    () => resolve(priceCurrency).rates,
    [resolve, priceCurrency],
  );

  const [unit, setUnit] = useState<Unit>("meters");
  const [templateKey, setTemplateKey] = useState<string>("flat-2");
  const [rows, setRows] = useState<RoomRow[]>(() =>
    PROPERTY_TEMPLATES[1].rooms.map((preset, index) =>
      rowFromPreset(preset, index, "meters"),
    ),
  );
  const [occupied, setOccupied] = useState<"yes" | "no" | "">("");
  const [approvals, setApprovals] = useState<"yes" | "no" | "">("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [contingency, setContingency] = useState("");
  const [container, setContainer] = useState("");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SpecialtyResult | null>(null);

  const prices = useMemo(
    () => mergePriceOverrides(applyPriceBook(priceMap, bookRates), overrides),
    [priceMap, overrides, bookRates],
  );

  const applyTemplate = (key: string) => {
    setTemplateKey(key);
    setResult(null);
    if (key === "custom") {
      setRows([blankRow(0)]);
      return;
    }
    const template = PROPERTY_TEMPLATES.find((entry) => entry.key === key);
    if (!template) return;
    setRows(
      template.rooms.map((preset, index) => rowFromPreset(preset, index, unit)),
    );
  };

  const changeUnit = (next: Unit) => {
    // Convert what is already on screen so a room keeps its real size.
    setRows((current) =>
      current.map((row) => ({
        ...row,
        length:
          row.length === ""
            ? ""
            : toDisplay(unitToMeters(Number(row.length), unit), next),
        width:
          row.width === ""
            ? ""
            : toDisplay(unitToMeters(Number(row.width), unit), next),
        height:
          row.height === ""
            ? ""
            : toDisplay(unitToMeters(Number(row.height), unit), next),
      })),
    );
    setUnit(next);
    setResult(null);
  };

  const patchRow = (key: string, patch: Partial<RoomRow>) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const addRoom = () => {
    setTemplateKey("custom");
    setRows((current) => [...current, blankRow(current.length)]);
    setResult(null);
  };

  const removeRoom = (key: string) => {
    setRows((current) => current.filter((row) => row.key !== key));
    setResult(null);
  };

  /** The engine brief. Rooms without real dimensions are left out, not zeroed. */
  const brief = useMemo((): RenovationProjectInput => {
    const rooms: RenovationRoomInput[] = [];
    for (const [index, row] of rows.entries()) {
      const length = positiveLength(row.length);
      const width = positiveLength(row.width);
      const height = positiveLength(row.height);
      if (length === null || width === null || height === null) continue;
      const sockets = countOf(row.sockets);
      const plumbing = countOf(row.plumbingPoints);
      const doors = countOf(row.doors);
      rooms.push({
        id: `room-${index + 1}`,
        name: row.name.trim() || `Room ${index + 1}`,
        use: row.use,
        length,
        width,
        height,
        unit: unit === "feet" ? "feet" : "meters",
        doorCount: doors ?? 0,
        existing: {
          wallFinish: row.existingWall,
          floorFinish: row.existingFloor,
        },
        work: {
          stripOut: {
            wallFinish: row.stripWalls,
            floorFinish: row.stripFloor,
            ceiling: row.stripCeiling,
          },
          plaster: row.plaster,
          screed: row.screed,
          tiling:
            row.tileFloor || row.tileWalls
              ? {
                  floor: row.tileFloor,
                  walls: row.tileWalls,
                  tileWidthMm: 600,
                  tileHeightMm: 300,
                }
              : undefined,
          flooring: row.newFloor,
          ceiling: row.newCeiling ? { type: "plasterboard" } : undefined,
          paint:
            row.paintWalls || row.paintCeiling
              ? { walls: row.paintWalls, ceiling: row.paintCeiling, coats: 2 }
              : undefined,
          electrical: sockets ? { socketPoints: sockets } : undefined,
          plumbing: plumbing ? { basinPoints: plumbing } : undefined,
        },
      });
    }
    return {
      marketCode: market?.marketCode ?? "NG",
      currencyCode: priceCurrency,
      measurementSystem: unit === "feet" ? "imperial" : "metric",
      occupied: occupied === "" ? undefined : occupied === "yes",
      approvals:
        approvals === "" ? undefined : { required: approvals === "yes" },
      yearBuilt: yearBuilt.trim() === "" ? null : Number(yearBuilt),
      contingencyPercent:
        contingency.trim() === "" ? undefined : Number(contingency),
      debrisContainerM3:
        container.trim() === "" ? undefined : Number(container),
      rooms,
    };
  }, [
    rows,
    unit,
    market?.marketCode,
    priceCurrency,
    occupied,
    approvals,
    yearBuilt,
    contingency,
    container,
  ]);

  const run = () => {
    const engine = calculateRenovation(brief);
    if (engine.rooms.length === 0) {
      setResult({
        ok: false,
        errors: [
          "Add at least one room with a length, a width and a height. Nothing is measured from an empty field.",
        ],
        warnings: [],
        steps: [],
        lines: [],
        priced_subtotal: 0,
        material_subtotal: null,
        labour_total: 0,
        grand_total: null,
        incomplete: true,
        missing: ["Room dimensions"],
        tax_status: TAX_NOT_DETERMINED,
      });
      return;
    }

    // Material lines are priced on the quantity actually bought; labour lines
    // are priced on the measured quantity. Both state their waste beside them.
    const lines: SpecialtyLine[] = engine.lines.map((row) => ({
      key: slugFor(row),
      label: row.roomName
        ? `${row.roomName}: ${row.description}`
        : row.description,
      material_slug: slugFor(row),
      quantity: row.quantityWithWaste ?? row.quantity,
      quantity_source: "rule_derived",
      unit: row.unit,
      detail: row.basis,
      unit_price: null,
      line_total: null,
    }));

    const priced = priceLines(lines, prices);
    const materialLines = priced.lines.filter(
      (line) =>
        engine.lines.find((row) => slugFor(row) === line.key)?.costClass ===
        "material",
    );
    const labourLines = priced.lines.filter(
      (line) =>
        engine.lines.find((row) => slugFor(row) === line.key)?.costClass ===
        "labour",
    );
    const sum = (rowsToSum: SpecialtyLine[]) =>
      rowsToSum.reduce((total, line) => total + (line.line_total ?? 0), 0);
    const materialPriced = materialLines.some(
      (line) => line.line_total !== null,
    );

    const res: SpecialtyResult = {
      ok: true,
      errors: [],
      warnings: [...engine.warnings],
      steps: [
        {
          label: "Rooms measured",
          detail: `${engine.rooms.length} room${engine.rooms.length === 1 ? "" : "s"} measured, ${engine.quantitiesByUnit.m2 ?? 0} m² of surface in total.`,
        },
        {
          label: "Scope lines",
          detail: `${engine.lines.length} lines, each stating its own arithmetic and what is not covered.`,
        },
        {
          label: "Readiness",
          detail:
            engine.readiness.status === "complete_for_pricing"
              ? "Nothing is blocked and nothing is warned."
              : [...engine.readiness.blockers, ...engine.warnings].join(" "),
        },
      ],
      lines: priced.lines,
      priced_subtotal: priced.priced_subtotal,
      material_subtotal: materialPriced ? sum(materialLines) : null,
      labour_total: sum(labourLines),
      grand_total: priced.missing.length === 0 ? priced.priced_subtotal : null,
      incomplete: priced.missing.length > 0,
      missing: [...priced.missing, ...engine.readiness.blockers],
      tax_status: TAX_NOT_DETERMINED,
    };
    setResult(res);
    track("calculator_completed", {
      calculator: "renovation",
      incomplete: res.incomplete,
      lines: res.lines.length,
      rooms: engine.rooms.length,
      readiness: engine.readiness.status,
    });
  };

  const resetInputs = () => {
    setUnit("meters");
    setTemplateKey("flat-2");
    setRows(
      PROPERTY_TEMPLATES[1].rooms.map((preset, index) =>
        rowFromPreset(preset, index, "meters"),
      ),
    );
    setOccupied("");
    setApprovals("");
    setYearBuilt("");
    setContingency("");
    setContainer("");
    setOverrides({});
    setResult(null);
  };

  const unitLabel = unitShortLabel(unit);

  const inputs = (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
          Start from a property
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          A template fills the room list below with typical sizes. Edit any
          room, delete what you do not have, or choose custom and enter your
          own.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PROPERTY_TEMPLATES.map((template) => (
            <button
              key={template.key}
              type="button"
              onClick={() => applyTemplate(template.key)}
              className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                templateKey === template.key
                  ? "border-primary bg-primary/5 font-medium"
                  : "border-border hover:border-primary/60"
              }`}
              aria-pressed={templateKey === template.key}
            >
              <span className="block text-sm font-medium text-foreground">
                {template.label}
              </span>
              <span className="mt-0.5 block text-muted-foreground">
                {template.blurb}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => applyTemplate("custom")}
            className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
              templateKey === "custom"
                ? "border-primary bg-primary/5 font-medium"
                : "border-border hover:border-primary/60"
            }`}
            aria-pressed={templateKey === "custom"}
          >
            <span className="block text-sm font-medium text-foreground">
              Custom
            </span>
            <span className="mt-0.5 block text-muted-foreground">
              Build my own room list
            </span>
          </button>
        </div>
      </div>

      <FieldGroup title="Site and approval">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Units"
            value={unit}
            onChange={(value) => changeUnit(value as Unit)}
            options={[
              { value: "meters", label: "Metres" },
              { value: "feet", label: "Feet" },
            ]}
            hint={`Rooms are entered in ${unit === "feet" ? "feet" : "metres"} and measured in metres.`}
          />
          <SelectField
            label="Property during the works"
            value={occupied}
            onChange={(value) => setOccupied(value as "yes" | "no" | "")}
            options={[
              { value: "", label: "Not stated" },
              { value: "yes", label: "Occupied" },
              { value: "no", label: "Empty" },
            ]}
            hint="Occupied work carries a labour allowance and protection."
          />
          <SelectField
            label="Statutory approval"
            value={approvals}
            onChange={(value) => setApprovals(value as "yes" | "no" | "")}
            options={[
              { value: "", label: "Not stated" },
              { value: "yes", label: "Required" },
              { value: "no", label: "Not required" },
            ]}
            hint="The fee is set by the authority. It is flagged, never invented."
          />
          <NumberField
            label="Year the building was completed"
            value={yearBuilt}
            onChange={setYearBuilt}
            hint="Before 2000 triggers an asbestos survey warning."
            placeholder="e.g. 1998"
          />
          <NumberField
            label="Contingency"
            value={contingency}
            onChange={setContingency}
            unit="%"
            hint="Carried as your own allowance. Leave empty for none."
          />
          <NumberField
            label="Waste container size"
            value={container}
            onChange={setContainer}
            unit="m³"
            hint="Optional. Turns the arisings into container loads."
          />
        </div>
      </FieldGroup>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Ruler className="h-4 w-4 text-primary" aria-hidden="true" />
            Rooms in this job
          </div>
          <button
            type="button"
            onClick={addRoom}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:border-primary/60"
          >
            <DoorOpen className="h-3.5 w-3.5" aria-hidden="true" />
            Add a room
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No rooms yet. Load a property above or add a room to begin.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {rows.map((row) => (
              <div
                key={row.key}
                className="rounded-lg border border-border/70 bg-background p-3"
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Room name
                    <input
                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      value={row.name}
                      onChange={(event) =>
                        patchRow(row.key, { name: event.target.value })
                      }
                    />
                  </label>
                  <label className="text-xs font-medium text-muted-foreground">
                    Use
                    <select
                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      value={row.use}
                      onChange={(event) =>
                        patchRow(row.key, {
                          use: event.target.value as RenovationRoomUse,
                        })
                      }
                    >
                      {ROOM_USES.map((use) => (
                        <option key={use} value={use}>
                          {use}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      ["length", "Length", row.length],
                      ["width", "Width", row.width],
                      ["height", "Height", row.height],
                      ["doors", "Doors", row.doors],
                    ] as const
                  ).map(([field, label, value]) => (
                    <label
                      key={field}
                      className="text-xs font-medium text-muted-foreground"
                    >
                      {label} ({field === "doors" ? "nr" : unitLabel})
                      <input
                        className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        value={value}
                        inputMode="decimal"
                        onChange={(event) =>
                          patchRow(row.key, { [field]: event.target.value })
                        }
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Existing wall finish
                    <select
                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      value={row.existingWall}
                      onChange={(event) =>
                        patchRow(row.key, {
                          existingWall: event.target
                            .value as RoomRow["existingWall"],
                        })
                      }
                    >
                      {WALL_FINISHES.map((finish) => (
                        <option key={finish} value={finish}>
                          {finish}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-medium text-muted-foreground">
                    Existing floor finish
                    <select
                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      value={row.existingFloor}
                      onChange={(event) =>
                        patchRow(row.key, {
                          existingFloor: event.target
                            .value as RoomRow["existingFloor"],
                        })
                      }
                    >
                      {FLOOR_FINISHES.map((finish) => (
                        <option key={finish} value={finish}>
                          {finish}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <fieldset className="mt-3">
                  <legend className="text-xs font-medium text-muted-foreground">
                    Work in this room
                  </legend>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-2">
                    {(
                      [
                        ["stripWalls", "Strip wall finish"],
                        ["stripFloor", "Strip floor finish"],
                        ["stripCeiling", "Strip ceiling"],
                        ["plaster", "Plaster"],
                        ["screed", "Screed"],
                        ["tileFloor", "Tile floor"],
                        ["tileWalls", "Tile walls"],
                        ["newFloor", "New floor finish"],
                        ["newCeiling", "New ceiling"],
                        ["paintWalls", "Paint walls"],
                        ["paintCeiling", "Paint ceiling"],
                      ] as const
                    ).map(([field, label]) => (
                      <label
                        key={field}
                        className="inline-flex items-center gap-1.5 text-xs text-foreground"
                      >
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-border"
                          checked={row[field]}
                          onChange={(event) =>
                            patchRow(row.key, { [field]: event.target.checked })
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <label className="text-xs font-medium text-muted-foreground">
                    Power sockets (nr)
                    <input
                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      value={row.sockets}
                      inputMode="numeric"
                      onChange={(event) =>
                        patchRow(row.key, { sockets: event.target.value })
                      }
                    />
                  </label>
                  <label className="text-xs font-medium text-muted-foreground">
                    Plumbing points (nr)
                    <input
                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      value={row.plumbingPoints}
                      inputMode="numeric"
                      onChange={(event) =>
                        patchRow(row.key, {
                          plumbingPoints: event.target.value,
                        })
                      }
                    />
                  </label>
                  <div className="col-span-2 flex items-end justify-end">
                    <button
                      type="button"
                      onClick={() => removeRoom(row.key)}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-destructive/60 hover:text-destructive"
                    >
                      Remove room
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <SpecialtyCalculatorShell
      onReset={resetInputs}
      methodology="renovation"
      calculatorType="renovation"
      title="Renovation Estimator"
      subtitle="Measure a refurbishment room by room, then price it at your own supplier rates. Every quantity states its arithmetic and what is left out."
      seoTitle="Renovation Cost Estimator: Room by Room Quantities | FRELUX"
      seoDescription="Measure a renovation room by room in metres or feet: strip out, plaster, screed, tiling, ceilings, paint, power and plumbing points. Load a property template or build a custom room list, then price the takeoff at your own rates."
      breadcrumbName="Renovation Estimator"
      faqSlug="renovation-estimator"
      routePath="/renovation-estimator"
      limitations={[
        "This is a measured takeoff, not a fixed price. It measures the work stated, and nothing for work that was not stated.",
        "Fees set by a local authority, structural design, asbestos removal and service connections are flagged rather than priced. No tax rate is applied: tax stays undetermined until a market rate is loaded.",
        "Unpriced lines stay unpriced. Enter your supplier price to see money, and the estimate will not present a partial total as a total.",
      ]}
      result={result}
      onRun={run}
      priceOverrides={overrides}
      onPriceOverride={(slug, value) =>
        setOverrides((previous) => ({ ...previous, [slug]: value }))
      }
      bookSummary={bookSummary}
      quoteTitle="FRELUX Renovation Estimate"
      quoteFooter="Quantities only where no price was entered. Confirm existing conditions, statutory approval and any asbestos survey before work starts."
      crossLinks={[
        {
          label: "Paint calculator",
          to: "/paint-calculator",
          description:
            "Paint quantities by surface and condition, with the same coverage rules.",
        },
        {
          label: "Tiling calculator",
          to: "/tiling-calculator",
          description:
            "Tile, adhesive and grout counts from your tile size and layout.",
        },
        {
          label: "Screed calculator",
          to: "/screed-calculator",
          description:
            "Screed and levelling compound for the floor areas measured here.",
        },
      ]}
      inputs={inputs}
      notes={
        <div className="rounded-lg border border-border bg-card p-3.5 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">
            How this estimate behaves
          </p>
          <ul className="mt-1.5 space-y-1">
            <li>
              Every quantity is stated net, with the waste allowance beside it,
              so a price is never applied to waste twice.
            </li>
            <li>
              A room with an empty dimension is left out of the measurement
              rather than measured as zero.
            </li>
            <li>
              Rooms are measured in metres internally; imperial entry is
              converted once, at the boundary.
            </li>
          </ul>
        </div>
      }
    />
  );
}
