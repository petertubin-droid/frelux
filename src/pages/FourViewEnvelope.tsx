import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/shadcn/button";
import { ShareEstimateButton } from "@/components/ShareEstimateButton";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { classNames } from "@/lib/utils";
import { formatNumber } from "@/lib/convert/units";
import type { Point } from "@/lib/geometry/homography";
import {
  initialFaces,
  measureFace,
  type FaceGeometry,
  type FaceState,
  type OpeningRect,
} from "@/lib/geometry/four-view-measure";
import {
  buildEnvelope,
  VIEW_LABELS,
  VIEW_ORDER,
  type ElevationMeasurement,
  type ViewId,
} from "@/lib/geometry/envelope";
import {
  buildEnvelopeDxf,
  envelopeDxfFileName,
  type DxfOpening,
} from "@/lib/geometry/envelope-dxf";

/**
 * Four-view envelope and plan generator.
 *
 * Stage 1 finds the corners; this page is stage 2 and stage 3. The visitor
 * drags the wall corners onto the photographed wall, states one known length,
 * and every dimension follows from the homography, the scale ratio and
 * trigonometry. Nothing here guesses: each number in the audit trail is
 * reproducible from the handles on screen.
 */

/** Handles drawn on the photograph: wall corners, the ridge, opening corners. */
type HandleKind =
  | { type: "corner"; index: number }
  | { type: "ridge" }
  | { type: "opening"; id: string; corner: "tl" | "br" };

export default function FourViewEnvelope() {
  useSeo({
    title: "4-View Envelope & Plan Generator | FRELUX",
    description:
      "Photograph four elevations, mark the wall corners, state one known length, and get a reconciled footprint, net wall areas, roof pitch and a DXF plan.",
    canonicalPath: "/four-view-envelope",
  });
  useBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Pro & Field", path: "/pro-tools" },
    { name: "4-View Envelope & Plan Generator", path: "/four-view-envelope" },
  ]);

  const [faces, setFaces] = useState<Record<ViewId, FaceState>>(initialFaces);
  const [active, setActive] = useState<ViewId>("front");
  const [tolerancePct, setTolerancePct] = useState("2");

  const geometry = useMemo(() => {
    const out = {} as Record<ViewId, FaceGeometry>;
    for (const view of VIEW_ORDER) out[view] = measureFace(faces[view]);
    return out;
  }, [faces]);

  const allReady = VIEW_ORDER.every((view) => geometry[view].ready);

  const outcome = useMemo(() => {
    if (!allReady) return null;
    const elevations: ElevationMeasurement[] = VIEW_ORDER.map((view) => ({
      view,
      widthMm: geometry[view].widthMm!,
      eaveHeightMm: geometry[view].eaveHeightMm!,
      roofRiseMm: geometry[view].roofRiseMm,
      openings: geometry[view].openings.map((opening) => ({
        kind: opening.kind,
        widthMm: opening.widthMm,
        heightMm: opening.heightMm,
      })),
    }));
    return buildEnvelope(elevations, {
      tolerancePct: Number(tolerancePct) || 2,
    });
  }, [allReady, geometry, tolerancePct]);

  const envelope = outcome?.ok ? outcome.envelope : null;

  function updateFace(view: ViewId, patch: Partial<FaceState>) {
    setFaces((current) => ({
      ...current,
      [view]: { ...current[view], ...patch },
    }));
  }

  function loadImage(view: ViewId, file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateFace(view, { image: reader.result });
      }
    };
    reader.readAsDataURL(file);
  }

  function downloadDxf() {
    if (!envelope) return;
    const openings: DxfOpening[] = [];
    for (const view of VIEW_ORDER) {
      for (const opening of geometry[view].openings) {
        openings.push({
          view,
          kind: opening.kind,
          widthMm: opening.widthMm,
          heightMm: opening.heightMm,
          offsetMm: opening.offsetMm,
        });
      }
    }
    const dxf = buildEnvelopeDxf({
      widthMm: envelope.widthMm,
      depthMm: envelope.depthMm,
      openings,
      note: `FRELUX envelope ${formatNumber(envelope.widthMm / 1000, 2)} x ${formatNumber(envelope.depthMm / 1000, 2)} m`,
    });
    const blob = new Blob([dxf], { type: "application/dxf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = envelopeDxfFileName(envelope.widthMm, envelope.depthMm);
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        variant="data"
        eyebrow="Pro & Field"
        title="4-View Envelope & Plan Generator"
        subtitle="Four photographs, one known length. The corners are yours to place, the geometry is deterministic, and every number carries its working."
        breadcrumbs={[
          { label: "Pro & Field", path: "/pro-tools" },
          { label: "4-View Envelope & Plan Generator" },
        ]}
      />

      <Container className="py-10">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {VIEW_ORDER.map((view) => {
            const face = geometry[view];
            return (
              <button
                key={view}
                type="button"
                onClick={() => setActive(view)}
                className={classNames(
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
                  active === view
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {VIEW_LABELS[view]}
                <span
                  className={classNames(
                    "ml-2 inline-block h-1.5 w-1.5 rounded-full",
                    face.ready ? "bg-emerald-500" : "bg-muted-foreground/40",
                  )}
                />
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-[12rem] flex-1 text-sm font-medium">
                  {VIEW_LABELS[active]} photograph
                  <input
                    className="mt-2 block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:font-semibold file:text-primary-foreground"
                    type="file"
                    accept="image/*"
                    aria-label={`${VIEW_LABELS[active]} photograph`}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) loadImage(active, file);
                    }}
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    updateFace(active, {
                      openings: [
                        ...faces[active].openings,
                        {
                          id: crypto.randomUUID(),
                          kind: "window",
                          rect: { x: 0.42, y: 0.45, w: 0.16, h: 0.16 },
                        },
                      ],
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Window
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    updateFace(active, {
                      openings: [
                        ...faces[active].openings,
                        {
                          id: crypto.randomUUID(),
                          kind: "door",
                          rect: { x: 0.44, y: 0.55, w: 0.12, h: 0.3 },
                        },
                      ],
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Door
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    updateFace(active, {
                      ridge: faces[active].ridge ?? {
                        x:
                          (faces[active].quad[0].x + faces[active].quad[1].x) /
                          2,
                        y: faces[active].quad[0].y - 0.12,
                      },
                    })
                  }
                  disabled={!!faces[active].ridge}
                >
                  <Plus className="mr-2 h-4 w-4" /> Ridge
                </Button>
              </div>

              <FaceCanvas
                view={active}
                face={faces[active]}
                onQuad={(quad) => updateFace(active, { quad })}
                onRidge={(ridge) => updateFace(active, { ridge })}
                onOpenings={(openings) => updateFace(active, { openings })}
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
                <label className="text-sm font-medium">
                  Known length is the
                  <select
                    className="mt-2 w-full rounded-lg border border-border bg-background p-2"
                    value={faces[active].referenceMode}
                    onChange={(event) =>
                      updateFace(active, {
                        referenceMode: event.target.value as "width" | "height",
                      })
                    }
                    aria-label="Which known length"
                  >
                    <option value="width">Wall width</option>
                    <option value="height">Eave height</option>
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Length (mm)
                  <input
                    className="mt-2 w-full rounded-lg border border-border bg-background p-2"
                    inputMode="decimal"
                    value={faces[active].referenceMm}
                    onChange={(event) =>
                      updateFace(active, { referenceMm: event.target.value })
                    }
                    aria-label="Known length in millimetres"
                    placeholder="12000"
                  />
                </label>
              </div>

              {geometry[active].problems.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {geometry[active].problems.map((problem) => (
                    <li key={problem}>· {problem}</li>
                  ))}
                </ul>
              )}
            </section>

            <RectifiedPreview
              view={active}
              geometry={geometry[active]}
              ridge={faces[active].ridge !== null}
            />
          </div>

          <div className="space-y-4">
            <section className="rounded-2xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Reconciliation</h2>
              {!envelope ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Measure all four elevations to close the shell. Ready so far:{" "}
                  {VIEW_ORDER.filter((v) => geometry[v].ready).length} of 4.
                </p>
              ) : (
                <>
                  <label className="mt-3 block text-xs font-medium text-muted-foreground">
                    Photo tolerance (%)
                    <input
                      className="mt-1 w-24 rounded-lg border border-border bg-background p-2 text-sm"
                      inputMode="decimal"
                      value={tolerancePct}
                      onChange={(event) => setTolerancePct(event.target.value)}
                      aria-label="Photo tolerance percent"
                    />
                  </label>
                  <ul className="mt-3 space-y-2 text-sm">
                    {envelope.checks.map((check) => (
                      <li
                        key={check.pair}
                        className="flex justify-between gap-3"
                      >
                        <span className="text-muted-foreground">
                          {check.pair === "width"
                            ? "Front / back width"
                            : "Left / right depth"}
                        </span>
                        <span className="text-right">
                          {formatNumber(check.reconciledMm / 1000, 3)} m
                          <span
                            className={classNames(
                              "ml-2 text-xs",
                              check.withinTolerance
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-amber-600 dark:text-amber-400",
                            )}
                          >
                            {check.differencePct}% apart
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            {envelope && (
              <section className="rounded-2xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold">Quantities</h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <Row
                    label="Footprint"
                    value={`${formatNumber(envelope.footprintAreaM2, 2)} m²`}
                  />
                  <Row
                    label="Perimeter"
                    value={`${formatNumber(envelope.perimeterM, 2)} m`}
                  />
                  <Row
                    label="Gross wall area"
                    value={`${formatNumber(envelope.grossWallAreaM2, 2)} m²`}
                  />
                  <Row
                    label="Openings"
                    value={`${formatNumber(envelope.openingAreaM2, 2)} m²`}
                  />
                  <Row
                    label="Net wall area"
                    value={`${formatNumber(envelope.netWallAreaM2, 2)} m²`}
                    emphasized
                  />
                  <Row
                    label="Roof pitch"
                    value={`${formatNumber(envelope.roofPitchDeg, 2)}°`}
                  />
                  <Row
                    label="True roof area"
                    value={`${formatNumber(envelope.trueRoofAreaM2, 2)} m²`}
                    emphasized
                  />
                </dl>

                {envelope.warnings.length > 0 && (
                  <ul className="mt-3 space-y-1 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                    {envelope.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" onClick={downloadDxf}>
                    <Download className="mr-2 h-4 w-4" /> Download DXF plan
                  </Button>
                  <ShareEstimateButton
                    showPdf
                    estimate={{
                      kind: "4-View Envelope",
                      summaryLines: [
                        {
                          label: "Footprint",
                          value: `${formatNumber(envelope.widthMm / 1000, 3)} x ${formatNumber(envelope.depthMm / 1000, 3)} m`,
                        },
                        {
                          label: "Net wall area",
                          value: `${formatNumber(envelope.netWallAreaM2, 2)} m²`,
                        },
                        {
                          label: "Roof",
                          value: `${formatNumber(envelope.roofPitchDeg, 2)}° · ${formatNumber(envelope.trueRoofAreaM2, 2)} m²`,
                        },
                      ],
                      lineItems: envelope.views.map((view) => ({
                        description: `${VIEW_LABELS[view.view]} wall`,
                        quantity: `${formatNumber(view.widthMm / 1000, 3)} x ${formatNumber(view.eaveHeightMm / 1000, 3)} m · net ${formatNumber(view.netWallAreaM2, 2)} m²`,
                      })),
                      totals: [
                        {
                          label: "Net wall area to finish",
                          value: `${formatNumber(envelope.netWallAreaM2, 2)} m²`,
                          emphasized: true,
                        },
                      ],
                      notes: [
                        "Measured from four rectified elevations with one stated reference length.",
                        ...envelope.warnings,
                      ],
                      link: "/four-view-envelope",
                    }}
                    compact
                  />
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Audit trail</h2>
              {envelope ? (
                <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {envelope.audit.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Each derived number is listed here once all four elevations
                  are measured.
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">
                Take the quantities further
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                The net wall area feeds the finish engines; the roof area feeds
                the roofing engine. Copy the figure you need into the
                calculator.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {[
                  { label: "EIFS wall", to: "/eifs-wall-estimator" },
                  { label: "Painting", to: "/painting-calculator" },
                  { label: "Roof", to: "/roof-calculator" },
                  { label: "Blockwork", to: "/blockwork-calculator" },
                ].map((link) => (
                  <a
                    key={link.to}
                    href={link.to}
                    className="rounded-full border border-border px-3 py-1.5 font-medium hover:border-brand-purple/40"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </section>
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold">How this is calculated</h2>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              1. The four wall corners you place are mapped onto a flat
              rectangle by a 3×3 homography, solved from eight linear equations.
              Windows, doors and the ridge travel through the same matrix.
            </li>
            <li>
              2. One length you know converts pixels to millimetres: scale =
              real length ÷ rectified pixel length. Every other dimension is
              that ratio applied once.
            </li>
            <li>
              3. Front and back widths, and left and right depths, are averaged;
              the gap between them is shown as a percentage of the average.
            </li>
            <li>
              4. Net wall area is gross area less openings. Roof pitch is
              atan(rise ÷ half-depth) and the true sloped area is the footprint
              divided by cos(pitch).
            </li>
          </ol>
        </section>
      </Container>
    </>
  );
}

function Row({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={classNames(
          "tabular-nums",
          emphasized && "font-semibold text-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** The rectified elevation, drawn to scale in millimetres. */
function RectifiedPreview({
  view,
  geometry,
  ridge,
}: {
  view: ViewId;
  geometry: FaceGeometry;
  ridge: boolean;
}) {
  if (!geometry.ready) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center text-xs text-muted-foreground">
        The rectified elevation appears here once the {VIEW_LABELS[view]}{" "}
        corners and one known length are set.
      </section>
    );
  }
  const width = geometry.widthMm!;
  const height = geometry.eaveHeightMm!;
  const scale = 260 / Math.max(width, height);
  const pad = 20;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">
        Rectified {VIEW_LABELS[view]} elevation (mm)
      </h2>
      <svg
        viewBox={`0 0 ${width * scale + pad * 2} ${height * scale + pad * 2 + (ridge ? 60 : 0)}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`Rectified ${VIEW_LABELS[view]} elevation`}
      >
        <g transform={`translate(${pad}, ${pad + (ridge ? 60 : 0)})`}>
          <rect
            x={0}
            y={0}
            width={width * scale}
            height={height * scale}
            fill="rgba(56,189,248,0.08)"
            stroke="#38bdf8"
            strokeWidth={1.5}
          />
          {geometry.openings.map((opening, index) => {
            const h = opening.heightMm * scale;
            const w = opening.widthMm * scale;
            const x = opening.offsetMm * scale;
            return (
              <rect
                key={index}
                x={x}
                y={height * scale - h}
                width={w}
                height={h}
                fill="rgba(250,204,21,0.25)"
                stroke="#facc15"
                strokeWidth={1}
              />
            );
          })}
          {ridge && geometry.roofRiseMm !== null && (
            <polyline
              points={`0,0 ${(width * scale) / 2},${-geometry.roofRiseMm * scale} ${width * scale},0`}
              fill="none"
              stroke="#f97316"
              strokeWidth={1.5}
            />
          )}
        </g>
        <text
          x={pad}
          y={pad + (ridge ? 60 : 0) - 6}
          fontSize={11}
          fill="currentColor"
        >
          {formatNumber(width / 1000, 3)} m
        </text>
      </svg>
      <p className="mt-2 text-xs text-muted-foreground">
        {formatNumber(width, 0)} × {formatNumber(height, 0)} mm ·{" "}
        {geometry.openings.length} opening
        {geometry.openings.length === 1 ? "" : "s"}
      </p>
    </section>
  );
}

/** Photograph with draggable wall corners, ridge and opening handles. */
function FaceCanvas({
  view,
  face,
  onQuad,
  onRidge,
  onOpenings,
}: {
  view: ViewId;
  face: FaceState;
  onQuad: (quad: Point[]) => void;
  onRidge: (ridge: Point | null) => void;
  onOpenings: (openings: OpeningRect[]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<HandleKind | null>(null);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    if (!face.image) {
      imageRef.current = null;
      setLoaded((n) => n + 1);
      return;
    }
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setLoaded((n) => n + 1);
    };
    image.src = face.image;
  }, [face.image]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    if (image) {
      const ratio = Math.min(width / image.width, height / image.height);
      const drawW = image.width * ratio;
      const drawH = image.height * ratio;
      context.drawImage(
        image,
        (width - drawW) / 2,
        (height - drawH) / 2,
        drawW,
        drawH,
      );
    } else {
      context.fillStyle = "#0f172a";
      context.fillRect(0, 0, width, height);
      context.fillStyle = "#94a3b8";
      context.font = "14px sans-serif";
      context.fillText("Upload a photograph to mark the wall", 16, 28);
    }

    const px = (p: Point) => ({ x: p.x * width, y: p.y * height });

    // Wall quad
    context.beginPath();
    face.quad.forEach((point, index) => {
      const p = px(point);
      if (index === 0) context.moveTo(p.x, p.y);
      else context.lineTo(p.x, p.y);
    });
    context.closePath();
    context.strokeStyle = "#38bdf8";
    context.lineWidth = 2;
    context.stroke();

    // Ridge
    if (face.ridge) {
      const ridge = px(face.ridge);
      const left = px(face.quad[0]);
      const right = px(face.quad[1]);
      context.beginPath();
      context.moveTo(left.x, left.y);
      context.lineTo(ridge.x, ridge.y);
      context.lineTo(right.x, right.y);
      context.strokeStyle = "#f97316";
      context.stroke();
      context.beginPath();
      context.arc(ridge.x, ridge.y, 7, 0, Math.PI * 2);
      context.fillStyle = "#f97316";
      context.fill();
    }

    // Openings
    for (const opening of face.openings) {
      const a = px({ x: opening.rect.x, y: opening.rect.y });
      const b = px({
        x: opening.rect.x + opening.rect.w,
        y: opening.rect.y + opening.rect.h,
      });
      context.strokeStyle = "#facc15";
      context.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
      context.fillStyle = "#facc15";
      context.fillRect(a.x - 4, a.y - 4, 8, 8);
      context.fillRect(b.x - 4, b.y - 4, 8, 8);
    }

    // Corner handles
    for (const point of face.quad) {
      const p = px(point);
      context.beginPath();
      context.arc(p.x, p.y, 8, 0, Math.PI * 2);
      context.fillStyle = "#ffffff";
      context.strokeStyle = "#0ea5e9";
      context.lineWidth = 2;
      context.fill();
      context.stroke();
    }
  }, [face, loaded]);

  function pointFrom(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  }

  function hitTest(point: Point): HandleKind | null {
    const near = (p: Point) => Math.hypot(p.x - point.x, p.y - point.y) < 0.035;
    if (face.ridge && near(face.ridge)) return { type: "ridge" };
    for (let i = 0; i < face.quad.length; i++) {
      if (near(face.quad[i])) return { type: "corner", index: i };
    }
    for (const opening of face.openings) {
      if (near({ x: opening.rect.x, y: opening.rect.y })) {
        return { type: "opening", id: opening.id, corner: "tl" };
      }
      if (
        near({
          x: opening.rect.x + opening.rect.w,
          y: opening.rect.y + opening.rect.h,
        })
      ) {
        return { type: "opening", id: opening.id, corner: "br" };
      }
    }
    return null;
  }

  function handleMove(point: Point) {
    const drag = dragRef.current;
    if (!drag) return;
    const clamp = (value: number) => Math.min(1, Math.max(0, value));
    if (drag.type === "corner") {
      const quad = face.quad.map((p) => ({ ...p }));
      quad[drag.index] = { x: clamp(point.x), y: clamp(point.y) };
      onQuad(quad);
    } else if (drag.type === "ridge") {
      onRidge({ x: clamp(point.x), y: clamp(point.y) });
    } else {
      const openings = face.openings.map((opening) => {
        if (opening.id !== drag.id) return opening;
        const rect = { ...opening.rect };
        if (drag.corner === "tl") {
          const right = rect.x + rect.w;
          const bottom = rect.y + rect.h;
          rect.x = Math.min(clamp(point.x), right - 0.01);
          rect.y = Math.min(clamp(point.y), bottom - 0.01);
          rect.w = right - rect.x;
          rect.h = bottom - rect.y;
        } else {
          rect.w = Math.max(0.01, clamp(point.x) - rect.x);
          rect.h = Math.max(0.01, clamp(point.y) - rect.y);
        }
        return { ...opening, rect };
      });
      onOpenings(openings);
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <canvas
        ref={canvasRef}
        width={720}
        height={480}
        className="w-full cursor-crosshair touch-none rounded-xl border border-border bg-muted"
        aria-label={`${VIEW_LABELS[view]} corner editor`}
        onPointerDown={(event) => {
          const point = pointFrom(event);
          dragRef.current = hitTest(point);
          if (dragRef.current) {
            event.currentTarget.setPointerCapture(event.pointerId);
            handleMove(point);
          }
        }}
        onPointerMove={(event) => {
          if (dragRef.current) handleMove(pointFrom(event));
        }}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      />
      <p className="text-xs text-muted-foreground">
        Drag the four white corners onto the wall, the orange dot onto the ridge
        peak, and the yellow handles onto each window or door.
      </p>
      {face.openings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {face.openings.map((opening) => (
            <button
              key={opening.id}
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs"
              onClick={() =>
                onOpenings(face.openings.filter((o) => o.id !== opening.id))
              }
            >
              <Trash2 className="h-3 w-3" /> {opening.kind}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
