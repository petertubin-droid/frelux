import { Home, Building2, Warehouse, Store, Check } from "lucide-react";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import { classNames } from "@/lib/utils";
import type { PlanElevationInput } from "@/lib/engineering/mathematical-elevation-engine";

export interface ElevationPreset {
  id: string;
  name: string;
  blurb: string;
  icon: typeof Home;
  patch: Partial<PlanElevationInput>;
}

/**
 * Starting points. Most visitors do not know their span, pitch or wall
 * thickness, so the tool opens on a real building rather than on a stack of
 * empty engineering fields they would have to guess.
 */
export const ELEVATION_PRESETS: ElevationPreset[] = [
  {
    id: "bungalow-3",
    name: "3-bedroom bungalow",
    blurb: "One floor, about 12 × 9 m",
    icon: Home,
    patch: {
      building_length: 12,
      building_width: 9,
      storeys: 1,
      floor_to_floor_height: 3,
      roof_pitch_deg: 25,
      roof_type: "hip",
      wall_thickness: 0.225,
      internal_wall_length: 22,
    },
  },
  {
    id: "duplex-4",
    name: "4-bedroom duplex",
    blurb: "Two floors, about 15 × 12 m",
    icon: Building2,
    patch: {
      building_length: 15,
      building_width: 12,
      storeys: 2,
      floor_to_floor_height: 3,
      roof_pitch_deg: 25,
      roof_type: "hip",
      wall_thickness: 0.225,
      internal_wall_length: 34,
    },
  },
  {
    id: "block-flats",
    name: "Two-storey block",
    blurb: "Flats or offices, about 20 × 12 m",
    icon: Warehouse,
    patch: {
      building_length: 20,
      building_width: 12,
      storeys: 2,
      floor_to_floor_height: 3,
      roof_pitch_deg: 20,
      roof_type: "gable",
      wall_thickness: 0.225,
      internal_wall_length: 40,
    },
  },
  {
    id: "shop",
    name: "Shop or small office",
    blurb: "One wide floor, about 18 × 12 m",
    icon: Store,
    patch: {
      building_length: 18,
      building_width: 12,
      storeys: 1,
      floor_to_floor_height: 3.6,
      roof_pitch_deg: 15,
      roof_type: "gable",
      wall_thickness: 0.225,
      internal_wall_length: 26,
    },
  },
];

const PITCH_CHOICES = [
  { deg: 10, label: "Almost flat", note: "Cheap roof, drains slowly" },
  { deg: 15, label: "Low", note: "Good for long sheds" },
  { deg: 25, label: "Standard", note: "Most common on homes" },
  { deg: 35, label: "Steep", note: "Fast run-off, more sheets" },
];

export interface ElevationQuickStartProps {
  displayLength: number;
  displayWidth: number;
  displayFloorHeight: number;
  storeys: number;
  pitchDeg: number;
  unitLabel: string;
  lengthStep: number;
  activePreset: string | null;
  onPreset: (preset: ElevationPreset) => void;
  onLength: (
    key: "building_length" | "building_width" | "floor_to_floor_height",
    value: number,
  ) => void;
  onStoreys: (storeys: number) => void;
  onPitch: (deg: number) => void;
}

/**
 * Step one of the elevation tool: four numbers anybody can measure, in words
 * that do not assume a quantity surveyor is reading.
 */
export function ElevationQuickStart({
  displayLength,
  displayWidth,
  displayFloorHeight,
  storeys,
  pitchDeg,
  unitLabel,
  lengthStep,
  activePreset,
  onPreset,
  onLength,
  onStoreys,
  onPitch,
}: ElevationQuickStartProps) {
  const numbers = [
    {
      key: "building_length" as const,
      label: "Longest side",
      hint: "Tip to tip along the front",
      value: displayLength,
      min: 2,
      max: 120,
    },
    {
      key: "building_width" as const,
      label: "Shortest side",
      hint: "Front to back",
      value: displayWidth,
      min: 2,
      max: 120,
    },
    {
      key: "floor_to_floor_height" as const,
      label: "Height of one floor",
      hint: "Floor to ceiling, plus the slab",
      value: displayFloorHeight,
      min: 1.8,
      max: 6,
    },
  ];

  return (
    <section
      className="rounded-2xl border border-border bg-card p-5 space-y-5"
      aria-label="Start here"
    >
      <div className="space-y-1">
        <p className="section-label">Start here</p>
        <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
          Pick the closest building, then adjust four numbers
        </h3>
        <p className="text-sm text-muted-foreground">
          Everything else is filled in for you. You can change any of it later,
          and the drawing and quantities update as you type.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {ELEVATION_PRESETS.map((preset) => {
          const Icon = preset.icon;
          const active = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onPreset(preset)}
              aria-pressed={active}
              className={classNames(
                "group flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                active
                  ? "border-brand-purple/60 bg-brand-purple/10"
                  : "border-border bg-muted/20 hover:border-brand-purple/40 hover:bg-muted/40",
              )}
            >
              <span
                className={classNames(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  active
                    ? "bg-brand-purple text-white"
                    : "bg-background text-brand-purple",
                )}
              >
                {active ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Icon className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  {preset.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {preset.blurb}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {numbers.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label
              htmlFor={`quick-${field.key}`}
              className="text-xs font-medium text-foreground"
            >
              {field.label}
            </Label>
            <div className="relative">
              <Input
                id={`quick-${field.key}`}
                type="number"
                inputMode="decimal"
                min={field.min}
                max={field.max}
                step={lengthStep}
                value={Number.isFinite(field.value) ? field.value : ""}
                onChange={(event) =>
                  onLength(field.key, Number(event.target.value))
                }
                className="h-11 pr-12 text-base font-semibold tabular-nums"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {unitLabel}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{field.hint}</p>
          </div>
        ))}

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground">
            Number of floors
          </Label>
          <div className="flex h-11 items-center gap-1 rounded-lg border border-input bg-background p-1">
            {[1, 2, 3, 4].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => onStoreys(count)}
                aria-pressed={storeys === count}
                className={classNames(
                  "h-full flex-1 rounded-md text-sm font-semibold transition-colors tabular-nums",
                  storeys === count
                    ? "bg-brand-purple text-white"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {count}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Ground floor counts as one
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label className="text-xs font-medium text-foreground">
            Roof slope
          </Label>
          <span className="text-xs text-muted-foreground tabular-nums">
            {pitchDeg}° from flat
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PITCH_CHOICES.map((choice) => {
            const active = Math.abs(pitchDeg - choice.deg) < 0.5;
            return (
              <button
                key={choice.deg}
                type="button"
                onClick={() => onPitch(choice.deg)}
                aria-pressed={active}
                className={classNames(
                  "rounded-xl border px-3 py-2 text-left transition-colors",
                  active
                    ? "border-brand-purple/60 bg-brand-purple/10"
                    : "border-border bg-muted/20 hover:border-brand-purple/40",
                )}
              >
                <span className="block text-sm font-semibold text-foreground">
                  {choice.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {choice.note}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
