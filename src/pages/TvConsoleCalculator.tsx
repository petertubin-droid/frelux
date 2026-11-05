import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Camera, Check, ImagePlus, LockKeyhole, Ruler, Sparkles } from "lucide-react";
import { useSeo } from "@/lib/seo";
import PageHeader from "@/components/ui/PageHeader";
import AdSlot from "@/components/ui/AdSlot";
import { SubscriptionGate } from "@/components/subscription/SubscriptionGate";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import { Badge } from "@/components/ui/shadcn/badge";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { TV_CONSOLE_TEMPLATES } from "@/lib/tv-console/templates";
import { calculateConsoleEstimate, dimensionsFromTemplate } from "@/lib/tv-console/calculator";

const number = (v: string, fallback: number) => v === "" ? fallback : Number(v);

export default function TvConsoleCalculator() {
  const [selectedId, setSelectedId] = useState(TV_CONSOLE_TEMPLATES[0].id);
  const [width, setWidth] = useState(1800);
  const [height, setHeight] = useState(400);
  const [depth, setDepth] = useState(350);
  const [shelves, setShelves] = useState(2);
  const [sheetW, setSheetW] = useState(1220);
  const [sheetL, setSheetL] = useState(2440);
  const [waste, setWaste] = useState(0);
  const [sheetPrice, setSheetPrice] = useState(0);
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
    try { return calculateConsoleEstimate({ widthMm: width, heightMm: height, depthMm: depth, shelfCount: shelves, sheetWidthMm: sheetW, sheetLengthMm: sheetL, wastePercent: waste, sheetPrice }, currency); }
    catch { return null; }
  }, [width, height, depth, shelves, sheetW, sheetL, waste, sheetPrice, currency]);

  useSeo({ title: "TV Console & Media Unit Calculator | FRELUX", description: "Choose from 10 TV-console concepts, adjust dimensions, and review a transparent preliminary board-area and sheet estimate. Optional AI image parsing is Pro-gated and requires measurement confirmation.", canonicalPath: "/tv-console-calculator", keywords: "TV console calculator, media unit material estimator, entertainment center dimensions" });

  const applyTemplate = (id: string) => {
    const template = TV_CONSOLE_TEMPLATES.find((t) => t.id === id)!;
    setSelectedId(id); setWidth(template.widthMm); setHeight(template.heightMm); setDepth(template.depthMm); setShelves(2); setExtraction(null);
  };

  const chooseImage = (f?: File) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 6 * 1024 * 1024) {
      toast({ title: "Choose a supported image", message: "Upload JPEG, PNG or WebP up to 6 MB.", variant: "error" }); return;
    }
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
      const found = data.extraction;
      setExtraction(found);
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
    <PageHeader title="TV Console & Media Unit Calculator" eyebrow="10 design concepts · transparent preliminary takeoff" subtitle="Start from a curated concept or enter your own dimensions. The sheet-area result is a planning aid, not a production cut list or structural design." />
    <div className="grid gap-7 lg:grid-cols-[1.15fr_0.85fr]">
      <section aria-labelledby="templates-title" className="space-y-4">
        <div className="flex items-end justify-between gap-3"><div><h2 id="templates-title" className="text-xl font-semibold">Choose a design direction</h2><p className="mt-1 text-sm text-muted-foreground">The room images are visual references, not photos of an exact build plan.</p></div><Badge variant="outline">10 presets</Badge></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {TV_CONSOLE_TEMPLATES.map((item) => <button key={item.id} type="button" onClick={() => applyTemplate(item.id)} aria-pressed={selectedId === item.id} className={`group overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5 hover:shadow-lg ${selectedId === item.id ? "border-primary ring-2 ring-primary/20" : "border-border"}`}>
            <div className="relative aspect-[16/10] bg-muted"><img src={item.imageUrl} alt={`${item.name} interior reference`} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" /><span className="absolute right-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[10px] backdrop-blur">Reference image</span>{selectedId === item.id && <span className="absolute left-3 top-3 rounded-full bg-primary p-1.5 text-primary-foreground"><Check className="h-3.5 w-3.5" /></span>}</div>
            <div className="space-y-2 p-4"><h3 className="font-semibold">{item.name}</h3><p className="line-clamp-1 text-xs text-muted-foreground">{item.material} · {item.feature}</p><p className="text-xs font-medium tabular-nums text-foreground">{item.widthMm} × {item.heightMm} × {item.depthMm} mm</p><a className="text-[10px] text-muted-foreground underline underline-offset-2" href={item.imagePage} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Photo: {item.imageCredit}</a></div>
          </button>)}
        </div>
      </section>
      <section className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Ruler className="h-5 w-5" /></div><div><h2 className="font-semibold">Adjust your dimensions</h2><p className="text-xs text-muted-foreground">Selected: {selected.name}</p></div></div>
          <div className="grid grid-cols-2 gap-4">
            {([["Width", width, setWidth, 100, 10000], ["Height", height, setHeight, 100, 5000], ["Depth", depth, setDepth, 100, 3000]] as const).map(([label, value, setter, min, max]) => <div key={label} className="space-y-1.5"><Label htmlFor={`console-${label}`}>{label} (mm)</Label><Input id={`console-${label}`} type="number" min={min} max={max} value={value} onChange={(e) => setter(number(e.target.value, 0))} /></div>)}
            <div className="space-y-1.5"><Label htmlFor="console-shelves">Internal shelves</Label><Input id="console-shelves" type="number" min={0} max={30} step={1} value={shelves} onChange={(e) => setShelves(number(e.target.value, 0))} /></div>
            <div className="space-y-1.5"><Label htmlFor="sheet-width">Board width (mm)</Label><Input id="sheet-width" type="number" min={1} value={sheetW} onChange={(e) => setSheetW(number(e.target.value, 0))} /></div>
            <div className="space-y-1.5"><Label htmlFor="sheet-length">Board length (mm)</Label><Input id="sheet-length" type="number" min={1} value={sheetL} onChange={(e) => setSheetL(number(e.target.value, 0))} /></div>
            <div className="space-y-1.5"><Label htmlFor="workshop-waste">Workshop allowance (%)</Label><Input id="workshop-waste" type="number" min={0} max={100} value={waste} onChange={(e) => setWaste(number(e.target.value, 0))} /></div>
            <div className="space-y-1.5"><Label htmlFor="board-price">Price per sheet</Label><Input id="board-price" type="number" min={0} value={sheetPrice} onChange={(e) => setSheetPrice(number(e.target.value, 0))} /></div>
            <div className="space-y-1.5"><Label htmlFor="currency">Currency code</Label><Input id="currency" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} /></div>
          </div>
          <div className="mt-5 rounded-xl bg-muted/50 p-4"><div className="flex items-center justify-between gap-4"><span className="text-sm font-medium">Indicative material takeoff</span><Badge variant="outline">Preliminary</Badge></div>
            {result ? <div className="mt-3 grid grid-cols-2 gap-3"><div><div className="text-2xl font-bold tabular-nums">{result.carcassAreaM2.toFixed(2)} m²</div><div className="text-xs text-muted-foreground">modeled board area</div></div><div><div className="text-2xl font-bold tabular-nums">{result.theoreticalSheetCount}</div><div className="text-xs text-muted-foreground">theoretical sheets</div></div><div className="col-span-2 border-t pt-3 text-sm">{result.materialCost !== null ? <>Entered-price subtotal: <strong>{currency} {result.materialCost.toFixed(2)}</strong></> : "Enter a sheet price to calculate a subtotal."}</div></div> : <p className="mt-3 text-sm text-destructive">Check dimensions, shelf count and workshop allowance.</p>}
            <p className="mt-3 text-xs text-muted-foreground">Workshop allowance is optional and defaults to 0%. Sheet count rounds up by total area only; it does not simulate panel nesting.</p>
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
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs leading-relaxed text-muted-foreground"><strong className="text-foreground">Not a cut list or safety design.</strong> This simplified area model excludes backs, dividers, doors, drawer boxes, hardware, finish, supports, lighting, grain direction, joint details and cutting optimization. Validate the final design, material thickness, supports and fixing method with a qualified cabinetmaker/engineer for the actual installation. AI extraction is probabilistic and is never treated as truth.</div>
      </section>
    </div>
    <AdSlot slotKey="calculator_mid" className="my-6" />
    <section className="rounded-2xl border p-5"><h2 className="font-semibold">Reference photo notes</h2><p className="mt-2 text-sm text-muted-foreground">The reference imagery comes from Unsplash contributors and is linked on each card. Images show inspiration only; the ten dimensions and material descriptions are configurable concept presets, not supplier-verified products or tested furniture designs. Each image links to the Unsplash license information; confirm licensing and attribution for any commercial reuse.</p></section>
    <div className="flex items-center gap-2 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground"><Sparkles className="h-4 w-4 shrink-0 text-primary" />Template mode is available without sign-in. Only AI image parsing requires an active Pro or higher subscription.</div>
  </main>;
}
