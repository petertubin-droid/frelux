import { useId } from "react";

type BeamDiagram = {
  kind: "beam";
  span: string;
  support: "simply_supported" | "fixed" | "continuous" | "cantilever";
  section: string;
  bars: string;
  load: string;
};
type ColumnDiagram = {
  kind: "column";
  height: string;
  section: string;
  bars: string;
  load: string;
};
type SlabDiagram = {
  kind: "slab";
  spanX: string;
  spanY: string;
  thickness: string;
  bars: string;
  slabType: string;
};
type FoundationDiagram = {
  kind: "foundation";
  shape: "strip" | "pad" | "raft";
  width: string;
  length: string;
  depth: string;
  bearing: string;
  pressure: string;
  /** Unit the bearing and pressure figures are in. Defaults to kN/m². */
  pressureUnit?: string;
};
type ElectricalDiagram = {
  kind: "electrical";
  area: string;
  lights: string;
  sockets: string;
};
type PlumbingDiagram = {
  kind: "plumbing";
  counts: { label: string; value: string }[];
  runs: { label: string; value: string; entered: boolean }[];
};
type SteelDiagram = {
  kind: "steel";
  span: string;
  profile: string;
  count: string;
  mass: string;
};
type RetainingWallDiagram = {
  kind: "retaining-wall";
  length: string;
  height: string;
  footingWidth: string;
  soil: string;
  stem: string;
};
type GutterDiagram = {
  kind: "gutter";
  perimeter: string;
  overhang: string;
  material: string;
  downpipes: string;
};

export type CalculatorSchematicProps =
  | BeamDiagram
  | ColumnDiagram
  | SlabDiagram
  | FoundationDiagram
  | ElectricalDiagram
  | PlumbingDiagram
  | SteelDiagram
  | RetainingWallDiagram
  | GutterDiagram;

const labelClass = "fill-current text-[11px]";
/**
 * The extent a foundation schematic prints beside its section. The entered
 * lengths are in the user's own unit, so the label must carry that unit: a
 * US visitor entering 50 by 30 was shown a 160 m perimeter for a 160 ft
 * building.
 */
export function foundationExtentLabel(input: {
  shape: "strip" | "pad" | "raft";
  unit: "m" | "ft";
  length: number;
  width: number;
  padWidthMm?: number;
  padLengthMm?: number;
}): string {
  if (input.shape === "pad") {
    const width = input.padWidthMm ?? 0;
    const length = input.padLengthMm ?? width;
    return `${length} mm`;
  }
  if (input.shape === "strip") {
    return `${(input.length * 2 + input.width * 2).toFixed(1)} ${input.unit} perimeter`;
  }
  return `${input.length} × ${input.width} ${input.unit} footprint`;
}

/** Input-linked schematics clarify the measured geometry; they are not drawings for construction. */
export function CalculatorSchematic(props: CalculatorSchematicProps) {
  const id = useId().replace(/:/g, "");
  const heading = {
    beam: "Beam geometry and load",
    column: "Column geometry and axial load",
    slab: "Slab spans and reinforcement direction",
    foundation: "Foundation section and bearing check",
    electrical: "Electrical quick-takeoff schematic",
    plumbing: "Plumbing system quantity schematic",
    steel: "Steel beam profile and span",
    "retaining-wall": "Retaining wall material schematic",
    gutter: "Roof edge, gutter and downpipe schematic",
  }[props.kind];
  let description: string;
  switch (props.kind) {
    case "beam":
      description = `Entered span ${props.span}; ${props.support.replace(/_/g, " ")} support; calculated section ${props.section}.`;
      break;
    case "column":
      description = `Entered height ${props.height}; calculated section ${props.section} under ${props.load} axial load.`;
      break;
    case "slab":
      description = `Entered spans ${props.spanX} by ${props.spanY}; calculated thickness ${props.thickness}; ${props.slabType} action.`;
      break;
    case "foundation":
      description = `${props.shape} foundation, calculated width ${props.width}, depth ${props.depth}; applied pressure ${props.pressure} against ${props.bearing} allowable bearing.`;
      break;
    case "electrical":
      description = `Quick takeoff for ${props.area} floor area, ${props.lights} lighting points and ${props.sockets} socket points. Conceptual layout only; no circuit path or circuit design is calculated in quick mode.`;
      break;
    case "plumbing":
      description = `Fixture counts: ${props.counts.map(({ label, value }) => `${label} ${value}`).join(", ")}. Measured runs: ${props.runs.map(({ label, value, entered }) => `${label} ${entered ? value : "not entered"}`).join(", ")}. Pipe lengths are not inferred by this schematic.`;
      break;
    case "steel":
      description = `${props.count} ${props.profile} beam or beams, each spanning ${props.span}; calculated total mass ${props.mass}.`;
      break;
    case "retaining-wall":
      description = `${props.length} long by ${props.height} high ${props.stem} retaining wall; footing width ${props.footingWidth}; ${props.soil} ground profile.`;
      break;
    case "gutter":
      description = `Eaves perimeter ${props.perimeter}, overhang ${props.overhang}; ${props.material} soffit and ${props.downpipes} estimated downpipes.`;
      break;
  }

  // The page formats slab types for reading ("two way"), so the drawing has to
  // recognise both spellings; matching only the raw key meant a two-way slab
  // never showed its second layer of bars.
  const slabIsTwoWay =
    props.kind === "slab" &&
    /^two[\s_-]?way$/.test(props.slabType.trim().toLowerCase());
  // A beam labelled "4Y16" must not be drawn with seven bars. The count comes
  // from the text the calculation produced; an unreadable count draws none
  // rather than an invented arrangement.
  const statedBars =
    props.kind === "beam" ? Number.parseInt(props.bars, 10) : 0;
  const beamBarPositions =
    Number.isFinite(statedBars) && statedBars > 0
      ? Array.from({ length: Math.min(statedBars, 12) }, (_, i) => 200 + i * 26)
      : [];

  return (
    <figure
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      data-testid={`calculator-schematic-${props.kind}`}
    >
      <figcaption className="flex flex-wrap items-start justify-between gap-2 border-b border-border/70 px-4 py-3 sm:px-5">
        <div>
          <p className="text-sm font-semibold text-foreground">{heading}</p>
          <p className="mt-0.5 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-primary">
          Schematic · not to scale
        </span>
      </figcaption>
      <svg
        viewBox="0 0 640 220"
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
        className="block h-auto max-h-64 w-full text-foreground"
        preserveAspectRatio="xMidYMid meet"
      >
        <title id={`${id}-title`}>{heading}</title>
        <desc id={`${id}-desc`}>
          {description} Schematic only, not for construction.
        </desc>
        <defs>
          <pattern
            id={`${id}-grid`}
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              className="stroke-border/40"
              strokeWidth="0.7"
            />
          </pattern>
          <marker
            id={`${id}-arrow`}
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-primary" />
          </marker>
        </defs>
        <rect width="640" height="220" fill={`url(#${id}-grid)`} />
        <g
          className="stroke-primary"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          {props.kind === "beam" && (
            <>
              <line
                x1="118"
                y1="112"
                x2="522"
                y2="112"
                className="stroke-primary"
                strokeWidth="16"
              />
              {props.support === "cantilever" ? (
                <path
                  d="M118 82 V145 M108 145 H128 M108 135 L128 155 M108 145 L128 165 M108 155 L128 175"
                  className="stroke-muted-foreground"
                  strokeWidth="2"
                />
              ) : props.support === "fixed" ? (
                <path
                  d="M118 75 V150 M108 150 H128 M108 140 L128 160 M108 150 L128 170 M522 75 V150 M512 150 H532 M512 140 L532 160 M512 150 L532 170"
                  className="stroke-muted-foreground"
                  strokeWidth="2"
                />
              ) : (
                <>
                  <path
                    d="M118 124 L102 151 H134 Z M522 124 L506 151 H538 Z"
                    className="fill-primary/15 stroke-primary"
                    strokeWidth="2"
                  />
                  {props.support === "continuous" && (
                    <path
                      d="M320 124 L304 151 H336 Z"
                      className="fill-primary/15 stroke-primary"
                      strokeWidth="2"
                    />
                  )}
                </>
              )}
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <line
                  key={i}
                  x1={150 + i * 54}
                  y1="40"
                  x2={150 + i * 54}
                  y2="83"
                  markerEnd={`url(#${id}-arrow)`}
                  strokeWidth="2"
                  className="motion-safe:animate-[schematic-load_1.8s_ease-in-out_infinite] motion-reduce:animate-none"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
              <line
                x1="120"
                y1="183"
                x2="520"
                y2="183"
                markerStart={`url(#${id}-arrow)`}
                markerEnd={`url(#${id}-arrow)`}
                strokeWidth="1.5"
                className="stroke-muted-foreground"
              />
              <line
                x1="120"
                y1="168"
                x2="120"
                y2="192"
                strokeWidth="1.5"
                className="stroke-muted-foreground"
              />
              <line
                x1="520"
                y1="168"
                x2="520"
                y2="192"
                strokeWidth="1.5"
                className="stroke-muted-foreground"
              />
              <g data-testid="beam-bars">
                {beamBarPositions.map((x) => (
                  <circle
                    key={`bar-${x}`}
                    cx={x}
                    cy="112"
                    r="3"
                    className="fill-primary"
                  />
                ))}
              </g>
            </>
          )}
          {props.kind === "column" && (
            <>
              <path
                d="M272 47 H368 V164 H272 Z"
                className="fill-primary/10 stroke-primary"
                strokeWidth="4"
              />
              {[286, 354].map((x) =>
                [61, 150].map((y) => (
                  <circle
                    key={`${x}-${y}`}
                    cx={x}
                    cy={y}
                    r="4"
                    className="fill-primary"
                  />
                )),
              )}
              <line
                x1="320"
                y1="12"
                x2="320"
                y2="38"
                markerEnd={`url(#${id}-arrow)`}
              />
              <path
                d="M252 165 H388 L370 184 H270 Z"
                className="fill-muted/40 stroke-muted-foreground"
                strokeWidth="2"
              />
              <line
                x1="414"
                y1="48"
                x2="414"
                y2="163"
                markerStart={`url(#${id}-arrow)`}
                markerEnd={`url(#${id}-arrow)`}
                strokeWidth="1.5"
                className="stroke-muted-foreground"
              />
              <path
                d="M283 66 H357 M283 89 H357 M283 112 H357 M283 135 H357"
                className="stroke-primary/50"
                strokeWidth="1.5"
              />
            </>
          )}
          {props.kind === "slab" && (
            <>
              <path
                d="M122 46 H444 V161 H122 Z"
                className="fill-primary/5 stroke-primary"
                strokeWidth="3"
              />
              {Array.from({ length: 8 }, (_, i) => (
                <line
                  key={`x${i}`}
                  x1={146 + i * 39}
                  y1="48"
                  x2={146 + i * 39}
                  y2="159"
                  strokeWidth="1.5"
                  className="stroke-primary/65"
                />
              ))}
              {slabIsTwoWay && (
                <g data-testid="slab-two-way-bars">
                  {Array.from({ length: 5 }, (_, i) => (
                    <line
                      key={`y${i}`}
                      x1="124"
                      y1={67 + i * 22}
                      x2="442"
                      y2={67 + i * 22}
                      strokeWidth="1.25"
                      className="stroke-sky-500/70"
                    />
                  ))}
                </g>
              )}
              <line
                x1="122"
                y1="190"
                x2="444"
                y2="190"
                markerStart={`url(#${id}-arrow)`}
                markerEnd={`url(#${id}-arrow)`}
                strokeWidth="1.5"
                className="stroke-muted-foreground"
              />
              <line
                x1="472"
                y1="46"
                x2="472"
                y2="161"
                markerStart={`url(#${id}-arrow)`}
                markerEnd={`url(#${id}-arrow)`}
                strokeWidth="1.5"
                className="stroke-muted-foreground"
              />
              <path
                d="M495 141 H565 V154 H495 Z"
                className="fill-primary/20 stroke-primary"
                strokeWidth="2"
              />
              <line
                x1="498"
                y1="143"
                x2="562"
                y2="143"
                strokeWidth="2"
                className="stroke-primary"
              />
            </>
          )}
          {props.kind === "foundation" && (
            <>
              <line
                x1="56"
                y1="123"
                x2="584"
                y2="123"
                className="stroke-amber-700/70"
                strokeDasharray="6 5"
                strokeWidth="2"
              />
              <path
                d={
                  props.shape === "strip"
                    ? "M215 45 H425 V78 H455 V153 H185 V78 H215 Z"
                    : props.shape === "pad"
                      ? "M253 38 H387 V91 H429 V153 H211 V91 H253 Z"
                      : "M120 54 H520 V150 H120 Z"
                }
                className="fill-primary/15 stroke-primary"
                strokeWidth="3"
              />
              {props.shape === "pad" && (
                <path
                  d="M274 28 H366 V85 H274 Z"
                  className="fill-muted/50 stroke-muted-foreground"
                  strokeWidth="2"
                />
              )}
              {props.shape === "strip" && (
                <path
                  d="M215 45 H425 V78 H455"
                  className="stroke-primary"
                  strokeWidth="2"
                />
              )}
              <line
                x1="185"
                y1="177"
                x2="455"
                y2="177"
                markerStart={`url(#${id}-arrow)`}
                markerEnd={`url(#${id}-arrow)`}
                strokeWidth="1.5"
                className="stroke-muted-foreground"
              />
              <path
                d="M490 123 H560"
                className="stroke-amber-700/70"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            </>
          )}
          {props.kind === "electrical" && (
            <>
              <rect
                x="141"
                y="43"
                width="358"
                height="133"
                rx="8"
                className="fill-primary/5 stroke-muted-foreground"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
              <rect
                x="158"
                y="60"
                width="34"
                height="43"
                rx="4"
                className="fill-destructive/15 stroke-destructive"
                strokeWidth="2"
              />
              <path
                d="M165 73 H185 M165 81 H185 M165 89 H185"
                className="stroke-destructive"
                strokeWidth="2"
              />
              {Array.from(
                { length: Math.min(Number(props.lights) || 0, 8) },
                (_, i) => {
                  const x = 243 + (i % 4) * 69;
                  const y = 77 + Math.floor(i / 4) * 66;
                  return (
                    <g key={`light-${i}`}>
                      <circle
                        cx={x}
                        cy={y}
                        r="10"
                        className="fill-amber-400/20 stroke-amber-500"
                        strokeWidth="2"
                      />
                      <path
                        d={`M${x} ${y - 6} V${y + 6} M${x - 6} ${y} H${x + 6}`}
                        className="stroke-amber-600"
                        strokeWidth="1.5"
                      />
                    </g>
                  );
                },
              )}
              {Array.from(
                { length: Math.min(Number(props.sockets) || 0, 8) },
                (_, i) => {
                  const x = 218 + (i % 4) * 77;
                  const y = i < 4 ? 52 : 165;
                  return (
                    <g key={`socket-${i}`}>
                      <rect
                        x={x}
                        y={y}
                        width="15"
                        height="9"
                        rx="2"
                        className="fill-blue-500/15 stroke-blue-500"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={x + 5}
                        cy={y + 4.5}
                        r="1"
                        className="fill-blue-600"
                      />
                      <circle
                        cx={x + 10}
                        cy={y + 4.5}
                        r="1"
                        className="fill-blue-600"
                      />
                    </g>
                  );
                },
              )}
              <path
                d="M192 82 H211 M211 82 V115 H451 M211 115 V147 H451"
                className="stroke-primary/45"
                strokeWidth="2"
                strokeDasharray="4 5"
              />
            </>
          )}
          {props.kind === "plumbing" && (
            <>
              <path
                d="M105 56 H485 M105 78 H485"
                className="stroke-sky-500"
                strokeWidth="5"
              />
              <path
                d="M105 56 H485"
                className="stroke-white/80 motion-safe:animate-[schematic-flow_2.4s_linear_infinite] motion-reduce:animate-none"
                strokeWidth="1.5"
                strokeDasharray="5 12"
              />
              <path
                d="M105 151 H485 M105 173 H485"
                className="stroke-amber-700"
                strokeWidth="5"
              />
              <path
                d="M105 151 H485"
                className="stroke-white/70 motion-safe:animate-[schematic-flow_3s_linear_infinite] motion-reduce:animate-none"
                strokeWidth="1.5"
                strokeDasharray="5 14"
              />
              {[170, 295, 420].map((x) => (
                <g key={x}>
                  <path
                    d={`M${x} 56 V103 H${x + 26} V125 M${x} 151 V125`}
                    strokeWidth="3"
                    className="stroke-sky-500"
                  />
                  <circle
                    cx={x + 26}
                    cy="125"
                    r="9"
                    className="fill-sky-500/20 stroke-sky-500"
                    strokeWidth="2"
                  />
                  <path
                    d={`M${x + 26} 134 V151`}
                    strokeWidth="3"
                    className="stroke-amber-700"
                  />
                </g>
              ))}
              <path
                d="M86 48 V184"
                strokeWidth="4"
                className="stroke-muted-foreground"
              />
              <circle cx="86" cy="56" r="7" className="fill-sky-500" />
              <circle cx="86" cy="162" r="7" className="fill-amber-700" />
            </>
          )}
          {props.kind === "steel" && (
            <>
              <line x1="124" y1="145" x2="516" y2="145" strokeWidth="13" />
              <path
                d="M126 153 L110 180 H142 Z M514 153 L498 180 H530 Z"
                className="fill-primary/15 stroke-primary"
                strokeWidth="2"
              />
              <path
                d="M284 43 H356 V61 H329 V151 H311 V61 H284 Z"
                className="fill-primary/15 stroke-primary"
                strokeWidth="3"
              />
              <line
                x1="124"
                y1="199"
                x2="516"
                y2="199"
                markerStart={`url(#${id}-arrow)`}
                markerEnd={`url(#${id}-arrow)`}
                strokeWidth="1.5"
                className="stroke-muted-foreground"
              />
              <line
                x1="321"
                y1="53"
                x2="397"
                y2="42"
                strokeWidth="1.5"
                className="stroke-muted-foreground"
              />
            </>
          )}
          {props.kind === "retaining-wall" && (
            <>
              <path
                d="M107 76 H520"
                strokeWidth="2"
                className="stroke-amber-700/65"
                strokeDasharray="7 5"
              />
              <path
                d="M306 52 H362 V148 H306 Z"
                className="fill-primary/15 stroke-primary"
                strokeWidth="3"
              />
              <path
                d="M230 148 H430 V176 H230 Z"
                className="fill-primary/20 stroke-primary"
                strokeWidth="3"
              />
              <path
                d="M365 79 H505 V147 H365 Z"
                className="fill-amber-700/10 stroke-amber-700/40"
                strokeWidth="2"
              />
              {[95, 115, 135].map((y) => (
                <path
                  key={y}
                  d={`M394 ${y} H468`}
                  className="stroke-amber-700/50"
                  strokeWidth="2"
                  markerEnd={`url(#${id}-arrow)`}
                />
              ))}
              <circle cx="365" cy="132" r="4" className="fill-sky-500" />
              <path
                d="M370 132 H405 V159"
                className="stroke-sky-500"
                strokeWidth="2"
              />
              <line
                x1="306"
                y1="194"
                x2="362"
                y2="194"
                markerStart={`url(#${id}-arrow)`}
                markerEnd={`url(#${id}-arrow)`}
                strokeWidth="1.5"
                className="stroke-muted-foreground"
              />
            </>
          )}
          {props.kind === "gutter" && (
            <>
              <path
                d="M151 55 L412 88 L395 112"
                className="stroke-primary"
                strokeWidth="13"
              />
              <path
                d="M378 102 Q405 97 421 110 L414 143 Q400 156 383 145 Z"
                className="fill-sky-500/20 stroke-sky-500"
                strokeWidth="3"
              />
              <path
                d="M412 143 V185 H438"
                className="stroke-sky-500"
                strokeWidth="6"
              />
              <path
                d="M440 47 V190"
                className="stroke-muted-foreground/50"
                strokeWidth="2"
                strokeDasharray="5 5"
              />
              <path
                d="M472 80 V185"
                className="stroke-sky-500/50"
                strokeWidth="3"
                strokeDasharray="6 5"
              />
              <line
                x1="151"
                y1="34"
                x2="412"
                y2="67"
                markerStart={`url(#${id}-arrow)`}
                markerEnd={`url(#${id}-arrow)`}
                strokeWidth="1.5"
                className="stroke-muted-foreground"
              />
            </>
          )}
        </g>
        <g className={labelClass}>
          {props.kind === "beam" && (
            <>
              <text x="320" y="211" textAnchor="middle">
                Span {props.span}
              </text>
              <text x="320" y="24" textAnchor="middle">
                Factored line load {props.load}
              </text>
              <text
                x="320"
                y="139"
                textAnchor="middle"
                className="fill-foreground font-semibold"
              >
                {props.section} · {props.bars}
              </text>
            </>
          )}
          {props.kind === "column" && (
            <>
              <text x="431" y="108">
                Height {props.height}
              </text>
              <text x="320" y="207" textAnchor="middle">
                Section {props.section} · {props.bars}
              </text>
              <text x="320" y="14" textAnchor="middle">
                Axial load {props.load}
              </text>
            </>
          )}
          {props.kind === "slab" && (
            <>
              <text x="283" y="211" textAnchor="middle">
                Short span {props.spanX}
              </text>
              <text
                x="492"
                y="108"
                transform="rotate(90 492 108)"
                textAnchor="middle"
              >
                Long span {props.spanY}
              </text>
              <text x="530" y="128" textAnchor="middle">
                {props.thickness}
              </text>
              <text x="283" y="38" textAnchor="middle">
                Bars {props.bars}
              </text>
            </>
          )}
          {props.kind === "foundation" && (
            <>
              <text x="320" y="198" textAnchor="middle">
                Width {props.width} · depth {props.depth} · length{" "}
                {props.length}
              </text>
              <text x="320" y="28" textAnchor="middle">
                {props.shape.toUpperCase()} FOOTING
              </text>
              <text x="510" y="115">
                Ground
              </text>
              <text
                x="320"
                y="167"
                textAnchor="middle"
                className="fill-muted-foreground"
              >
                {props.pressure} applied / {props.bearing} allowable {props.pressureUnit ?? "kN/m²"}
              </text>
            </>
          )}
          {props.kind === "electrical" && (
            <>
              <text x="320" y="24" textAnchor="middle">
                Conceptual room area · {props.area} m²
              </text>
              <text
                x="175"
                y="116"
                textAnchor="middle"
                className="fill-destructive"
              >
                DB
              </text>
              <text x="320" y="206" textAnchor="middle">
                {props.lights} lighting points · {props.sockets} socket points
              </text>
            </>
          )}
          {props.kind === "plumbing" && (
            <>
              <text x="86" y="33" textAnchor="middle">
                Supply
              </text>
              <text x="86" y="207" textAnchor="middle">
                Waste
              </text>
              <text x="320" y="30" textAnchor="middle" className="fill-sky-600">
                Cold / hot measured runs
              </text>
              <text
                x="320"
                y="202"
                textAnchor="middle"
                className="fill-amber-700"
              >
                Waste / drainage measured runs
              </text>
            </>
          )}
          {props.kind === "steel" && (
            <>
              <text x="320" y="216" textAnchor="middle">
                Span {props.span} · {props.count} beam(s)
              </text>
              <text x="405" y="39">
                {props.profile}
              </text>
              <text x="320" y="25" textAnchor="middle">
                Total mass {props.mass}
              </text>
            </>
          )}
          {props.kind === "retaining-wall" && (
            <>
              <text x="320" y="42" textAnchor="middle">
                Wall height {props.height}
              </text>
              <text x="320" y="215" textAnchor="middle">
                Wall length {props.length} · footing width {props.footingWidth}
              </text>
              <text x="469" y="70">
                Retained ground
              </text>
              <text x="115" y="70">
                {props.soil}
              </text>
            </>
          )}
          {props.kind === "gutter" && (
            <>
              <text x="280" y="26" textAnchor="middle">
                Roof edge · overhang {props.overhang}
              </text>
              <text x="439" y="177">
                Downpipe
              </text>
              <text x="320" y="211" textAnchor="middle">
                Eaves perimeter {props.perimeter} · {props.material} ·{" "}
                {props.downpipes} estimated
              </text>
            </>
          )}
        </g>
      </svg>
      {props.kind === "electrical" && (
        <p className="border-t border-border/70 px-4 py-3 text-xs leading-relaxed text-muted-foreground sm:px-5">
          Quick mode applies planning allowances to floor area and point counts.
          Symbols are representative only, not device locations or connected
          circuits. Use the interactive Manhattan router for a measured point
          layout; a qualified electrician must design and verify circuits,
          protection, earthing and cable sizes.
        </p>
      )}
      {props.kind === "plumbing" && (
        <div className="grid gap-3 border-t border-border/70 px-4 py-3 sm:grid-cols-2 sm:px-5">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Fixture counts
            </p>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-foreground">
              {props.counts.map((item) => (
                <li key={item.label} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium tabular-nums">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Measured pipe runs
            </p>
            <ul className="space-y-1 text-[11px] text-foreground">
              {props.runs.map((item) => (
                <li key={item.label} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span
                    className={`font-medium tabular-nums ${item.entered ? "text-foreground" : "text-amber-700 dark:text-amber-400"}`}
                  >
                    {item.entered ? item.value : "Not entered"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Blank runs remain unsized; this schematic never derives or invents
              pipe lengths.
            </p>
          </div>
        </div>
      )}
      {props.kind !== "electrical" && (
        <p className="border-t border-border/70 px-4 py-2 text-[10px] text-muted-foreground sm:px-5">
          Geometry is illustrative and not to scale. Use the calculator results
          and disclosed assumptions; this graphic is not a design or
          construction drawing.
        </p>
      )}
    </figure>
  );
}
