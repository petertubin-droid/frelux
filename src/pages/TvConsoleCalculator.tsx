import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Camera, Check, ImagePlus, LockKeyhole, Ruler, Sparkles } from "lucide-react";
import { useSeo } from "@/lib/seo";
import PageHeader from "@/components/ui/PageHeader";
import AdSlot from "@/components/ui/AdSlot";
import RelatedToolsLinks from "@/components/ui/RelatedToolsLinks";
import { FaqItemsWithSchema } from "@/components/seo/ToolFaqs";
import { SubscriptionGate } from "@/components/subscription/SubscriptionGate";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import { Badge } from "@/components/ui/shadcn/badge";
import { Checkbox } from "@/components/ui/shadcn/checkbox";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { TV_CONSOLE_TEMPLATES } from "@/lib/tv-console/templates";
import { calculateConsoleEstimate, dimensionsFromTemplate } from "@/lib/tv-console/calculator";

const number = (v: string, fallback: number) => v === "" ? fallback : Number(v);

const CONSOLE_FAQS = [
  { question: "What does the TV console calculator estimate?", answer: "It calculates a transparent rectangular-panel area schedule for the carcass parts you select: two sides, top and bottom, optional shelves and dividers, an optional back panel, and equal overlay doors. It then estimates an area-based lower-bound sheet count and an optional subtotal from the sheet price you enter." },
  { question: "How is the panel area calculated?", answer: "Each panel's area is its count multiplied by its width and height in millimetres, divided by 1,000,000 to convert square millimetres to square metres. Internal shelves and dividers fit between the carcass panels using the entered panel thickness. The result lists each modeled part so you can check the arithmetic." },
  { question: "Does the sheet count tell me exactly how many boards to buy?", answer: "No. It divides the total panel area, plus your optional workshop allowance, by one sheet's area and rounds up. This is an area lower bound only. Real cutting layouts can require more sheets because of panel nesting, saw kerf, grain direction, defects, edge conditions and offcuts." },
  { question: "Are doors, backs, shelves and dividers included?", answer: "Shelves and dividers are controlled by their counts, the back panel is an on/off option, and equal overlay doors can be included with an entered clearance. The simplified model assumes the back covers the full outside face and doors share equal widths. Drawer boxes, separate materials, hardware, finishes, edge banding, supports and joinery are not modeled." },
  { question: "What is the panel-thickness setting used for?", answer: "Thickness reduces the clear internal width and height used for shelves and dividers. The calculator does not verify that a chosen thickness is strong enough for the span, load, fixing or material. Confirm panel thickness and support details with the cabinetmaker or engineer responsible for the design." },
  { question: "Does the AI photo tool measure a console accurately?", answer: "No. AI image parsing only proposes rough visible dimensions. A photograph without a known scale cannot establish reliable measurements, and perspective or occlusion can distort apparent size. Review and confirm every proposed value against a physical measurement before using it." },
  { question: "Are the preset photos exact plans or purchasable products?", answer: "No. The photographs are visual references; the named presets are editable design directions with starter dimensions and material descriptions. They are not verified products, shop drawings, supplier listings or tested furniture designs." },
  { question: "Can I use this estimate for construction or ordering?", answer: "Use it for early planning only. It is not a cut list, manufacturing drawing, load-capacity check, wall-fixing design or safety certification. Confirm the final drawings, material specification, fixing and cutting plan with a qualified cabinetmaker or engineer before ordering or building." },
  { question: "Does the calculator use local material prices?", answer: "No live or verified local price is implied. You may enter a quoted price per sheet and the calculator multiplies it by the area-based sheet count. Confirm current stock, sheet size, grade, thickness, tax and delivery with a local supplier." },
];

export default function TvConsoleCalculator() {
  const [selectedId, setSelectedId] = useState(TV_CONSOLE_TEMPLATES[0].id);
  const [width, setWidth] = useState(1800);
  const [height, setHeight] = useState(400);
  const [depth, setDepth] = useState(350);
  const [thickness, setThickness] = useState(18);
  const [shelves, setShelves] = useState(2);
  const [dividers, setDividers] = useState(0);
  const [includeBack, setIncludeBack] = useState(true);
  const [doors, setDoors] = useState(0);
  const [doorClearance, setDoorClearance] = useState(2);
  const [sheetW, setSheetW] = useState(1220);
  const [sheetL, setSheetL] = useState(2440);
  const [waste, setWaste] = useState(0);
  const [sheetPrice, setSheetPrice] = useState<number | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extraction, setExtraction] = useState<{widthMm:number|null;heightMm:number|null;depthMm:number|null;confidence:string;notes:string[]}|null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  const selected = TV_CONSOLE_TEMPLATES.find((t) => t.id === selectedId)!;
  const result = useMemo(() => {
    try { return calculateConsoleEstimate({ widthMm: width, heightMm: height, depthMm: depth, panelThicknessMm: thickness, shelfCount: shelves, dividerCount: dividers, includeBackPanel: includeBack, doorCount: doors, doorClearanceMm: doorClearance, sheetWidthMm: sheetW, sheetLengthMm: sheetL, wastePercent: waste, sheetPrice }, currency); }
    catch { return null; }
  }, [width, height, depth, thickness, shelves, dividers, includeBack, doors, doorClearance, sheetW, sheetL, waste, sheetPrice, currency]);

  useSeo({
    title: "TV Console Material Calculator: Panels, Sheets & Cost | FRELUX",
    description: "Calculate TV console and media unit panel areas, optional shelves, dividers, back and doors, plus a transparent theoretical sheet count and your entered material price.",
    canonicalPath: "/tv-console-calculator",
    keywords: "TV console calculator, media unit material calculator, cabinet board calculator, TV stand cut list estimate, entertainment center panels, furniture sheet calculator",
    structuredData: {
      "@context": "https://schema.org", "@type": "WebApplication", name: "FRELUX TV Console & Media Unit Calculator", applicationCategory: "DesignApplication", operatingSystem: "Web",
      description: "Deterministic preliminary panel-area schedule and area-based sheet lower-bound for configurable TV console concepts. Not a cut-optimized cut list, product validation or structural design.",
      featureList: ["Ten editable concept presets", "Panel-by-panel carcass area schedule", "Optional shelves, dividers, back panel and equal overlay doors", "Area-based theoretical sheet count", "Optional user-entered sheet price", "Pro-gated rough image dimension extraction requiring user confirmation"],
    },
  });

  const applyTemplate = (id: string) => {
    const template = TV_CONSOLE_TEMPLATES.find((t) => t.id === id)!;
    setSelectedId(id); setWidth(template.widthMm); setHeight(template.heightMm); setDepth(template.depthMm); setThickness(18); setShelves(2); setDividers(0); setIncludeBack(true); setDoors(0); setDoorClearance(2); setExtraction(null);
  };

  const chooseImage = (f?: File) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 6 * 1024 * 1024) {
      toast({ title: "Choose a supported image", message: "Upload JPEG, PNG or WebP up to 6 MB.", variant: "error" }); return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f); setPreviewUrl(URL.createObjectURL(f)); setExtraction(null);
  };

  const analyze = async () => {
    if (!file) return;
    setExtracting(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("ai-tv-console-extract", { body: { imageDataUrl: dataUrl } });
      if (error || !data?.extraction) throw new Error(data?.error || error?.message || "Could not analyze the image.");
      setExtraction(data.extraction);
      toast({ title: "Visual estimate ready", message: "Review and confirm each dimension before applying it." });
    } catch (err) {
      toast({ title: "Image parsing unavailable", message: err instanceof Error ? err.message : "Try a template or enter dimensions manually.", variant: "error" });
    } finally { setExtracting(false); }
  };

  const applyExtracted = () => {
    if (!extraction) return;
    if (extraction.widthMm) setWidth(extraction.widthMm);
    if (extraction.heightMm) setHeight(extraction.heightMm);
    if (extraction.depthMm) setDepth(extraction.depthMm);
    toast({ title: "Dimensions applied", message: "You confirmed the AI-extracted values. Verify them with a tape measure before building." });
  };

  return <main className="container mx-auto max-w-7xl space-y-8 px-4 py-8">
    <PageHeader title="TV Console & Media Unit Calculator" eyebrow="Interior decor · panel-by-panel preliminary takeoff" subtitle="Choose a visual concept, enter the carcass details and see the area arithmetic by panel. The sheet count is an area-based lower bound, not a nested cut list or furniture design approval." />
    <div className="grid gap-7 lg:grid-cols-[1.15fr_0.85fr]">
      <section aria-labelledby="templates-title" className="space-y-4">
        <div className="flex items-end justify-between gap-3"><div><h2 id="templates-title" className="text-xl font-semibold">Choose a design direction</h2><p className="mt-1 text-sm text-muted-foreground">Room photographs are visual references, not exact product plans.</p></div><Badge variant="outline">10 editable presets</Badge></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {TV_CONSOLE_TEMPLATES.map((item) => <button key={item.id} type="button" onClick={() => applyTemplate(item.id)} aria-pressed={selectedId === item.id} className={`group overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5 hover:shadow-lg ${selectedId === item.id ? "border-primary ring-2 ring-primary/20" : "border-border"}`}>
            <div className="relative aspect-[16/10] bg-muted"><img src={item.imageUrl} alt={`${item.name} interior reference`} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" /><span className="absolute right-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[10px] backdrop-blur">Reference image</span>{selectedId === item.id && <span className="absolute left-3 top-3 rounded-full bg-primary p-1.5 text-primary-foreground"><Check className="h-3.5 w-3.5" /></span>}</div>
            <div className="space-y-2 p-4"><h3 className="font-semibold">{item.name}</h3><p className="line-clamp-1 text-xs text-muted-foreground">{item.material} · {item.feature}</p><p className="text-xs font-medium tabular-nums text-foreground">{item.widthMm} × {item.heightMm} × {item.depthMm} mm</p><a className="text-[10px] text-muted-foreground underline underline-offset-2" href={item.imagePage} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Photo: {item.imageCredit}</a></div>
          </button>)}
        </div>
      </section>
      <section className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Ruler className="h-5 w-5" /></div><div><h2 className="font-semibold">Cabinet dimensions & configuration</h2><p className="text-xs text-muted-foreground">Selected: {selected.name} · internal shelf/divider clearances use panel thickness</p></div></div>
          <div className="grid grid-cols-2 gap-4">
            {([ ["Width", width, setWidth, 100, 10000], ["Height", height, setHeight, 100, 5000], ["Depth", depth, setDepth, 100, 3000], ["Panel thickness", thickness, setThickness, 1, 100], ["Internal shelves", shelves, setShelves, 0, 30], ["Vertical dividers", dividers, setDividers, 0, 30], ["Overlay doors", doors, setDoors, 0, 30], ["Door clearance", doorClearance, setDoorClearance, 0, 100], ["Board width", sheetW, setSheetW, 1, 10000], ["Board length", sheetL, setSheetL, 1, 10000], ["Workshop allowance", waste, setWaste, 0, 100] ] as const).map(([label, value, setter, min, max]) => <div key={label} className="space-y-1.5"><Label htmlFor={`console-${label}`}>{label} ({label === "Workshop allowance" ? "%" : "mm"})</Label><Input id={`console-${label}`} type="number" min={min} max={max} step={label === "Internal shelves" || label === "Vertical dividers" || label === "Overlay doors" ? 1 : "any"} value={value} onChange={(e) => setter(number(e.target.value, 0))} /></div>)}
            <div className="space-y-1.5"><Label htmlFor="console-price">Local price per sheet (optional)</Label><Input id="console-price" type="number" min={0} max={1_000_000_000} step="any" placeholder="Enter a supplier quote" value={sheetPrice ?? ""} onChange={(e) => setSheetPrice(e.target.value === "" ? null : Number(e.target.value))} /></div>
            <div className="space-y-1.5"><Label htmlFor="console-currency">Currency code</Label><Input id="console-currency" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} /></div>
            <div className="col-span-2 flex items-center gap-2 rounded-lg border p-3"><Checkbox id="console-back" checked={includeBack} onCheckedChange={(v) => setIncludeBack(v === true)} /><Label htmlFor="console-back" className="cursor-pointer">Include one full-face back panel (same sheet material)</Label></div>
          </div>
          <div className="mt-5 rounded-xl bg-muted/50 p-4"><div className="flex items-center justify-between gap-4"><span className="text-sm font-medium">Panel schedule & material takeoff</span><Badge variant="outline">Preliminary</Badge></div>
            {result ? <><div className="mt-3 grid grid-cols-2 gap-3"><div><div className="text-2xl font-bold tabular-nums">{result.carcassAreaM2.toFixed(3)} m²</div><div className="text-xs text-muted-foreground">modeled panel area</div></div><div><div className="text-2xl font-bold tabular-nums">{result.theoreticalSheetCount}</div><div className="text-xs text-muted-foreground">area-based sheet lower-bound</div></div><div className="col-span-2 border-t pt-3 text-sm">Entered-price subtotal: <strong>{result.materialCost === null ? "Enter a local sheet price to see a subtotal" : `${result.currency} ${result.materialCost.toFixed(2)}`}</strong></div></div>
              <div className="mt-4 overflow-x-auto rounded-lg border bg-background"><table className="w-full min-w-[420px] text-left text-xs"><thead className="bg-muted/60 text-muted-foreground"><tr><th className="px-3 py-2">Panel part</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Each (mm)</th><th className="px-3 py-2 text-right">Area (m²)</th></tr></thead><tbody>{result.panelSchedule.map((line) => <tr key={line.part} className="border-t"><td className="px-3 py-2 font-medium">{line.part}</td><td className="px-3 py-2 text-right tabular-nums">{line.count}</td><td className="px-3 py-2 text-right tabular-nums">{line.widthMm.toFixed(0)} × {line.heightMm.toFixed(0)}</td><td className="px-3 py-2 text-right tabular-nums">{line.areaM2.toFixed(3)}</td></tr>)}</tbody></table></div>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted-foreground">{result.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
            </> : <p className="mt-3 text-sm text-destructive">Check dimensions, panel thickness, door configuration, currency code and workshop allowance.</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card p-5">
          <div className="flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Camera className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">Extract rough dimensions from a photo</h2><Badge className="gap-1"><LockKeyhole className="h-3 w-3" />Pro</Badge></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">AI only proposes visible geometry. A photo without a known scale cannot provide reliable dimensions; confirm every value and measure on site before use.</p></div></div>
          <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => chooseImage(e.target.files?.[0])} />
          <SubscriptionGate feature="tv_console_ai_design" fallback={<div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={() => inputRef.current?.click()}><ImagePlus className="mr-2 h-4 w-4" />Choose image</Button><Link to="/pricing/" className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Upgrade to Pro <ArrowRight className="ml-2 h-4 w-4" /></Link></div>}>
            <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={() => inputRef.current?.click()}><ImagePlus className="mr-2 h-4 w-4" />{file ? "Change image" : "Choose image"}</Button><Button onClick={analyze} disabled={!file || extracting}><Sparkles className="mr-2 h-4 w-4" />{extracting ? "Analyzing…" : "Extract rough dimensions"}</Button></div>
            {previewUrl && <img src={previewUrl} alt="Selected console reference upload" className="mt-4 max-h-52 w-full rounded-lg object-contain bg-muted" />}
            {extraction && <div className="mt-4 space-y-3 rounded-xl border bg-background p-4"><p className="text-sm font-semibold">AI proposal · {extraction.confidence} confidence</p><p className="text-xs text-muted-foreground">This is not verified measurement. Compare against a real measurement and correct values above.</p><div className="grid grid-cols-3 gap-2 text-sm"><span>Width: {extraction.widthMm ?? "not estimated"} mm</span><span>Height: {extraction.heightMm ?? "not estimated"} mm</span><span>Depth: {extraction.depthMm ?? "not estimated"} mm</span></div>{extraction.notes?.length > 0 && <ul className="list-disc pl-5 text-xs text-muted-foreground">{extraction.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}<Button size="sm" onClick={applyExtracted} disabled={!extraction.widthMm && !extraction.heightMm && !extraction.depthMm}>I reviewed these values, apply them</Button></div>}
          </SubscriptionGate>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs leading-relaxed text-muted-foreground"><strong className="text-foreground">Not a cut list or safety design.</strong> The deterministic schedule covers only the displayed rectangular panels; sheet count is an area lower bound and does not simulate cutting. Validate drawings, load support, material thickness, joinery and fixing method with the cabinetmaker/engineer responsible for the installation.</div>
      </section>
    </div>

    <AdSlot slotKey="calculator_mid" className="my-6" />
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="mb-4 flex items-center gap-3 border-b border-border pb-4"><BookOpen className="h-5 w-5 text-primary" /><div><h2 className="font-semibold">How the deterministic panel math works</h2><p className="text-xs text-muted-foreground">Same dimensions always produce the same panel schedule and totals.</p></div></div><div className="grid gap-4 text-sm text-muted-foreground md:grid-cols-2"><p><strong className="text-foreground">Panel area:</strong> quantity × panel width × panel height ÷ 1,000,000. Dimensions are in millimetres, so the result is square metres.</p><p><strong className="text-foreground">Assembly:</strong> top/bottom and shelves span between the side panels (width − 2 × thickness); dividers span between top and bottom (height − 2 × thickness). Doors include the same entered gap around the perimeter and between doors.</p><p><strong className="text-foreground">Sheet lower bound:</strong> ceiling[(panel area × (1 + allowance ÷ 100)) ÷ sheet area]. Area-only rounding can understate real sheet purchases.</p><p><strong className="text-foreground">Cost subtotal:</strong> theoretical sheet count × the price you entered. FRELUX does not imply that price is current or supplier-verified.</p></div></section>
    <section className="rounded-2xl border p-5"><h2 className="font-semibold">Reference photo notes</h2><p className="mt-2 text-sm text-muted-foreground">The photos are mood references, not exact product designs, shop drawings or tested furniture. The ten dimensions and material descriptions are configurable concept presets; confirm local material availability and all project specifications.</p></section>
    <div className="flex items-center gap-2 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground"><Sparkles className="h-4 w-4 shrink-0 text-primary" />Template mode is available without sign-in. Only AI image parsing requires an active Pro or higher subscription.</div>
    <FaqItemsWithSchema faqs={CONSOLE_FAQS} title="TV console calculator: frequently asked questions" />
    <RelatedToolsLinks />
  </main>;
}
