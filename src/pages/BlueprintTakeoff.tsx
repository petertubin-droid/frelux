import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Download,
  FileCheck2,
  FileUp,
  MousePointer2,
  Pencil,
  Ruler,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";
import EstimateDisclaimer from "@/components/calculators/EstimateDisclaimer";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { Button } from "@/components/ui/shadcn/button";
import { useMarket } from "@/lib/international/market-context";
import {
  buildWorksheetBridgeUrl,
  createTakeoffProjectExport,
  parseTakeoffProjectExport,
  serializeTakeoffProject,
  TAKEOFF_CATEGORIES,
  type TakeoffCategory,
  type TakeoffMark,
  type TakeoffProjectExport,
} from "@/lib/estimation/blueprint-takeoff-project";
import {
  buildTakeoffEngineHandoff,
  detectScaleFromSheet,
  extractDimensionCandidates,
  marksFromDxf,
  parseDxfDocument,
  parseScaleAnnotation,
  validateBlueprintDocument,
  type DimensionCandidate,
  type DocumentValidation,
  type SheetPageInfo,
  type TakeoffEngineHandoff,
} from "@/lib/estimation/blueprint-intelligence";

type Mode = "calibrate" | "linear" | "area" | "count" | "select";
type Mark = TakeoffMark;

interface PdfViewport {
  width: number;
  height: number;
}

interface PdfPageProxy {
  getViewport: (options: { scale: number }) => PdfViewport;
  render: (options: { canvas: HTMLCanvasElement; viewport: PdfViewport }) => {
    promise: Promise<void>;
  };
  rotate?: number;
  getTextContent?: () => Promise<{
    items: Array<{ str?: string; transform?: number[] }>;
  }>;
  getOperatorList?: () => Promise<{ fnArray: number[] }>;
}

interface PdfDocumentProxy {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxy>;
  destroy?: () => Promise<void> | void;
}
const COLORS = ["#2563eb", "#e11d48", "#059669", "#d97706", "#7c3aed"];

export default function BlueprintTakeoff() {
  const { marketCode } = useMarket();
  useSeo({
    title: "Blueprint & Plan Takeoff | FRELUX",
    description:
      "Calibrate a construction drawing, trace linear and area quantities, count items, and export an editable takeoff schedule.",
    canonicalPath: "/blueprint-takeoff",
  });
  useBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Construction Tools", path: "/construction-tools" },
    { name: "Blueprint Takeoff", path: "/blueprint-takeoff" },
  ]);
  const [, setSearchParams] = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pdfDocRef = useRef<PdfDocumentProxy | null>(null);
  const [mode, setMode] = useState<Mode>("calibrate");
  const [marks, setMarks] = useState<Mark[]>([]);
  const [draft, setDraft] = useState<{ x: number; y: number }[]>([]);
  const [page, setPage] = useState(1);
  const [scalesByPage, setScalesByPage] = useState<Record<number, number>>({});
  const scale = scalesByPage[page] ?? null;
  const setScale = (value: number | null) =>
    setScalesByPage((current) => {
      const next = { ...current };
      if (value === null) delete next[page];
      else next[page] = value;
      return next;
    });
  const [activeCategory, setActiveCategory] =
    useState<TakeoffCategory>("general");
  const [labelInput, setLabelInput] = useState("");
  const [calibrationLength, setCalibrationLength] = useState("1");
  const [zoom, setZoom] = useState(1);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState(
    "Upload a plan image or PDF to begin.",
  );
  const [pageCount, setPageCount] = useState(1);
  const [validation, setValidation] = useState<DocumentValidation | null>(null);
  const [dimensionCandidates, setDimensionCandidates] = useState<
    DimensionCandidate[]
  >([]);
  const [slabDepthInput, setSlabDepthInput] = useState("");
  const [handoff, setHandoff] = useState<TakeoffEngineHandoff | null>(null);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [nativePdfCanvas, setNativePdfCanvas] =
    useState<HTMLCanvasElement | null>(null);
  const importedProjectRef = useRef<TakeoffProjectExport | null>(null);

  const loadPdfPage = async (doc: PdfDocumentProxy, pageNumber: number) => {
    const pdfPage = await doc.getPage(pageNumber);
    const viewport = pdfPage.getViewport({ scale: 1.5 });
    const c = document.createElement("canvas");
    c.width = viewport.width;
    c.height = viewport.height;
    await pdfPage.render({ canvas: c, viewport }).promise;
    setNativePdfCanvas(c);
  };
  const loadFile = async (file: File) => {
    const importedProject = importedProjectRef.current;
    const restoreProject = Boolean(
      importedProject && importedProject.sourceFileName === file.name,
    );
    if (restoreProject && importedProject) {
      setMarks(importedProject.marks);
      setScalesByPage(importedProject.scalesByPage);
      setPageCount(importedProject.pageCount);
      importedProjectRef.current = null;
    } else {
      setMarks([]);
      setScalesByPage({});
    }
    setDraft([]);
    setZoom(1);
    setPage(1);
    setFileName(file.name);
    if (pdfDocRef.current?.destroy) {
      void pdfDocRef.current.destroy();
      pdfDocRef.current = null;
    }
    setNativePdfCanvas(null);
    imageRef.current = null;
    const url = URL.createObjectURL(file);
    if (file.name.toLowerCase().endsWith(".dxf")) {
      try {
        const raw = await file.text();
        const parsed = parseDxfDocument(raw);
        if ("error" in parsed) {
          setMessage(parsed.error);
          URL.revokeObjectURL(url);
          return;
        }
        const dxf = parsed.dxf;
        const bbox = dxf.bboxM;
        if (!bbox) {
          setMessage("The DXF contains no plottable geometry.");
          URL.revokeObjectURL(url);
          return;
        }
        const { marks: dxfMarks } = marksFromDxf(dxf, {
          category: "general",
        });
        const spanX = Math.max(bbox.maxX - bbox.minX, 1e-6);
        const spanY = Math.max(bbox.maxY - bbox.minY, 1e-6);
        const pxPerM = Math.min(1080 / spanX, 680 / spanY);
        const toCanvas = (point: { x: number; y: number }) => ({
          x: 60 + (point.x - bbox.minX) * pxPerM,
          y: 740 - (point.y - bbox.minY) * pxPerM,
        });
        setMarks(
          dxfMarks.map((m) => ({ ...m, points: m.points.map(toCanvas) })),
        );
        setScalesByPage({ 1: pxPerM });
        setPageCount(1);
        setPage(1);
        setNativePdfCanvas(null);
        imageRef.current = null;
        setValidation(null);
        setDimensionCandidates([]);
        setHandoff(null);
        setHandoffError(null);
        setMessage(
          `DXF loaded in ${dxf.units}: ${dxf.entityCounts.line} line(s), ${dxf.entityCounts.polyline} polyline(s), ${dxf.entityCounts.circle} circle(s) imported as marks. Review each category before use.`,
        );
      } catch {
        setMessage("This DXF file could not be read.");
      }
      URL.revokeObjectURL(url);
      return;
    }
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
        // Structural cast: this page keeps its own minimal proxy
        // interfaces above so it compiles even when pdfjs-dist is not
        // installed (optional dependency); pdfjs ships richer types.
        pdfDocRef.current = doc as unknown as PdfDocumentProxy;
        setPageCount(doc.numPages);
        await loadPdfPage(pdfDocRef.current, 1);
        URL.revokeObjectURL(url);
        setValidation(null);
        setDimensionCandidates([]);
        setHandoff(null);
        setHandoffError(null);
        setMessage(
          "PDF loaded. Calibrate manually, or run document validation and auto-detect scale.",
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

  const validateDocument = async () => {
    const doc = pdfDocRef.current;
    if (!doc) {
      setMessage("Load a vector PDF first; validation covers PDF sheets.");
      return;
    }
    setMessage("Reading sheet geometry across all pages…");
    try {
      const pdfjs = await import("pdfjs-dist");
      const pathOps = new Set<number>([
        pdfjs.OPS.constructPath,
        pdfjs.OPS.fill,
        pdfjs.OPS.eoFill,
        pdfjs.OPS.stroke,
        pdfjs.OPS.fillStroke,
        pdfjs.OPS.eoFillStroke,
      ]);
      const pages: SheetPageInfo[] = [];
      for (let n = 1; n <= doc.numPages; n++) {
        const pg = await doc.getPage(n);
        const vp = pg.getViewport({ scale: 1 });
        let hasTextContent = false;
        let hasVectorContent = true;
        try {
          const text = await (pg.getTextContent?.() ?? {
            items: [] as Array<{ str?: string; transform?: number[] }>,
          });
          hasTextContent = text.items.length > 0;
        } catch {
          hasTextContent = false;
        }
        try {
          const ops = await (pg.getOperatorList?.() ?? { fnArray: [] });
          hasVectorContent =
            typeof ops.fnArray === "undefined" ||
            ops.fnArray.some((fn) => pathOps.has(fn));
        } catch {
          hasVectorContent = true;
        }
        pages.push({
          pageNumber: n,
          widthPt: vp.width,
          heightPt: vp.height,
          rotation: pg.rotate ?? 0,
          hasTextContent,
          hasVectorContent,
        });
      }
      const result = validateBlueprintDocument({
        fileName,
        pageCount: doc.numPages,
        pages,
      });
      setValidation(result);
      setMessage(result.summary);
    } catch {
      setMessage("The document could not be validated.");
    }
  };

  const autoDetectScale = async () => {
    const doc = pdfDocRef.current;
    const canvas = nativePdfCanvas;
    if (!doc || !canvas) {
      setMessage(
        "Load a vector PDF page first; scale detection reads sheet text.",
      );
      return;
    }
    try {
      const pg = await doc.getPage(page);
      const vp = pg.getViewport({ scale: 1 });
      const longPt = Math.max(vp.width, vp.height);
      const text = await (pg.getTextContent?.() ?? {
        items: [] as Array<{ str?: string; transform?: number[] }>,
      });
      const items = text.items;
      const fullText = items.map((item) => item.str ?? "").join(" ");
      const annotation = parseScaleAnnotation(fullText);
      if (!annotation) {
        setMessage(
          `No drawing scale annotation (for example "1:100") was found in the text of sheet ${page}. Calibrate from a known dimension instead.`,
        );
        return;
      }
      const single = validateBlueprintDocument({
        fileName,
        pageCount: 1,
        pages: [
          {
            pageNumber: 1,
            widthPt: vp.width,
            heightPt: vp.height,
            rotation: pg.rotate ?? 0,
            hasTextContent: items.length > 0,
            hasVectorContent: true,
          },
        ],
      });
      const sheetClass = single.sheets[0]?.sheetClass ?? null;
      const detected = detectScaleFromSheet({
        pageLongPt: longPt,
        annotation,
        sheetClass,
      });
      if ("error" in detected) {
        setMessage(detected.error);
        return;
      }
      const fit = Math.min(1200 / canvas.width, 800 / canvas.height);
      const pxPerM = (1.5 * fit) / detected.scale.metersPerPt;
      setScale(pxPerM);
      setMode("select");
      setDraft([]);
      setMessage(
        `Auto-calibrated from "${annotation.matchedText}" on a ${detected.scale.sheetClass} sheet. ${detected.scale.note} Verify against a known dimension before trusting measurements.`,
      );
      const candidates = extractDimensionCandidates(
        items.map((item) => ({
          str: item.str ?? "",
          x: item.transform?.[4] ?? 0,
          y: item.transform?.[5] ?? 0,
        })),
      );
      setDimensionCandidates(candidates);
    } catch {
      setMessage("Scale could not be auto-detected on this sheet.");
    }
  };

  const buildHandoff = () => {
    const out = buildTakeoffEngineHandoff({
      marks,
      scalesByPage,
      slabThicknessM: Number(slabDepthInput),
    });
    if ("errors" in out) {
      setHandoff(null);
      setHandoffError(out.errors.join(" "));
      return;
    }
    setHandoffError(null);
    setHandoff(out.handoff);
  };
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
  }, [nativePdfCanvas, marks, draft, zoom, mode, page]);

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
        category: activeCategory,
        points: [point],
        quantity: 1,
        unit: "items",
        label: labelInput.trim() || `Item ${marks.length + 1}`,
        color: COLORS[marks.length % COLORS.length],
      };
      setLabelInput("");
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
    const type: Mark["type"] = mode === "area" ? "area" : "linear";
    let quantity = 0;
    if (type === "linear")
      quantity =
        draft
          .slice(1)
          .reduce(
            (sum, point, i) =>
              sum + Math.hypot(point.x - draft[i].x, point.y - draft[i].y),
            0,
          ) / scale;
    else quantity = polygonArea(draft) / (scale * scale);
    const unit = type === "area" ? "m²" : "m";
    setMarks((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        page,
        type,
        category: activeCategory,
        points: draft,
        quantity: Number(quantity.toFixed(3)),
        unit,
        label:
          labelInput.trim() ||
          `${type === "area" ? quantity.toFixed(2) + " m²" : quantity.toFixed(2) + " m"}`,
        color: COLORS[current.length % COLORS.length],
      },
    ]);
    setLabelInput("");
    setDraft([]);
  };
  const downloadFile = (name: string, content: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const exportProject = () => {
    const project = createTakeoffProjectExport({
      sourceFileName: fileName,
      marketCode,
      pageCount,
      scalesByPage,
      marks,
    });
    downloadFile(
      `${fileName || "takeoff"}.frelux-takeoff.json`,
      serializeTakeoffProject(project),
      "application/json",
    );
    setMessage("Takeoff project exported. The source drawing is not included.");
  };
  const importProject = async (file: File) => {
    const parsed = parseTakeoffProjectExport(await file.text());
    if (!parsed.ok || !parsed.project) {
      setMessage(parsed.error || "Could not read project file.");
      return;
    }
    const project = parsed.project;
    importedProjectRef.current = project;
    setMarks(project.marks);
    setFileName(project.sourceFileName);
    setPageCount(project.pageCount);
    setScalesByPage(project.scalesByPage);
    setPage(1);
    if (project.marketCode)
      setSearchParams((params) => {
        params.set("market", project.marketCode);
        return params;
      });
    setMessage(
      "Project imported. Upload the matching original drawing to restore the measurement overlay.",
    );
  };
  const bridgeToWorksheet = (mark: Mark) => {
    const bridge = buildWorksheetBridgeUrl({
      mark,
      sourceFileName: fileName,
      marketCode,
    });
    if (bridge) window.location.href = bridge.url;
  };
  const exportCsv = () => {
    const rows = [
      ["Plan", fileName],
      ["Market", marketCode],
      ["ID", "Page", "Type", "Category", "Label", "Quantity", "Unit", "Notes"],
      ...marks.map((mark) => [
        mark.id,
        String(mark.page),
        mark.type,
        mark.category,
        mark.label,
        String(mark.quantity),
        mark.unit,
        mark.notes || "",
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    downloadFile("frelux-plan-takeoff.csv", csv, "text/csv");
  };
  return (
    <div className="min-h-screen bg-background pb-14">
      <PageHeader
        variant="tool"
        eyebrow="Construction quantity tools"
        title="Blueprint & PDF Plan Takeoff"
        subtitle="Calibrate a drawing, trace linear and area quantities, count items, and export an editable takeoff schedule."
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Construction Tools", path: "/construction-tools" },
          { label: "Blueprint Takeoff" },
        ]}
        backTo="/construction-tools"
        backLabel="All tools"
      />
      <Container as="main" className="space-y-5 py-6 sm:py-8">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportProject}>
            Export project JSON
          </Button>
          <Button variant="outline" onClick={exportCsv}>
            Export CSV
          </Button>
          <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm">
            Import project
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importProject(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
        <section className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block text-sm font-medium">
            Plan image or vector PDF
            <input
              className="mt-2 block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:font-semibold file:text-primary-foreground"
              type="file"
              accept="image/*,.pdf,application/pdf,.dxf"
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
        <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void validateDocument()}
          >
            <FileCheck2 className="mr-2 h-4 w-4" />
            Validate document
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void autoDetectScale()}
          >
            <Ruler className="mr-2 h-4 w-4" />
            Auto-detect scale
          </Button>
          <p className="text-xs text-muted-foreground">
            Validation classifies every PDF sheet and flags scans. Auto-detect
            reads the printed scale annotation of the current sheet.
          </p>
        </section>
        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
              <label className="text-xs">
                Category{" "}
                <select
                  aria-label="Measurement category"
                  value={activeCategory}
                  onChange={(event) =>
                    setActiveCategory(event.target.value as TakeoffCategory)
                  }
                  className="ml-1 rounded border bg-background p-1"
                >
                  {Object.entries(TAKEOFF_CATEGORIES).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.name}
                    </option>
                  ))}
                </select>
              </label>
              <input
                aria-label="Measurement label"
                value={labelInput}
                onChange={(event) => setLabelInput(event.target.value)}
                placeholder="Measurement label"
                className="w-36 rounded border bg-background px-2 py-1 text-xs"
              />
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
            {validation && (
              <section className="rounded-2xl border border-border bg-card p-4">
                <h2 className="font-semibold">Document validation</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {validation.summary}
                </p>
                <ul className="mt-3 space-y-1 text-xs">
                  {validation.sheets.map((sheet) => (
                    <li key={sheet.pageNumber}>
                      Sheet {sheet.pageNumber}:{" "}
                      {sheet.sheetClass ?? "unclassified"} · {sheet.orientation}
                      {sheet.rotated ? " · rotated 90°" : ""}
                    </li>
                  ))}
                </ul>
                {validation.findings.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {validation.findings.map((finding, index) => (
                      <li key={index}>
                        {finding.severity === "error" ? "Error: " : "Warning: "}
                        {finding.message}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
            {dimensionCandidates.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-4">
                <h2 className="font-semibold">Detected dimensions</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Dimension text found on sheet {page}. Cross-check before use.
                </p>
                <ul className="mt-3 max-h-40 space-y-1 overflow-auto text-xs">
                  {dimensionCandidates.slice(0, 40).map((candidate, index) => (
                    <li key={index}>
                      {candidate.text} = {candidate.meters.toFixed(2)} m (
                      {candidate.unit})
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section className="rounded-2xl border border-border bg-card p-4">
              <h2 className="font-semibold">Engine handoff</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Recompute every mark from its page calibration and hand paving
                and general areas to the concrete takeoff engine.
              </p>
              <label className="mt-3 block text-sm font-medium">
                Slab depth (m)
                <input
                  value={slabDepthInput}
                  onChange={(event) => setSlabDepthInput(event.target.value)}
                  placeholder="0.15"
                  inputMode="decimal"
                  className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm"
                />
              </label>
              <Button
                type="button"
                size="sm"
                className="mt-2 w-full"
                onClick={buildHandoff}
                disabled={!marks.length}
              >
                Build engine handoff
              </Button>
              {handoffError && (
                <p className="mt-2 text-xs text-destructive">{handoffError}</p>
              )}
              {handoff && (
                <div className="mt-3 space-y-2 text-xs">
                  <p>
                    Linear runs: {handoff.linearRunsM.toFixed(2)} m · Areas:{" "}
                    {handoff.totalAreaM2.toFixed(2)} m² · Counts:{" "}
                    {handoff.totalCount}
                  </p>
                  {handoff.concreteSlabs.map((slab) => (
                    <div
                      key={slab.markId}
                      className="rounded-lg border border-border p-2"
                    >
                      <p className="font-semibold">Slab {slab.markId}</p>
                      <p>
                        {slab.lengthM.toFixed(2)} x {slab.widthM.toFixed(2)} x{" "}
                        {slab.depthM} m
                      </p>
                      <p>
                        Concrete: {slab.result.concreteVolumeM3.toFixed(2)} m³ (
                        {slab.result.volumeWithWasteM3.toFixed(2)} m³ with
                        waste)
                      </p>
                      <p>
                        Cement: {slab.result.cementBagsToBuy} bags · Sand:{" "}
                        {slab.result.sandM3.toFixed(2)} m³ · Aggregate:{" "}
                        {slab.result.aggregateM3.toFixed(2)} m³
                      </p>
                    </div>
                  ))}
                  <p className="text-muted-foreground">
                    {handoff.notes.join(" ")}
                  </p>
                </div>
              )}
            </section>
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
                      {index + 1}. {mark.category} · {mark.type} · page{" "}
                      {mark.page} · {mark.quantity} {mark.unit}
                    </span>
                    <span className="text-sm font-semibold">{mark.label}</span>
                    {buildWorksheetBridgeUrl({
                      mark,
                      sourceFileName: fileName,
                      marketCode,
                    }) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => bridgeToWorksheet(mark)}
                      >
                        Use in worksheet
                      </Button>
                    )}
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
        <EstimateDisclaimer text="Plan scale, scan resolution, drawing distortion, and manual measurement points affect accuracy. Cross-check takeoff quantities against the source drawings and site conditions; this tool does not provide structural design or code-compliance approval." />
      </Container>
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
