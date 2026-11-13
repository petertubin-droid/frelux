import { Ruler, Triangle, Home, BrickWall, Info } from "lucide-react";
import { formatMeasure } from "@/lib/engineering/elevation-units";
import type { ElevationUnitSystem } from "@/lib/engineering/elevation-units";
import type { MathematicalElevationResult } from "@/lib/engineering/mathematical-elevation-engine";

export interface ElevationGlanceProps {
  result: MathematicalElevationResult;
  unitSystem: ElevationUnitSystem;
}

/**
 * The four numbers that answer "how big is this building?", stated before any
 * schedule. Everything else on the page is supporting detail for these.
 */
export function ElevationGlance({ result, unitSystem }: ElevationGlanceProps) {
  const roof = result.levels.level_5_roof;
  const walls = result.levels.level_3_superstructure;
  const m = (value: number | null, unit: string, decimals = 2) =>
    formatMeasure(value, unit, unitSystem, decimals).text;

  const ridge = roof.total_building_height_m;
  const eaves = roof.eaves_height_m;
  const rise = roof.ridge_rise_m;
  const run = roof.roof_span_m === null ? null : roof.roof_span_m / 2;
  const footprint = roof.horizontal_roof_footprint_m2;
  const roofArea = roof.approximate_roof_covering_area_m2;
  const extra = roofArea === null ? null : roofArea - footprint;

  const cards = [
    {
      icon: Home,
      label: "Height to the roof peak",
      value: roof.ridge_rise_m === null ? "Not assessed" : m(ridge, "m", 2),
      note: `Ground level to the highest point, over ${result.input.storeys} ${
        result.input.storeys === 1 ? "floor" : "floors"
      }`,
    },
    {
      icon: Ruler,
      label: "Height to the eaves",
      value: m(eaves, "m", 2),
      note: "Where the wall stops and the roof starts. This is the line a scaffold is set to.",
    },
    {
      icon: Triangle,
      label: "Roof surface area",
      value: roofArea === null ? "Not assessed" : m(roofArea, "m2", 1),
      note:
        roofArea === null
          ? `Roof form “${result.input.roof_type}” is not modeled by the current roof geometry.`
          : `Illustrative area proxy, not an order takeoff. Flat footprint: ${m(footprint, "m2", 1)}; area difference: ${m(extra, "m2", 1)}. Verify product coverage and roof details.`,
    },
    {
      icon: BrickWall,
      label: "Wall area to build",
      value: m(walls.net_masonry_area_m2, "m2", 1),
      note: `${m(walls.gross_external_wall_area_m2 + walls.gross_internal_wall_area_m2, "m2", 1)} of wall less ${m(walls.total_opening_deductions_m2, "m2", 1)} of doors and windows`,
    },
  ];

  return (
    <section
      className="rounded-2xl border border-border bg-card p-5 space-y-4"
      aria-label="Your building at a glance"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
          Your building at a glance
        </h3>
        <span className="text-xs text-muted-foreground">
          Updates as you type
        </span>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-border bg-muted/20 p-4"
            >
              <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Icon
                  className="h-3.5 w-3.5 text-brand-purple"
                  aria-hidden="true"
                />
                {card.label}
              </dt>
              <dd className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {card.value}
              </dd>
              <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {card.note}
              </dd>
            </div>
          );
        })}
      </dl>

      {roof.ridge_rise_m !== null && roof.roof_span_m !== null ? (
        <p className="flex items-start gap-2 rounded-xl border border-border bg-background p-3 text-xs leading-relaxed text-muted-foreground">
          <Info
            className="mt-0.5 h-4 w-4 shrink-0 text-brand-purple"
            aria-hidden="true"
          />
          <span>
            At {result.input.roof_pitch_deg}° the roof rises{" "}
            <strong className="font-semibold text-foreground">
              {m(rise, "m", 2)}
            </strong>{" "}
            over{" "}
            <strong className="font-semibold text-foreground">
              {m(run, "m", 2)}
            </strong>{" "}
            of run: every metre you walk up the slope covers{" "}
            {m(
              run === null || rise === null ? null : run / Math.max(rise, 0.01),
              "m",
              1,
            )}{" "}
            of horizontal distance. Wall height, roof area and the quantity
            schedule below all follow from these four numbers.
          </span>
        </p>
      ) : (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
          This roof form is not modeled here. Roof rise and covering area are
          not assessed.
        </p>
      )}
    </section>
  );
}
