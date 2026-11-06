import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  ImagePlus,
  LockKeyhole,
  Ruler,
  Sparkles,
} from "lucide-react";
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
import { useCurrencyCode } from "@/lib/international/market-context";
import { TV_CONSOLE_TEMPLATES } from "@/lib/tv-console/templates";
import { calculateConsoleEstimate } from "@/lib/tv-console/calculator";

const number = (v: string, fallback: number) =>
  v === "" ? fallback : Number(v);
const money = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
};

const CONSOLE_FAQS = [
  {
    question: "What does the TV console calculator estimate?",
    answer:
      "It builds a panel-by-panel schedule for the carcass (two sides, top and bottom, optional shelves, dividers, drawers, back and doors), packs those panels into stock boards the way a workshop rips and cross-cuts them, and then prices board, edge banding, hardware, workshop time, finishing, installation, transport and tax from the rates you enter. It is a planning estimate, not a cutting list.",
  },
  {
    question: "Why did the sheet count change from a simple area division?",
    answer:
      "Area division ignores the shape of the parts. A 1,764 mm top cannot use the 676 mm left at the end of a 2,440 mm strip, so the offcut is waste even though the area figure says it is free. The calculator now packs each part into a lane at its depth and runs parts along the board length, which reproduces that waste before your workshop allowance is added.",
  },
  {
    question: "How is the finished depth handled when a back panel is fitted?",
    answer:
      "The back is applied to the rear face, so the carcass is cut shallower than the finished depth by the back thickness. A 350 mm console with a 6 mm back uses 344 mm deep sides and shelves. Without that deduction the built unit would stand 6 mm deeper than the dimension you entered.",
  },
  {
    question: "Are shelves and dividers counted twice where they meet?",
    answer:
      "No. Dividers consume internal width, so shelf width is reduced by the divider thickness, and shelves consume internal height, so each divider's height is reduced by the shelf thickness. The previous version counted the intersection twice.",
  },
  {
    question: "How are door widths calculated?",
    answer:
      "Full overlay doors cover the front from end to end, so the reveal is the gap between adjacent doors only. Two 900 mm doors on a 1,800 mm carcass with a 2 mm reveal are 899 mm each. Doors are full carcass height because they overlay the top and bottom edges. Hinges follow door height: two up to 900 mm, three up to 1,600 mm, four up to 2,100 mm.",
  },
  {
    question: "What is included in edge banding?",
    answer:
      "Banded length is the perimeter of doors and drawer fronts, the four edges of each side panel, and the front edge of the top, bottom, shelves and dividers, plus a 10 percent trimming allowance. Drawer boxes and the back panel are not banded.",
  },
  {
    question: "Why does the total exclude some lines?",
    answer:
      "A line with a quantity but no rate is listed as unpriced and left out of the subtotal, so a missing rate can never look like a zero cost. Enter the missing rate, or treat the subtotal as board and hardware only.",
  },
  {
    question: "What does the workshop allowance do now?",
    answer:
      "It defaults to 10 percent, which is normal furniture practice. The packed sheet count is the physical minimum; the allowance is added on top of the used area and rounded up to whole boards, so 10 percent on two boards still buys three.",
  },
  {
    question: "What happens when a console is wider than one board?",
    answer:
      "Parts longer than the board length are listed as oversized and excluded from the sheet count, because they must be jointed or cut from a longer board. A 2,600 mm console needs a joint in its top and bottom on a 2,440 mm board. The calculator reports this instead of returning a sheet number that cannot be built.",
  },
  {
    question: "Does the AI photo tool measure a console accurately?",
    answer:
      "No. AI image parsing only proposes rough visible dimensions. A photograph without a known scale cannot establish reliable measurements, and perspective or occlusion distorts apparent size. Review and confirm every proposed value against a physical measurement.",
  },
  {
    question: "Can I use this estimate for construction or ordering?",
    answer:
      "Use it for early planning only. It is not a cut list, manufacturing drawing, load-capacity check, wall-fixing design or safety certification. Confirm drawings, material specification, fixing and cutting plan with a qualified cabinetmaker or engineer before ordering or building.",
  },
];

export default function TvConsoleCalculator() {
  const marketCurrency = useCurrencyCode();
  const [selectedId, setSelectedId] = useState(TV_CONSOLE_TEMPLATES[0].id);
  const [width, setWidth] = useState(1800);
  const [height, setHeight] = useState(400);
  const [depth, setDepth] = useState(350);
  const [thickness, setThickness] = useState(18);
  const [backThickness, setBackThickness] = useState(6);
  const [shelves, setShelves] = useState(2);
  const [dividers, setDividers] = useState(0);
  const [drawers, setDrawers] = useState(0);
  const [drawerFrontHeight, setDrawerFrontHeight] = useState(200);
  const [doors, setDoors] = useState(0);
  const [reveal, setReveal] = useState(2);
  const [sheetW, setSheetW] = useState(1220);
  const [sheetL, setSheetL] = useState(2440);
  const [waste, setWaste] = useState(10);
  const [currency, setCurrency] = useState(marketCurrency || "NGN");

  const [sheetPrice, setSheetPrice] = useState("");
  const [backSheetPrice, setBackSheetPrice] = useState("");
  const [bandingPrice, setBandingPrice] = useState("");
  const [hingePrice, setHingePrice] = useState("");
  const [supportPrice, setSupportPrice] = useState("");
  const [handlePrice, setHandlePrice] = useState("");
  const [slidePrice, setSlidePrice] = useState("");
  const [workshopRate, setWorkshopRate] = useState("");
  const [finishingRate, setFinishingRate] = useState("");
  const [installPrice, setInstallPrice] = useState("");
  const [transportPrice, setTransportPrice] = useState("");
  const [taxPercent, setTaxPercent] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extraction, setExtraction] = useState<{
    widthMm: number | null;
    heightMm: number | null;
    depthMm: number | null;
    confidence: string;
    notes: string[];
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  useEffect(() => {
    if (marketCurrency) setCurrency(marketCurrency);
  }, [marketCurrency]);

  const selected = TV_CONSOLE_TEMPLATES.find((t) => t.id === selectedId)!;
  const optional = (value: string) => (value === "" ? null : Number(value));

  // The engine throws a precise reason for every refusal. Swallowing it left
  // the card guessing ("check dimensions, thickness, settings"), so the exact
  // message is kept and shown instead.
  const { result, resultError } = useMemo(() => {
    try {
      const estimate = calculateConsoleEstimate(
        {
          widthMm: width,
          heightMm: height,
          depthMm: depth,
          panelThicknessMm: thickness,
          backPanelThicknessMm: backThickness,
          shelfCount: shelves,
          dividerCount: dividers,
          drawerCount: drawers,
          drawerFrontHeightMm: drawerFrontHeight,
          doorCount: doors,
          doorRevealMm: reveal,
          sheetWidthMm: sheetW,
          sheetLengthMm: sheetL,
          wastePercent: waste,
          sheetPrice: optional(sheetPrice),
          backSheetPrice: optional(backSheetPrice),
          edgeBandingPricePerMetre: optional(bandingPrice),
          hingePriceEach: optional(hingePrice),
          shelfSupportPriceEach: optional(supportPrice),
          handlePriceEach: optional(handlePrice),
          drawerSlidePairPrice: optional(slidePrice),
          workshopRatePerM2: optional(workshopRate),
          finishingRatePerM2: optional(finishingRate),
          installationPrice: optional(installPrice),
          transportPrice: optional(transportPrice),
          taxPercent: optional(taxPercent),
        },
        currency,
      );
      return { result: estimate, resultError: null as string | null };
    } catch (err) {
      return {
        result: null,
        resultError:
          err instanceof Error
            ? err.message
            : "This configuration cannot be calculated.",
      };
    }
  }, [
    width,
    height,
    depth,
    thickness,
    backThickness,
    shelves,
    dividers,
    drawers,
    drawerFrontHeight,
    doors,
    reveal,
    sheetW,
    sheetL,
    waste,
    sheetPrice,
    backSheetPrice,
    bandingPrice,
    hingePrice,
    supportPrice,
    handlePrice,
    slidePrice,
    workshopRate,
    finishingRate,
    installPrice,
    transportPrice,
    taxPercent,
    currency,
  ]);

  useSeo({
    title: "TV Console Material Calculator: Panels, Sheets & Cost | FRELUX",
    description:
      "Calculate TV console and media unit panel areas, packed sheet counts, edge banding, hardware, workshop, finishing and installation cost, with a transparent panel-by-panel schedule.",
    canonicalPath: "/tv-console-calculator",
    keywords:
      "TV console calculator, media unit material calculator, cabinet board calculator, TV stand cut list estimate, entertainment center panels, furniture sheet calculator",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "FRELUX TV Console & Media Unit Calculator",
      applicationCategory: "DesignApplication",
      operatingSystem: "Web",
      description:
        "Deterministic panel schedule with strip-packed sheet counts, edge banding, hardware and cost roll-up for configurable TV console concepts. Not a cut-optimized cutting list, product validation or structural design.",
      featureList: [
        "Ten editable concept presets",
        "Panel-by-panel carcass area schedule",
        "Strip packing of parts into stock boards",
        "Separate back board material",
        "Edge banding and hardware quantities",
        "Workshop, finishing, installation, transport and tax lines",
        "Pro-gated rough image dimension extraction requiring user confirmation",
      ],
    },
  });

  const applyTemplate = (id: string) => {
    const template = TV_CONSOLE_TEMPLATES.find((t) => t.id === id)!;
    setSelectedId(id);
    setWidth(template.widthMm);
    setHeight(template.heightMm);
    setDepth(template.depthMm);
    setThickness(18);
    setBackThickness(6);
    setShelves(2);
    setDividers(0);
    setDrawers(0);
    setDoors(0);
    setReveal(2);
    setExtraction(null);
  };

  const chooseImage = (f?: File) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 6 * 1024 * 1024) {
      toast({
        title: "Choose a supported image",
        message: "Upload JPEG, PNG or WebP up to 6 MB.",
        variant: "error",
      });
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setExtraction(null);
  };

  const analyze = async () => {
    if (!file) return;
    setExtracting(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke(
        "ai-tv-console-extract",
        { body: { imageDataUrl: dataUrl } },
      );
      if (error || !data?.extraction)
        throw new Error(
          data?.error || error?.message || "Could not analyze the image.",
        );
      setExtraction(data.extraction);
      toast({
        title: "Visual estimate ready",
        message: "Review and confirm each dimension before applying it.",
      });
    } catch (err) {
      toast({
        title: "Image parsing unavailable",
        message:
          err instanceof Error
            ? err.message
            : "Try a template or enter dimensions manually.",
        variant: "error",
      });
    } finally {
      setExtracting(false);
    }
  };

  const applyExtracted = () => {
    if (!extraction) return;
    if (extraction.widthMm) setWidth(extraction.widthMm);
    if (extraction.heightMm) setHeight(extraction.heightMm);
    if (extraction.depthMm) setDepth(extraction.depthMm);
    toast({
      title: "Dimensions applied",
      message:
        "You confirmed the AI-extracted values. Verify them with a tape measure before building.",
    });
  };

  const dimensionFields = [
    ["Width", width, setWidth, 100, 10000, 1],
    ["Height", height, setHeight, 100, 5000, 1],
    ["Depth", depth, setDepth, 100, 3000, 1],
    ["Panel thickness", thickness, setThickness, 1, 100, 1],
    ["Back panel thickness", backThickness, setBackThickness, 0, 100, 1],
    ["Internal shelves", shelves, setShelves, 0, 30, 1],
    ["Vertical dividers", dividers, setDividers, 0, 30, 1],
    ["Drawers", drawers, setDrawers, 0, 30, 1],
    [
      "Drawer front height",
      drawerFrontHeight,
      setDrawerFrontHeight,
      50,
      1000,
      1,
    ],
    ["Overlay doors", doors, setDoors, 0, 30, 1],
    ["Door reveal", reveal, setReveal, 0, 20, 1],
    ["Board width", sheetW, setSheetW, 100, 10000, 1],
    ["Board length", sheetL, setSheetL, 100, 10000, 1],
    ["Workshop allowance %", waste, setWaste, 0, 100, 1],
  ] as const;

  const rateFields = [
    ["Carcass board per sheet", sheetPrice, setSheetPrice],
    ["Back board per sheet", backSheetPrice, setBackSheetPrice],
    ["Edge banding per metre", bandingPrice, setBandingPrice],
    ["Hinge each", hingePrice, setHingePrice],
    ["Shelf support each", supportPrice, setSupportPrice],
    ["Handle each", handlePrice, setHandlePrice],
    ["Drawer slide pair", slidePrice, setSlidePrice],
    ["Workshop per m²", workshopRate, setWorkshopRate],
    ["Finishing per m²", finishingRate, setFinishingRate],
    ["Installation per job", installPrice, setInstallPrice],
    ["Transport per job", transportPrice, setTransportPrice],
    ["Tax %", taxPercent, setTaxPercent],
  ] as const;

  return (
    <main className="container mx-auto max-w-7xl space-y-8 px-4 py-8">
      <PageHeader
        title="TV Console & Media Unit Calculator"
        eyebrow="Interior decor · panel, sheet and cost takeoff"
        subtitle="Choose a concept, set the carcass details, and see the panel arithmetic, the packed sheet count, edge banding, hardware and a full cost roll-up from your own rates. Planning estimate, not a cut list."
      />
      <div className="grid gap-7 lg:grid-cols-[1.15fr_0.85fr]">
        <section aria-labelledby="templates-title" className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 id="templates-title" className="text-xl font-semibold">
                Choose a design direction
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Room photographs are visual references, not exact product plans.
              </p>
            </div>
            <Badge variant="outline">10 editable presets</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {TV_CONSOLE_TEMPLATES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => applyTemplate(item.id)}
                aria-pressed={selectedId === item.id}
                className={`group overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5 hover:shadow-lg ${selectedId === item.id ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
              >
                <div className="relative aspect-[16/10] bg-muted">
                  <img
                    src={item.imageUrl}
                    alt={`${item.name} interior reference`}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  <span className="absolute right-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[10px] backdrop-blur">
                    Reference image
                  </span>
                  {selectedId === item.id && (
                    <span className="absolute left-3 top-3 rounded-full bg-primary p-1.5 text-primary-foreground">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {item.material} · {item.feature}
                  </p>
                  <p className="text-xs font-medium tabular-nums text-foreground">
                    {item.widthMm} × {item.heightMm} × {item.depthMm} mm
                  </p>
                  <a
                    className="text-[10px] text-muted-foreground underline underline-offset-2"
                    href={item.imagePage}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Photo: {item.imageCredit}
                  </a>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                <Ruler className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">
                  Carcass dimensions & configuration
                </h2>
                <p className="text-xs text-muted-foreground">
                  Selected: {selected.name} · outer dimensions in millimetres
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {dimensionFields.map(([label, value, setter, min, max, step]) => (
                <div key={label} className="space-y-1.5">
                  <Label htmlFor={`console-${label}`}>{label}</Label>
                  <Input
                    id={`console-${label}`}
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => setter(number(e.target.value, 0))}
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label htmlFor="console-currency">Currency code</Label>
                <Input
                  id="console-currency"
                  maxLength={3}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                />
              </div>
              <div className="col-span-2 flex items-center gap-2 rounded-lg border p-3">
                <Checkbox
                  id="console-back"
                  checked={backThickness > 0}
                  onCheckedChange={(v) => setBackThickness(v === true ? 6 : 0)}
                />
                <Label htmlFor="console-back" className="cursor-pointer">
                  Back panel fitted to the rear face (its thickness is deducted
                  from the carcass depth)
                </Label>
              </div>
            </div>

            <details className="mt-4 rounded-xl border bg-muted/30 p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Rates (optional, in {currency})
              </summary>
              <p className="mt-2 text-xs text-muted-foreground">
                Blank means unpriced. A line with no rate is listed but never
                added as zero.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {rateFields.map(([label, value, setter]) => (
                  <div key={label} className="space-y-1">
                    <Label htmlFor={`rate-${label}`} className="text-xs">
                      {label}
                    </Label>
                    <Input
                      id={`rate-${label}`}
                      type="number"
                      min={0}
                      step="any"
                      placeholder="0.00"
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </details>

            <div className="mt-5 rounded-xl bg-muted/50 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium">
                  Panel schedule & material takeoff
                </span>
                <Badge variant="outline">Preliminary</Badge>
              </div>
              {result ? (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-2xl font-bold tabular-nums">
                        {result.carcassAreaM2.toFixed(3)} m²
                      </div>
                      <div className="text-xs text-muted-foreground">
                        carcass panel area
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold tabular-nums">
                        {result.carcassSheets.sheetsWithAllowance} +{" "}
                        {result.backSheets.sheetsWithAllowance}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        carcass + back boards
                      </div>
                    </div>
                    <div className="border-t pt-3">
                      <div className="text-lg font-semibold tabular-nums">
                        {result.edgeBandingMetres.toFixed(1)} m
                      </div>
                      <div className="text-xs text-muted-foreground">
                        edge banding
                      </div>
                    </div>
                    <div className="border-t pt-3">
                      <div className="text-lg font-semibold tabular-nums">
                        {result.clearOpeningHeightMm.toFixed(0)} mm
                      </div>
                      <div className="text-xs text-muted-foreground">
                        clear opening height
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 rounded-lg bg-background p-3 text-xs text-muted-foreground">
                    Board packing: {result.carcassSheets.usedAreaM2.toFixed(2)}{" "}
                    m² of parts cut into {result.carcassSheets.physicalSheets}{" "}
                    board{result.carcassSheets.physicalSheets === 1 ? "" : "s"}{" "}
                    before allowance, {result.carcassSheets.sheetsWithAllowance}{" "}
                    with your {waste}% allowance. A plain area division would
                    have said {result.carcassSheets.areaOnlySheets}. Carcass
                    depth is cut at {result.carcassDepthMm} mm to keep the
                    finished {result.finishedDepthMm} mm depth.
                  </p>
                  {result.carcassSheets.oversizedParts.length +
                    result.backSheets.oversizedParts.length >
                    0 && (
                    <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-foreground">
                      Oversized:{" "}
                      {[
                        ...result.carcassSheets.oversizedParts,
                        ...result.backSheets.oversizedParts,
                      ]
                        .map((p) => `${p.part} (${p.lengthMm} mm)`)
                        .join(", ")}{" "}
                      exceed the {sheetL} mm board and are excluded from the
                      sheet count. Joint them or use a longer board.
                    </p>
                  )}

                  <div className="mt-4 overflow-x-auto rounded-lg border bg-background">
                    <table className="w-full min-w-[480px] text-left text-xs">
                      <thead className="bg-muted/60 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Panel part</th>
                          <th className="px-3 py-2">Board</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-right">Each (mm)</th>
                          <th className="px-3 py-2 text-right">Area (m²)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.panelSchedule.map((line) => (
                          <tr key={line.part} className="border-t">
                            <td className="px-3 py-2 font-medium">
                              {line.part}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {line.material === "back" ? "back" : "carcass"}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {line.count}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {line.widthMm.toFixed(0)} ×{" "}
                              {line.heightMm.toFixed(0)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {line.areaM2.toFixed(3)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 rounded-lg border bg-background p-3">
                    <p className="text-xs font-medium">Hardware</p>
                    <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
                      <span>
                        Hinges:{" "}
                        <strong className="text-foreground">
                          {result.hardware.hinges}
                        </strong>
                      </span>
                      <span>
                        Shelf supports:{" "}
                        <strong className="text-foreground">
                          {result.hardware.shelfSupports}
                        </strong>
                      </span>
                      <span>
                        Handles:{" "}
                        <strong className="text-foreground">
                          {result.hardware.handles}
                        </strong>
                      </span>
                      <span>
                        Slide pairs:{" "}
                        <strong className="text-foreground">
                          {result.hardware.drawerSlidePairs}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-lg border bg-background">
                    <table className="w-full min-w-[440px] text-left text-xs">
                      <thead className="bg-muted/60 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Cost line</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-right">Rate</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.costLines.map((line) => (
                          <tr key={line.key} className="border-t">
                            <td className="px-3 py-2">{line.label}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {line.quantity} {line.unit}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                              {line.rate === null
                                ? "unpriced"
                                : money(line.rate, currency)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {line.amount === null
                                ? "—"
                                : money(line.amount, currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal of priced lines</span>
                      <strong className="tabular-nums">
                        {result.totals.subtotal === null
                          ? "No rate entered"
                          : money(result.totals.subtotal, currency)}
                      </strong>
                    </div>
                    {result.totals.tax !== null && (
                      <div className="flex justify-between">
                        <span>Tax</span>
                        <strong className="tabular-nums">
                          {money(result.totals.tax, currency)}
                        </strong>
                      </div>
                    )}
                    {result.totals.total !== null && (
                      <div className="flex justify-between border-t pt-1 text-base">
                        <span className="font-semibold">Total</span>
                        <strong className="tabular-nums">
                          {money(result.totals.total, currency)}
                        </strong>
                      </div>
                    )}
                    {result.totals.unpricedLines.length > 0 && (
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Excluded, no rate:{" "}
                        {result.totals.unpricedLines.join(", ")}.
                      </p>
                    )}
                  </div>

                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted-foreground">
                    {result.limitations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p
                  className="mt-3 text-sm text-destructive"
                  data-testid="tv-console-reason"
                >
                  {resultError ??
                    "Check dimensions, panel thickness, drawer and door settings, board size, allowance and currency code."}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                <Camera className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">
                    Extract rough dimensions from a photo
                  </h2>
                  <Badge className="gap-1">
                    <LockKeyhole className="h-3 w-3" />
                    Pro
                  </Badge>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  AI only proposes visible geometry. A photo without a known
                  scale cannot provide reliable dimensions; confirm every value
                  and measure on site before use.
                </p>
              </div>
            </div>
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => chooseImage(e.target.files?.[0])}
            />
            <SubscriptionGate
              feature="tv_console_ai_design"
              fallback={
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => inputRef.current?.click()}
                  >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Choose image
                  </Button>
                  <Link
                    to="/pricing/"
                    className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                  >
                    Upgrade to Pro <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              }
            >
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => inputRef.current?.click()}
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  {file ? "Change image" : "Choose image"}
                </Button>
                <Button onClick={analyze} disabled={!file || extracting}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {extracting ? "Analyzing…" : "Extract rough dimensions"}
                </Button>
              </div>
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Selected console reference upload"
                  className="mt-4 max-h-52 w-full rounded-lg object-contain bg-muted"
                />
              )}
              {extraction && (
                <div className="mt-4 space-y-3 rounded-xl border bg-background p-4">
                  <p className="text-sm font-semibold">
                    AI proposal · {extraction.confidence} confidence
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This is not verified measurement. Compare against a real
                    measurement and correct values above.
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span>
                      Width: {extraction.widthMm ?? "not estimated"} mm
                    </span>
                    <span>
                      Height: {extraction.heightMm ?? "not estimated"} mm
                    </span>
                    <span>
                      Depth: {extraction.depthMm ?? "not estimated"} mm
                    </span>
                  </div>
                  {extraction.notes?.length > 0 && (
                    <ul className="list-disc pl-5 text-xs text-muted-foreground">
                      {extraction.notes.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  )}
                  <Button
                    size="sm"
                    onClick={applyExtracted}
                    disabled={
                      !extraction.widthMm &&
                      !extraction.heightMm &&
                      !extraction.depthMm
                    }
                  >
                    I reviewed these values, apply them
                  </Button>
                </div>
              )}
            </SubscriptionGate>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">
              Not a cutting list or safety design.
            </strong>{" "}
            The schedule covers only the displayed rectangular panels. Board
            packing is a planning heuristic, not a nested cutting plan, and
            excludes grain, book-matching, kerf and offcut reuse. Validate
            drawings, load support, material thickness, joinery and wall fixing
            with the cabinetmaker or engineer responsible for the installation.
          </div>
        </section>
      </div>

      <AdSlot slotKey="calculator_mid" className="my-6" />
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
          <BookOpen className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold">How the takeoff works</h2>
            <p className="text-xs text-muted-foreground">
              Same inputs always produce the same schedule, board count and
              totals.
            </p>
          </div>
        </div>
        <div className="grid gap-4 text-sm text-muted-foreground md:grid-cols-2">
          <p>
            <strong className="text-foreground">Panel area:</strong> quantity ×
            width × height ÷ 1,000,000. The back is a separate material, and its
            thickness is deducted from the carcass depth so the finished unit
            matches the entered depth.
          </p>
          <p>
            <strong className="text-foreground">Assembly:</strong> top, bottom
            and shelves span between the sides; dividers span between top and
            bottom. Shelf width loses the divider thickness and divider height
            loses the shelf thickness, so intersections are not counted twice.
          </p>
          <p>
            <strong className="text-foreground">Board packing:</strong> each
            part is ripped into a lane at its depth and run along the board
            length, in order of lane width then length. Offcuts too short for
            the next part stay waste, which is why packed counts exceed plain
            area division on long parts.
          </p>
          <p>
            <strong className="text-foreground">Cost:</strong> board, banding,
            hardware, workshop, finishing, installation and transport are
            separate lines priced from your rates, with tax applied to the
            priced subtotal only. Missing rates are named, never assumed.
          </p>
        </div>
      </section>
      <section className="rounded-2xl border p-5">
        <h2 className="font-semibold">Reference photo notes</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The photos are mood references, not exact product designs, shop
          drawings or tested furniture. The ten dimensions and material
          descriptions are configurable concept presets; confirm local material
          availability and all project specifications.
        </p>
      </section>
      <div className="flex items-center gap-2 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        Template mode is available without sign-in. Only AI image parsing
        requires an active Pro or higher subscription.
      </div>
      <FaqItemsWithSchema
        faqs={CONSOLE_FAQS}
        title="TV console calculator: frequently asked questions"
      />
      <RelatedToolsLinks />
    </main>
  );
}
