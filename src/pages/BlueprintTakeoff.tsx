import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Download,
  FileUp,
  MousePointer2,
  Pencil,
  Ruler,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/shadcn/button";
import { useMarket } from "@/lib/international/market-context";

type Mode = "calibrate" | "linear" | "area" | "count" | "select";
type Mark = {
  id: string;
  page: number;
  type: "linear" | "area" | "count";
  points: { x: number; y: number }[];
  label: string;
  color: string;
};
const COLORS = ["#2563eb", "#e11d48", "#059669", "#d97706", "#7c3aed"];

export default function BlueprintTakeoff() {
  const { marketCode } = useMarket();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const [mode, setMode] = useState<Mode>("calibrate");
  const [marks, setMarks] = useState<Mark[]>([]);
  const [draft, setDraft] = useState<{ x: number; y: number }[]>([]);
  const [scale, setScale] = useState<number | null>(null); // px per metre
  const [calibrationLength, setCalibrationLength] = useState("1");
  const [zoom, setZoom] = useState(1);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState(
    "Upload a plan image or PDF to begin.",
  );
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [nativePdfCanvas, setNativePdfCanvas] =
    useState<HTMLCanvasElement | null>(null);

  const loadPdfPage = async (doc: any, pageNumber: number) => {
    const pdfPage = await doc.getPage(pageNumber);
    const viewport = pdfPage.getViewport({ scale: 1.5 });
    const c = document.createElement("canvas");
    c.width = viewport.width;
    c.height = viewport.height;
    await pdfPage.render({ canvas: c, viewport }).promise;
    setNativePdfCanvas(c);
  };
  const loadFile = async (file: File) => {
    setMarks([]);
    setDraft([]);
    setScale(null);
    setZoom(1);
    setPage(1);
    setFileName(file.name);
    if (pdfDocRef.current?.destroy) {
      void pdfDocRef.current.destroy();
      pdfDocRef.current = null;
    }
    setNativePdfCanvas(null);
    imageRef.current = null;
    if (pdfDocRef.current?.destroy) {
      void pdfDocRef.current.destroy();
      pdfDocRef.current = null;
    }
    setNativePdfCanvas(null);
    imageRef.current = null;
    const url = URL.createObjectURL(file);
    if (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    ) {
      setMessage("Loading PDF pages…");
      try {
        const pdfjs = await import("pdfjs-dist");
        // pdfjs worker shipped with the dependency, loaded as a Vite URL.
        const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const doc = await pdfjs.getDocument({ url }).promise;
        pdfDocRef.current = doc;
        setPageCount(doc.numPages);
        await loadPdfPage(doc, 1);
        URL.revokeObjectURL(url);
        setMessage(
          "PDF loaded. Choose scale calibration, then draw measurements.",
        );
      } catch (error) {
        setMessage(
          error instanceof Error
            ? `Could not read PDF: ${error.message}`
            : "Could not read this PDF.",
        );
      }
    } else {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setNativePdfCanvas(null);
        URL.revokeObjectURL(url);
        setMessage(
          "Plan loaded. Calibrate scale from a known dimension before measuring.",
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        setMessage("This image could not be loaded.");
      };
      img.src = url;
    }
  };
  useEffect(() => {
    const doc = pdfDocRef.current;
    if (doc) void loadPdfPage(doc, page);
  }, [page]);
  useEffect(
    () => () => {
      if (pdfDocRef.current?.destroy) void pdfDocRef.current.destroy();
    },
    [],
  );
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 1200;
    canvas.height = 800;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(zoom, zoom);
    const source = nativePdfCanvas ?? imageRef.current;
    if (source) {
      const fit = Math.min(1200 / source.width, 800 / source.height);
      const w = source.width * fit,
        h = source.height * fit;
      ctx.drawImage(source, (1200 - w) / 2, (800 - h) / 2, w, h);
    } else {
      ctx.strokeStyle = "#cbd5e1";
      ctx.setLineDash([7, 7]);
      ctx.strokeRect(60, 60, 1080, 680);
      ctx.setLineDash([]);
      ctx.fillStyle = "#64748b";
      ctx.font = "20px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Upload a plan drawing to start", 600, 400);
    }
    const draw = (
      points: { x: number; y: number }[],
      color: string,
      type: string,
      label: string,
    ) => {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3 / zoom;
      if (type === "area" && points.length > 2) {
        ctx.globalAlpha = 0.18;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
        if (type === "area") ctx.closePath();
        ctx.stroke();
      }
      for (const p of points) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5 / zoom, 0, Math.PI * 2);
        ctx.fill();
      }
      if (label && points.length) {
        const p = points[points.length - 1];
        ctx.font = `bold ${14 / zoom}px system-ui`;
        ctx.fillText(label, p.x + 8 / zoom, p.y - 8 / zoom);
      }
    };
    marks
      .filter((mark) => mark.page === page)
      .forEach((mark) => draw(mark.points, mark.color, mark.type, mark.label));
    if (draft.length)
      draw(draft, "#ef4444", mode === "area" ? "area" : "linear", "");
    ctx.restore();
  }, [nativePdfCanvas, marks, draft, zoom, mode]);

  const pointFromEvent = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * (1200 / rect.width)) / zoom,
      y: ((event.clientY - rect.top) * (800 / rect.height)) / zoom,
    };
  };
  const onCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageRef.current && !nativePdfCanvas) return;
    const point = pointFromEvent(event);
    if (mode === "calibrate") {
      if (draft.length === 0) {
        setDraft([point]);
        setMessage("Select the second end of the known dimension.");
        return;
      }
      const pixels = Math.hypot(point.x - draft[0].x, point.y - draft[0].y);
      const length = Number(calibrationLength);
      if (!Number.isFinite(length) || length <= 0 || pixels <= 0) {
        setDraft([]);
        setMessage(
          "Enter a positive known length and select two different points.",
        );
        return;
      }
      setScale(pixels / length);
      setDraft([]);
      setMode("select");
      setMessage(
        `Scale calibrated: ${length} m across the selected line. Measurements are estimates; verify drawing scale.`,
      );
      return;
    }
    if (mode === "count") {
      const mark: Mark = {
        id: crypto.randomUUID(),
        page,
        type: "count",
        points: [point],
        label: "1 item",
        color: COLORS[marks.length % COLORS.length],
      };
      setMarks((current) => [...current, mark]);
      return;
    }
    setDraft((current) => [...current, point]);
  };
  const finishMark = () => {
    if (!scale || (mode === "area" ? draft.length < 3 : draft.length < 2)) {
      setMessage(
        mode === "area"
          ? "Calibrate the plan and place at least three polygon points first."
          : "Calibrate the plan and place at least two points first.",
      );
      return;
    }
    const type = mode === "area" ? "area" : "linear";
    const pixels = draft
      .slice(1)
      .reduce(
        (sum, point, i) =>
          sum + Math.hypot(point.x - draft[i].x, point.y - draft[i].y),
        0,
      );
    const label =
      type === "area"
        ? `${(polygonArea(draft) / scale ** 2).toFixed(2)} m²`
        : `${(pixels / scale).toFixed(2)} m`;
    setMarks((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        page,
        type,
        points: draft,
        label,
        color: COLORS[current.length % COLORS.length],
      },
    ]);
    setDraft([]);
  };
  const exportCsv = () => {
    const rows = [
      ["Plan", fileName],
      ["Market", marketCode],
      ["Type", "Label", "Quantity", "Page"],
    ];
    marks.forEach((mark) =>
      rows.push([
        mark.type,
        mark.label,
        mark.type === "count" ? "1" : mark.label.replace(/ [m²]+$/, ""),
        String(mark.page),
      ]),
    );
    const csv = rows
      .map((row) =>
        row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "frelux-plan-takeoff.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };
  return (
    <div className="min-h-screen bg-background pb-14">
      <PageHeader
        variant="tool"
        eyebrow="Professional takeoff workspace"
        title="Blueprint & PDF Plan Takeoff"
        subtitle="Calibrate a drawing, trace linear and area quantities, count items, and export a takeoff schedule."
        backTo="/construction-tools"
        backLabel="All tools"
      />
      <main className="mx-auto max-w-7xl space-y-5 px-4 pt-6 sm:px-6">
        <section className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block text-sm font-medium">
            Plan image or vector PDF
            <input
              className="mt-2 block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:font-semibold file:text-primary-foreground"
              type="file"
              accept="image/*,.pdf,application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void loadFile(file);
              }}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium">
              Known dimension
              <select
                className="mt-2 w-full rounded-lg border border-border bg-background p-2"
                value={calibrationLength}
                onChange={(event) => setCalibrationLength(event.target.value)}
              >
                {["0.5", "1", "2", "3", "5", "10", "20"].map((v) => (
                  <option key={v} value={v}>
                    {v} m
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  setMode("calibrate");
                  setDraft([]);
                  setMessage(
                    "Click the two ends of the known drawing dimension.",
                  );
                }}
              >
                <Ruler className="mr-2 h-4 w-4" />
                Calibrate
              </Button>
            </div>
          </div>
        </section>
        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
              <Button
                size="sm"
                variant={mode === "linear" ? "default" : "outline"}
                onClick={() => {
                  setMode("linear");
                  setDraft([]);
                }}
              >
                <Ruler className="mr-1.5 h-4 w-4" />
                Linear
              </Button>
              <Button
                size="sm"
                variant={mode === "area" ? "default" : "outline"}
                onClick={() => {
                  setMode("area");
                  setDraft([]);
                }}
              >
                <Pencil className="mr-1.5 h-4 w-4" />
                Area
              </Button>
              <Button
                size="sm"
                variant={mode === "count" ? "default" : "outline"}
                onClick={() => {
                  setMode("count");
                  setDraft([]);
                }}
              >
                <MousePointer2 className="mr-1.5 h-4 w-4" />
                Count
              </Button>
              <Button size="sm" variant="outline" onClick={finishMark}>
                Finish measurement
              </Button>
              <span className="ml-auto flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Zoom out"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center text-xs">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Zoom in"
                  onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </span>
            </div>
            {pageCount > 1 && (
              <div className="flex items-center justify-between border-b border-border px-4 py-2 text-sm">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous page
                </button>
                <span>
                  Page {page} of {pageCount}
                </span>
                <button
                  type="button"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next page
                </button>
              </div>
            )}
            <div className="overflow-auto bg-slate-100 p-2 dark:bg-slate-950">
              <canvas
                ref={canvasRef}
                onClick={onCanvasClick}
                className="mx-auto w-full cursor-crosshair rounded border border-slate-300 bg-white shadow-sm"
                style={{ maxWidth: 1200 }}
              />
            </div>
            <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
              {message}
            </div>
          </section>
          <aside className="space-y-4">
            <section className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold">Takeoff schedule</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {fileName || "No plan loaded"} · {marketCode}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Export CSV"
                  onClick={exportCsv}
                  disabled={!marks.length}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 space-y-2">
                {marks.map((mark, index) => (
                  <div
                    key={mark.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border p-3"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <i
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: mark.color }}
                      />
                      {index + 1}. {mark.type} · page {mark.page}
                    </span>
                    <span className="text-sm font-semibold">{mark.label}</span>
                  </div>
                ))}
                {!marks.length && (
                  <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                    No measurements yet
                  </p>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMarks((current) => current.slice(0, -1));
                    setDraft([]);
                  }}
                  disabled={!marks.length}
                >
                  <RotateBackIcon />
                  Undo last
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMarks([]);
                    setDraft([]);
                  }}
                  disabled={!marks.length}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Clear all
                </Button>
              </div>
              <div className="mt-4 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
                Scale: {scale ? `${scale.toFixed(1)} px/m` : "not calibrated"}
                <br />
                Linear/area measures:{" "}
                {marks.filter((m) => m.type !== "count").length} · Count marks:{" "}
                {marks.filter((m) => m.type === "count").length}
              </div>
            </section>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Verify before use
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Drawing scan resolution, scale and measurement points affect
                takeoff accuracy. Cross-check measured quantities against source
                drawings and the responsible professional's review. This does
                not verify structural safety or code compliance.
              </p>
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              <FileUp className="h-4 w-4" />
              {fileName || "Upload drawing"}
            </label>
          </aside>
        </div>
      </main>
    </div>
  );
}
function polygonArea(points: { x: number; y: number }[]) {
  if (points.length < 3) return 0;
  return (
    Math.abs(
      points.reduce((sum, p, i) => {
        const next = points[(i + 1) % points.length];
        return sum + p.x * next.y - next.x * p.y;
      }, 0),
    ) / 2
  );
}
function RotateBackIcon() {
  return <span className="mr-1 inline-block text-base leading-none">↶</span>;
}
