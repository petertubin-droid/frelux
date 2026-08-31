import { useState, useEffect, useMemo } from "react";
import {
  Bot,
  Save,
  Copy,
  Download,
  Trash2,
  TrendingUp,
  ShoppingBag,
  Loader2,
  Layers,
  Percent,
  DollarSign,
  Calculator,
  Sparkles,
  Wand2,
  AlertCircle,
} from "lucide-react";
import { calculateAdvancedEstimate, type AdvancedCalcInput } from "@/lib/calc";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  saveAdvancedEstimate,
  fetchAdvancedEstimates,
  deleteAdvancedEstimate,
} from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import type { AdvancedEstimateData, ScreedingMixConfig } from "@/types";

interface Props {
  netArea: number;
  config: ScreedingMixConfig;
  clientHash: string;
}

type ProjectMode =
  "screeding" | "paint" | "tiling" | "pop_ceiling" | "ai_custom";
type Tab = "smart" | "breakdown" | "mix" | "costs" | "compare" | "saved";

const PROJECT_MODES: {
  mode: ProjectMode;
  label: string;
  icon: typeof Layers;
  desc: string;
}[] = [
  {
    mode: "smart",
    label: "Smart AI",
    icon: Wand2,
    desc: "Describe any project — AI calculates everything",
  },
  {
    mode: "screeding",
    label: "Screeding",
    icon: Layers,
    desc: "Paint + cement screeding mix",
  },
  {
    mode: "paint",
    label: "Paint",
    icon: Percent,
    desc: "Paint-only cost estimate",
  },
  {
    mode: "tiling",
    label: "Tiling",
    icon: Layers,
    desc: "Floor/wall tile estimation",
  },
  {
    mode: "pop_ceiling",
    label: "POP Ceiling",
    icon: Layers,
    desc: "POP ceiling cost estimate",
  },
];

export function AdvancedCalculator({ netArea, config, clientHash }: Props) {
  const [tab, setTab] = useState<Tab>("smart");
  const [mode, setMode] = useState<ProjectMode>("smart");
  const [savedEstimates, setSavedEstimates] = useState<
    {
      id: string;
      title: string;
      totalCost: number;
      currency: string;
      estimateData: AdvancedEstimateData;
      createdAt: string;
    }[]
  >([]);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [compareEstimate, setCompareEstimate] =
    useState<AdvancedEstimateData | null>(null);

  // AI Smart mode state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiEstimate, setAiEstimate] = useState<AdvancedEstimateData | null>(
    null,
  );
  const [projectDesc, setProjectDesc] = useState("");

  // Screeding mode state (existing calculation)
  const [input, setInput] = useState<AdvancedCalcInput>({
    netArea: netArea || 0,
    thickness: 10,
    coats: 2,
    mixRatio: config.defaultMixRatio || "2:1",
    paintCoverageRateM2PerL: config.paintCoverageRateM2PerL,
    paintBucketSizeL: config.paintBucketSizeL,
    paintPricePerBucket: config.paintPricePerBucket,
    cementRatioKgPerL: config.cementConsumptionRatioKgPerL,
    cementBagSizeKg: config.cementBagSizeKg,
    cementPricePerBag: config.cementPricePerBag,
    labourRatePerSqm: config.labourRatePerSqm,
    transportCost: 0,
    wastePercentage: config.wastePercentage,
    markupPercentage: 0,
    profitPercentage: 0,
    taxPercentage: config.taxVatPercentage,
    currency: config.currency,
    currencySymbol: config.currencySymbol,
  });

  useEffect(() => {
    setInput((prev) => ({
      ...prev,
      netArea: netArea || 0,
      paintCoverageRateM2PerL: config.paintCoverageRateM2PerL,
      paintBucketSizeL: config.paintBucketSizeL,
      paintPricePerBucket: config.paintPricePerBucket,
      cementRatioKgPerL: config.cementConsumptionRatioKgPerL,
      cementBagSizeKg: config.cementBagSizeKg,
      cementPricePerBag: config.cementPricePerBag,
      labourRatePerSqm: config.labourRatePerSqm,
      wastePercentage: config.wastePercentage,
      taxPercentage: config.taxVatPercentage,
      currency: config.currency,
      currencySymbol: config.currencySymbol,
      mixRatio: config.defaultMixRatio || prev.mixRatio,
    }));
  }, [netArea, config]);

  const screedingEstimate = useMemo(
    () => calculateAdvancedEstimate(input),
    [input],
  );

  // The active estimate depends on the mode
  const estimate: AdvancedEstimateData =
    mode === "smart" && aiEstimate ? aiEstimate : screedingEstimate;

  useEffect(() => {
    fetchAdvancedEstimates(clientHash).then(({ data }) => {
      setSavedEstimates(
        data.map((d) => ({
          id: d.id,
          title: d.title,
          totalCost: d.total_cost ?? 0,
          currency: d.currency,
          estimateData: d.estimate_data as unknown as AdvancedEstimateData,
          createdAt: d.created_at,
        })),
      );
    });
  }, [clientHash]);

  function update<K extends keyof AdvancedCalcInput>(
    key: K,
    value: AdvancedCalcInput[K],
  ) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  // ─── AI Smart Estimate ───
  async function handleAiEstimate() {
    if (!projectDesc.trim()) return;
    setAiLoading(true);
    setAiResponse(null);
    setAiEstimate(null);
    try {
      const prompt = `You are an expert construction cost estimator for the Nigerian/West African market. The user is using the FRELUX Advanced Calculator.

Project description: "${projectDesc}"
Net area: ${netArea || "not specified"} m²
Currency: ${config.currency} (${config.currencySymbol})
Config context: paint coverage ${config.paintCoverageRateM2PerL} m²/L, paint bucket ${config.paintBucketSizeL}L @ ${config.currencySymbol}${config.paintPricePerBucket}, cement ${config.cementBagSizeKg}kg @ ${config.currencySymbol}${config.cementPricePerBag}, labour ${config.currencySymbol}${config.labourRatePerSqm}/m², waste ${config.wastePercentage}%, tax ${config.taxVatPercentage}%.

Calculate a detailed cost estimate for this project. Return your response in TWO parts:

PART 1 — JSON ESTIMATE (between [JSON_START] and [JSON_END] tags):
[JSON_START]
{
  "projectType": "screeding|paint|tiling|pop_ceiling|custom",
  "netArea": <number>,
  "thickness": <number in mm, 0 if N/A>,
  "coats": <number, 1 if N/A>,
  "lineItems": [
    { "label": "material name", "quantity": <number>, "unit": "bucket(s)|bag(s)|box(es)|m²|L|kg|trip", "unitPrice": <number>, "total": <number> }
  ],
  "materialCost": <number>,
  "labourCost": <number>,
  "transportCost": <number>,
  "wastePercentage": <number>,
  "wasteAmount": <number>,
  "markupPercentage": 0,
  "markupAmount": 0,
  "profitPercentage": 0,
  "profitAmount": 0,
  "taxPercentage": ${config.taxVatPercentage},
  "taxAmount": <number>,
  "grandTotal": <number>,
  "notes": "<any important notes>",
  "recommendations": ["tip1", "tip2"]
}
[JSON_END]

PART 2 — DETAILED ANALYSIS (plain text):
Explain the calculation, list assumptions, and provide 3-5 specific cost-saving recommendations. Include quantities and prices.

IMPORTANT: Calculate realistic quantities based on the project type. For paint: coverage rate ${config.paintCoverageRateM2PerL} m²/L × coats. For screeding: paint + cement mix. For tiling: tiles + adhesive + grout. For POP ceiling: POP boards + cement + labour. Use ${config.currencySymbol} for all prices.`;

      const { data } = await supabase.functions.invoke<{
        response?: string;
        error?: string;
      }>("ai-studio", {
        body: { tool: "chat", prompt },
      });

      const raw = data?.response || data?.error || "";
      if (!raw) {
        setAiResponse("No response received from AI.");
        setAiLoading(false);
        return;
      }

      // Parse JSON estimate from the response
      const jsonMatch = raw.match(/\[JSON_START\]\s*([\s\S]*?)\s*\[JSON_END\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1].trim());
          const est: AdvancedEstimateData = {
            projectType: parsed.projectType || "custom",
            netArea: parsed.netArea || netArea || 0,
            thickness: parsed.thickness ?? 0,
            coats: parsed.coats ?? 1,
            mixRatio: parsed.mixRatio || "",
            paintLiters: parsed.paintLiters || 0,
            paintBuckets: parsed.paintBuckets || 0,
            cementKg: parsed.cementKg || 0,
            cementBags: parsed.cementBags || 0,
            lineItems: (parsed.lineItems || []).map(
              (item: {
                label: string;
                quantity: number;
                unit: string;
                unitPrice: number;
                total: number;
              }) => ({
                label: item.label,
                quantity: Number(item.quantity) || 0,
                unit: item.unit || "unit(s)",
                unitPrice: Number(item.unitPrice) || 0,
                total: Number(item.total) || 0,
              }),
            ),
            materialCost: Number(parsed.materialCost) || 0,
            labourCost: Number(parsed.labourCost) || 0,
            transportCost: Number(parsed.transportCost) || 0,
            wastePercentage: Number(parsed.wastePercentage) || 0,
            wasteAmount: Number(parsed.wasteAmount) || 0,
            markupPercentage: Number(parsed.markupPercentage) || 0,
            markupAmount: Number(parsed.markupAmount) || 0,
            profitPercentage: Number(parsed.profitPercentage) || 0,
            profitAmount: Number(parsed.profitAmount) || 0,
            taxPercentage:
              Number(parsed.taxPercentage) || config.taxVatPercentage,
            taxAmount: Number(parsed.taxAmount) || 0,
            grandTotal: Number(parsed.grandTotal) || 0,
            currency: config.currency,
            currencySymbol: config.currencySymbol,
            notes: parsed.notes || "",
            aiRecommendations: parsed.recommendations || [],
          };
          setAiEstimate(est);
        } catch {
          // JSON parse failed — still show the text response
        }
      }

      // Show the text part (remove the JSON block from display)
      const textPart = raw
        .replace(/\[JSON_START\][\s\S]*?\[JSON_END\]/, "")
        .trim();
      setAiResponse(textPart || raw);
    } catch {
      setAiResponse(
        "Unable to reach the AI assistant right now. Please try again.",
      );
    }
    setAiLoading(false);
  }

  async function handleAiRecommendations() {
    setAiLoading(true);
    setAiResponse(null);
    try {
      const lineItemsDesc = estimate.lineItems
        .map(
          (i) =>
            `${i.label}: ${formatNumber(i.quantity)} ${i.unit} @ ${estimate.currencySymbol}${formatNumber(i.unitPrice)}`,
        )
        .join(", ");
      const prompt = `Review this construction estimate and provide 3-5 specific recommendations to reduce waste and lower costs:
Project: ${estimate.projectType}
Area: ${estimate.netArea} m², Coats: ${estimate.coats}
Materials: ${lineItemsDesc}
Material cost: ${estimate.currencySymbol}${formatNumber(estimate.materialCost)}, Labour: ${estimate.currencySymbol}${formatNumber(estimate.labourCost)}
Waste: ${estimate.wastePercentage}%, Tax: ${estimate.taxPercentage}%
Grand total: ${estimate.currencySymbol}${formatNumber(estimate.grandTotal)}

Flag any unrealistic values or potential issues. Give specific numbers and actionable recommendations.`;
      const { data } = await supabase.functions.invoke<{
        response?: string;
        error?: string;
      }>("ai-studio", {
        body: { tool: "chat", prompt },
      });
      setAiResponse(data?.response || data?.error || "No response received.");
    } catch {
      setAiResponse("Unable to reach the AI assistant right now.");
    }
    setAiLoading(false);
  }

  async function handleSave() {
    setSaveStatus("saving");
    const title =
      saveTitle ||
      `${estimate.projectType} estimate ${new Date().toLocaleDateString()}`;
    const { id, error } = await saveAdvancedEstimate({
      clientHash,
      toolKey: "advanced_calculator",
      title,
      projectType: estimate.projectType,
      estimateData: estimate as unknown as Record<string, unknown>,
      totalCost: estimate.grandTotal,
      currency: estimate.currency,
    });
    if (error) {
      setSaveStatus(`Error: ${error}`);
      return;
    }
    setSaveStatus("saved");
    setSaveTitle("");
    const { data } = await fetchAdvancedEstimates(clientHash);
    setSavedEstimates(
      data.map((d) => ({
        id: d.id,
        title: d.title,
        totalCost: d.total_cost ?? 0,
        currency: d.currency,
        estimateData: d.estimate_data as unknown as AdvancedEstimateData,
        createdAt: d.created_at,
      })),
    );
    if (id) setSaveStatus(null);
  }

  async function handleDelete(id: string) {
    await deleteAdvancedEstimate(id);
    setSavedEstimates((prev) => prev.filter((e) => e.id !== id));
  }

  function handleDuplicate() {
    setSaveTitle(estimate.projectType + " copy");
    setSaveStatus(null);
  }

  function handleExportPDF() {
    const win = window.open("", "_blank");
    if (!win) {
      setSaveStatus(
        "Popup blocked. Please allow popups for this site to export PDF.",
      );
      window.setTimeout(() => setSaveStatus(null), 5000);
      return;
    }
    const html = generateQuotationHTML(
      estimate,
      savedEstimates.find((e) => e.estimateData === estimate),
    );
    win.document.write(html);
    win.document.close();
    win.print();
  }

  const tabs: { key: Tab; label: string; icon: typeof Layers }[] = [
    { key: "smart", label: "Smart Estimate", icon: Wand2 },
    { key: "breakdown", label: "Breakdown", icon: Layers },
    { key: "mix", label: "Mix Ratio", icon: Percent },
    { key: "costs", label: "Costs", icon: DollarSign },
    { key: "compare", label: "Compare", icon: TrendingUp },
    { key: "saved", label: "Saved", icon: Save },
  ];

  return (
    <div className="mt-6 rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-white to-brand-purple/[0.02] p-1">
      <div className="rounded-xl bg-white p-4 sm:p-6 dark:bg-brand-navy-mid">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-purple/10">
            <Bot aria-hidden="true" className="h-5 w-5 text-brand-purple" />
          </div>
          <div>
            <h3 className="text-base font-bold text-brand-navy dark:text-white">
              Advanced Calculator
            </h3>
            <p className="text-xs text-neutral-500">
              AI-powered estimation for any construction project
            </p>
          </div>
        </div>

        {/* Project mode selector */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {PROJECT_MODES.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.mode}
                type="button"
                onClick={() => {
                  setMode(m.mode);
                  setTab(m.mode === "smart" ? "smart" : "breakdown");
                }}
                title={m.desc}
                className={
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all " +
                  (mode === m.mode
                    ? "bg-brand-purple text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10")
                }
              >
                <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Tabs */}
        {mode !== "smart" && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tabs
              .filter((t) => t.key !== "smart")
              .map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all " +
                      (tab === t.key
                        ? "bg-brand-purple text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-white/5 dark:text-neutral-300")
                    }
                  >
                    <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
          </div>
        )}

        {/* Tab content */}
        <div className="mt-5">
          {tab === "smart" && (
            <SmartTab
              mode={mode}
              projectDesc={projectDesc}
              setProjectDesc={setProjectDesc}
              onEstimate={handleAiEstimate}
              onRecommend={handleAiRecommendations}
              loading={aiLoading}
              response={aiResponse}
              aiEstimate={aiEstimate}
              estimate={estimate}
              onSave={handleSave}
              onExport={handleExportPDF}
              saveTitle={saveTitle}
              setSaveTitle={setSaveTitle}
              saveStatus={saveStatus}
              currencySymbol={config.currencySymbol}
              netArea={netArea}
            />
          )}
          {tab === "breakdown" && (
            <BreakdownTab
              estimate={estimate}
              input={input}
              update={update}
              onSave={handleSave}
              onDuplicate={handleDuplicate}
              onExport={handleExportPDF}
              saveTitle={saveTitle}
              setSaveTitle={setSaveTitle}
              saveStatus={saveStatus}
            />
          )}
          {tab === "mix" && (
            <MixTab input={input} update={update} config={config} />
          )}
          {tab === "costs" && (
            <CostsTab input={input} update={update} estimate={estimate} />
          )}
          {tab === "compare" && (
            <CompareTab
              current={estimate}
              saved={savedEstimates}
              onSelect={setCompareEstimate}
              selected={compareEstimate}
            />
          )}
          {tab === "saved" && (
            <SavedTab
              estimates={savedEstimates}
              onDelete={handleDelete}
              onExport={handleExportPDF}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Smart AI Tab ───
function SmartTab({
  mode,
  projectDesc,
  setProjectDesc,
  onEstimate,
  onRecommend,
  loading,
  response,
  aiEstimate,
  estimate,
  onSave,
  onExport,
  saveTitle,
  setSaveTitle,
  saveStatus,
  currencySymbol,
  netArea,
}: {
  mode: ProjectMode;
  projectDesc: string;
  setProjectDesc: (v: string) => void;
  onEstimate: () => void;
  onRecommend: () => void;
  loading: boolean;
  response: string | null;
  aiEstimate: AdvancedEstimateData | null;
  estimate: AdvancedEstimateData;
  onSave: () => void;
  onExport: () => void;
  saveTitle: string;
  setSaveTitle: (v: string) => void;
  saveStatus: string | null;
  currencySymbol: string;
  netArea: number;
}) {
  const examples = [
    "Screed 45 m² of wall, 2 coats, 10mm thick",
    "Paint a 3-bedroom flat, 180 m², 2 coats",
    "Tile a bathroom floor 6 m² with 60×60 cm porcelain tiles",
    "POP ceiling for living room 25 m²",
    "Full repaint of exterior, 200 m², 2 coats weatherproof",
  ];

  return (
    <div className="space-y-5">
      {/* AI input */}
      <div className="rounded-lg border border-brand-purple/20 bg-brand-purple/5 p-4">
        <div className="flex items-center gap-2">
          <Sparkles aria-hidden="true" className="h-4 w-4 text-brand-purple" />
          <h4 className="text-sm font-bold text-brand-navy dark:text-white">
            Describe Your Project
          </h4>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          The AI will calculate materials, quantities, and costs for any
          construction project — screeding, painting, tiling, POP ceiling, or
          anything else.
        </p>
        <textarea
          value={projectDesc}
          onChange={(e) => setProjectDesc(e.target.value)}
          rows={3}
          placeholder="e.g. Screed 45 m² of wall, 2 coats, 10mm thick. Include paint and cement."
          className="input-field mt-3 resize-none"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onEstimate}
            disabled={loading || !projectDesc.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-brand-purple px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-purple/90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 aria-hidden="true" className="h-4 w-4" />
            )}
            Calculate with AI
          </button>
        </div>
        {/* Example prompts */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {examples.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setProjectDesc(ex)}
              className="rounded-full bg-white px-3 py-1 text-xs text-neutral-500 ring-1 ring-neutral-200 transition-colors hover:text-brand-purple hover:ring-brand-purple/30 dark:bg-white/5 dark:text-neutral-400 dark:ring-white/10"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && !response && (
        <div className="flex items-center gap-2 py-4 text-sm text-neutral-500">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> AI is
          calculating your estimate…
        </div>
      )}

      {/* AI text response */}
      {response && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 dark:border-white/5 dark:bg-white/5 p-4">
          <div className="flex items-start gap-2">
            <Bot
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-brand-purple"
            />
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-neutral-700">
              {response}
            </div>
          </div>
        </div>
      )}

      {/* AI-generated estimate breakdown */}
      {aiEstimate && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calculator
              aria-hidden="true"
              className="h-4 w-4 text-brand-purple"
            />
            <h4 className="text-sm font-bold text-brand-navy dark:text-white">
              AI-Generated Estimate
            </h4>
          </div>

          {/* Line items */}
          <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-white/5">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-white/5">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">
                    Material / Service
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-neutral-500">
                    Qty
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-neutral-500">
                    Unit Price
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-neutral-500">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {aiEstimate.lineItems.map((item, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2.5 font-medium text-brand-navy dark:text-white">
                      {item.label}
                    </td>
                    <td className="px-3 py-2.5 text-right text-neutral-600">
                      {formatNumber(item.quantity)} {item.unit}
                    </td>
                    <td className="px-3 py-2.5 text-right text-neutral-600">
                      {formatCurrency(
                        item.unitPrice,
                        aiEstimate.currencySymbol,
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-brand-navy dark:text-white">
                      {formatCurrency(item.total, aiEstimate.currencySymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryRow
              label="Material Cost"
              value={formatCurrency(
                aiEstimate.materialCost,
                aiEstimate.currencySymbol,
              )}
            />
            {aiEstimate.labourCost > 0 && (
              <SummaryRow
                label="Labour Cost"
                value={formatCurrency(
                  aiEstimate.labourCost,
                  aiEstimate.currencySymbol,
                )}
              />
            )}
            {aiEstimate.transportCost > 0 && (
              <SummaryRow
                label="Transport"
                value={formatCurrency(
                  aiEstimate.transportCost,
                  aiEstimate.currencySymbol,
                )}
              />
            )}
            {aiEstimate.wasteAmount > 0 && (
              <SummaryRow
                label={`Waste (${aiEstimate.wastePercentage}%)`}
                value={formatCurrency(
                  aiEstimate.wasteAmount,
                  aiEstimate.currencySymbol,
                )}
              />
            )}
            {aiEstimate.taxAmount > 0 && (
              <SummaryRow
                label={`Tax/VAT (${aiEstimate.taxPercentage}%)`}
                value={formatCurrency(
                  aiEstimate.taxAmount,
                  aiEstimate.currencySymbol,
                )}
              />
            )}
            <div className="flex items-center justify-between rounded-lg bg-brand-navy px-4 py-3 text-white">
              <span className="text-sm font-bold">Grand Total</span>
              <span className="text-lg font-bold">
                {formatCurrency(
                  aiEstimate.grandTotal,
                  aiEstimate.currencySymbol,
                )}
              </span>
            </div>
          </div>

          {/* AI recommendations */}
          {aiEstimate.aiRecommendations.length > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
              <div className="flex items-center gap-2">
                <Sparkles
                  aria-hidden="true"
                  className="h-4 w-4 text-emerald-500"
                />
                <h4 className="text-sm font-bold text-brand-navy dark:text-white">
                  AI Recommendations
                </h4>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
                {aiEstimate.aiRecommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500">•</span> {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <div className="flex flex-1 gap-2">
              <input
                type="text"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                placeholder="Estimate name…"
                className="input-field flex-1"
              />
              <button
                type="button"
                onClick={onSave}
                className="btn-primary flex items-center gap-1.5 whitespace-nowrap"
              >
                <Save aria-hidden="true" className="h-4 w-4" /> Save
              </button>
            </div>
            <button
              type="button"
              onClick={onExport}
              className="btn-secondary flex items-center gap-1.5"
            >
              <Download aria-hidden="true" className="h-4 w-4" /> PDF
            </button>
          </div>
          {saveStatus === "saving" && (
            <p className="text-xs text-neutral-500">Saving…</p>
          )}
          {saveStatus === "saved" && (
            <p className="text-xs text-accent-green">Saved successfully.</p>
          )}
          {saveStatus?.startsWith("Error") && (
            <p className="text-xs text-red-600">{saveStatus}</p>
          )}
        </div>
      )}

      {/* Fallback when no AI estimate yet */}
      {!aiEstimate && !loading && !response && (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center dark:border-white/10 dark:bg-white/5">
          <Bot
            aria-hidden="true"
            className="mx-auto h-8 w-8 text-neutral-300"
          />
          <p className="mt-2 text-sm font-medium text-neutral-500">
            Describe your project above and let AI calculate everything
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Works for screeding, painting, tiling, POP ceiling, and any other
            construction project
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Breakdown Tab ───
function BreakdownTab({
  estimate,
  input,
  update,
  onSave,
  onDuplicate,
  onExport,
  saveTitle,
  setSaveTitle,
  saveStatus,
}: {
  estimate: AdvancedEstimateData;
  input: AdvancedCalcInput;
  update: <K extends keyof AdvancedCalcInput>(
    key: K,
    value: AdvancedCalcInput[K],
  ) => void;
  onSave: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  saveTitle: string;
  setSaveTitle: (v: string) => void;
  saveStatus: string | null;
}) {
  return (
    <div className="space-y-5">
      {/* Quick inputs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <NumField
          label="Net area (m²)"
          value={input.netArea}
          onChange={(v) => update("netArea", v)}
        />
        <NumField
          label="Thickness (mm)"
          value={input.thickness}
          onChange={(v) => update("thickness", v)}
        />
        <NumField
          label="Coats"
          value={input.coats}
          onChange={(v) => update("coats", v)}
        />
      </div>

      {/* Line items */}
      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-white/5">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-white/5">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">
                Material
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-neutral-500">
                Qty
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-neutral-500">
                Unit Price
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-neutral-500">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {estimate.lineItems.map((item) => (
              <tr key={item.label}>
                <td className="px-3 py-2.5 font-medium text-brand-navy dark:text-white">
                  {item.label}
                </td>
                <td className="px-3 py-2.5 text-right text-neutral-600">
                  {formatNumber(item.quantity)} {item.unit}
                </td>
                <td className="px-3 py-2.5 text-right text-neutral-600">
                  {formatCurrency(item.unitPrice, estimate.currencySymbol)}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-brand-navy dark:text-white">
                  {formatCurrency(item.total, estimate.currencySymbol)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryRow
          label="Material Cost"
          value={formatCurrency(estimate.materialCost, estimate.currencySymbol)}
        />
        <SummaryRow
          label="Labour Cost"
          value={formatCurrency(estimate.labourCost, estimate.currencySymbol)}
        />
        <SummaryRow
          label="Transport"
          value={formatCurrency(
            estimate.transportCost,
            estimate.currencySymbol,
          )}
        />
        <SummaryRow
          label={`Waste (${estimate.wastePercentage}%)`}
          value={formatCurrency(estimate.wasteAmount, estimate.currencySymbol)}
        />
        {estimate.markupAmount > 0 && (
          <SummaryRow
            label={`Markup (${estimate.markupPercentage}%)`}
            value={formatCurrency(
              estimate.markupAmount,
              estimate.currencySymbol,
            )}
          />
        )}
        {estimate.profitAmount > 0 && (
          <SummaryRow
            label={`Profit (${estimate.profitPercentage}%)`}
            value={formatCurrency(
              estimate.profitAmount,
              estimate.currencySymbol,
            )}
          />
        )}
        <SummaryRow
          label={`Tax/VAT (${estimate.taxPercentage}%)`}
          value={formatCurrency(estimate.taxAmount, estimate.currencySymbol)}
        />
        <div className="flex items-center justify-between rounded-lg bg-brand-navy px-4 py-3 text-white">
          <span className="text-sm font-bold">Grand Total</span>
          <span className="text-lg font-bold">
            {formatCurrency(estimate.grandTotal, estimate.currencySymbol)}
          </span>
        </div>
      </div>

      {/* Shopping list */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 dark:border-white/5 dark:bg-white/5 p-4">
        <div className="flex items-center gap-2">
          <ShoppingBag
            aria-hidden="true"
            className="h-4 w-4 text-brand-purple"
          />
          <h4 className="text-sm font-bold text-brand-navy dark:text-white">
            Material Shopping List
          </h4>
        </div>
        <ul className="mt-2 space-y-1 text-sm text-neutral-600">
          {estimate.lineItems.map((item, i) => (
            <li key={i}>
              {formatNumber(item.quantity)} × {item.label}:{" "}
              {formatCurrency(item.total, estimate.currencySymbol)}
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <div className="flex flex-1 gap-2">
          <input
            type="text"
            value={saveTitle}
            onChange={(e) => setSaveTitle(e.target.value)}
            placeholder="Estimate name…"
            className="input-field flex-1"
          />
          <button
            type="button"
            onClick={onSave}
            className="btn-primary flex items-center gap-1.5 whitespace-nowrap"
          >
            <Save aria-hidden="true" className="h-4 w-4" /> Save
          </button>
        </div>
        <button
          type="button"
          onClick={onDuplicate}
          className="btn-secondary flex items-center gap-1.5"
        >
          <Copy aria-hidden="true" className="h-4 w-4" /> Duplicate
        </button>
        <button
          type="button"
          onClick={onExport}
          className="btn-secondary flex items-center gap-1.5"
        >
          <Download aria-hidden="true" className="h-4 w-4" /> PDF
        </button>
      </div>
      {saveStatus === "saving" && (
        <p className="text-xs text-neutral-500">Saving…</p>
      )}
      {saveStatus === "saved" && (
        <p className="text-xs text-accent-green">Saved successfully.</p>
      )}
      {saveStatus?.startsWith("Error") && (
        <p className="text-xs text-red-600">{saveStatus}</p>
      )}
    </div>
  );
}

// ─── Mix Ratio Tab ───
function MixTab({
  input,
  update,
  config,
}: {
  input: AdvancedCalcInput;
  update: <K extends keyof AdvancedCalcInput>(
    key: K,
    value: AdvancedCalcInput[K],
  ) => void;
  config: ScreedingMixConfig;
}) {
  const ratios = ["1:1", "2:1", "3:1", "3:2", "4:1"];
  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-bold text-brand-navy dark:text-white">
          Custom Mix Ratio Editor
        </h4>
        <p className="mt-0.5 text-xs text-neutral-500">
          Adjust the paint to cement mix ratio for your wall condition.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ratios.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => update("mixRatio", r)}
              className={
                "rounded-lg border px-4 py-2 text-sm font-semibold transition-all " +
                (input.mixRatio === r
                  ? "border-brand-purple bg-brand-purple text-white"
                  : "border-neutral-200 text-neutral-600 dark:border-white/10 dark:text-neutral-300 hover:border-neutral-300")
              }
            >
              {r}
            </button>
          ))}
          <input
            type="text"
            value={input.mixRatio}
            onChange={(e) => update("mixRatio", e.target.value)}
            className="input-field w-24"
            placeholder="Custom"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumField
          label="Paint coverage (m²/L)"
          value={input.paintCoverageRateM2PerL}
          onChange={(v) => update("paintCoverageRateM2PerL", v)}
          step={0.1}
        />
        <NumField
          label="Cement ratio (kg/L)"
          value={input.cementRatioKgPerL}
          onChange={(v) => update("cementRatioKgPerL", v)}
          step={0.1}
        />
        <NumField
          label="Paint bucket size (L)"
          value={input.paintBucketSizeL}
          onChange={(v) => update("paintBucketSizeL", v)}
        />
        <NumField
          label="Cement bag size (kg)"
          value={input.cementBagSizeKg}
          onChange={(v) => update("cementBagSizeKg", v)}
        />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-white/5 dark:bg-white/5">
        <h4 className="text-sm font-bold text-brand-navy dark:text-white">
          Mix Ratio Guide
        </h4>
        <ul className="mt-2 space-y-1 text-xs text-neutral-500">
          <li>
            <strong>1:1</strong> — Equal parts paint and cement. Maximum
            strength, best for rough surfaces.
          </li>
          <li>
            <strong>2:1</strong> — 2 parts paint to 1 part cement. Balanced mix,
            most common for standard walls.
          </li>
          <li>
            <strong>3:1</strong> — Lighter mix for smooth, previously painted
            surfaces.
          </li>
          <li>
            <strong>4:1</strong> — Very light mix. For final coats on
            well-prepared surfaces.
          </li>
        </ul>
      </div>
    </div>
  );
}

// ─── Costs Tab ───
function CostsTab({
  input,
  update,
  estimate,
}: {
  input: AdvancedCalcInput;
  update: <K extends keyof AdvancedCalcInput>(
    key: K,
    value: AdvancedCalcInput[K],
  ) => void;
  estimate: AdvancedEstimateData;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumField
          label="Paint price per bucket"
          value={input.paintPricePerBucket}
          onChange={(v) => update("paintPricePerBucket", v)}
        />
        <NumField
          label="Cement price per bag"
          value={input.cementPricePerBag}
          onChange={(v) => update("cementPricePerBag", v)}
        />
        <NumField
          label="Labour rate (per m²)"
          value={input.labourRatePerSqm}
          onChange={(v) => update("labourRatePerSqm", v)}
        />
        <NumField
          label="Transport cost"
          value={input.transportCost}
          onChange={(v) => update("transportCost", v)}
        />
        <NumField
          label="Waste (%)"
          value={input.wastePercentage}
          onChange={(v) => update("wastePercentage", v)}
        />
        <NumField
          label="Markup (%)"
          value={input.markupPercentage}
          onChange={(v) => update("markupPercentage", v)}
        />
        <NumField
          label="Profit (%)"
          value={input.profitPercentage}
          onChange={(v) => update("profitPercentage", v)}
        />
        <NumField
          label="Tax/VAT (%)"
          value={input.taxPercentage}
          onChange={(v) => update("taxPercentage", v)}
        />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-white/5 dark:bg-white/5">
        <h4 className="text-sm font-bold text-brand-navy dark:text-white">
          Cost Breakdown
        </h4>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">Material</span>
            <span className="font-semibold">
              {formatCurrency(estimate.materialCost, estimate.currencySymbol)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Labour</span>
            <span className="font-semibold">
              {formatCurrency(estimate.labourCost, estimate.currencySymbol)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Transport</span>
            <span className="font-semibold">
              {formatCurrency(estimate.transportCost, estimate.currencySymbol)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Waste</span>
            <span className="font-semibold">
              {formatCurrency(estimate.wasteAmount, estimate.currencySymbol)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Tax</span>
            <span className="font-semibold">
              {formatCurrency(estimate.taxAmount, estimate.currencySymbol)}
            </span>
          </div>
          <div className="flex justify-between border-t border-neutral-200 pt-2">
            <span className="font-bold text-brand-navy dark:text-white">
              Grand Total
            </span>
            <span className="font-bold text-brand-navy dark:text-white">
              {formatCurrency(estimate.grandTotal, estimate.currencySymbol)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Compare Tab ───
function CompareTab({
  current,
  saved,
  onSelect,
  selected,
}: {
  current: AdvancedEstimateData;
  saved: {
    id: string;
    title: string;
    totalCost: number;
    currency: string;
    estimateData: AdvancedEstimateData;
    createdAt: string;
  }[];
  onSelect: (e: AdvancedEstimateData | null) => void;
  selected: AdvancedEstimateData | null;
}) {
  return (
    <div className="space-y-4">
      {saved.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-brand-navy dark:text-white">
            Compare with saved estimate
          </h4>
          <select
            value={
              selected
                ? (saved.find((s) => s.estimateData === selected)?.id ?? "")
                : ""
            }
            onChange={(e) => {
              const found = saved.find((s) => s.id === e.target.value);
              onSelect(found ? found.estimateData : null);
            }}
            className="input-field mt-2"
          >
            <option value="">Select an estimate…</option>
            {saved.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} —{" "}
                {formatCurrency(s.totalCost, s.estimateData.currencySymbol)}
              </option>
            ))}
          </select>
        </div>
      )}

      {selected && (
        <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-white/5">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-white/5">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">
                  Metric
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-neutral-500">
                  Current
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-neutral-500">
                  Saved
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-neutral-500">
                  Diff
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {[
                {
                  label: "Material",
                  cur: current.materialCost,
                  sav: selected.materialCost,
                },
                {
                  label: "Labour",
                  cur: current.labourCost,
                  sav: selected.labourCost,
                },
                {
                  label: "Grand Total",
                  cur: current.grandTotal,
                  sav: selected.grandTotal,
                },
              ].map((row) => {
                const diff = row.cur - row.sav;
                return (
                  <tr key={row.label}>
                    <td className="px-3 py-2 font-medium text-brand-navy dark:text-white">
                      {row.label}
                    </td>
                    <td className="px-3 py-2 text-right text-neutral-600">
                      {formatCurrency(row.cur, current.currencySymbol)}
                    </td>
                    <td className="px-3 py-2 text-right text-neutral-600">
                      {formatCurrency(row.sav, selected.currencySymbol)}
                    </td>
                    <td
                      className={
                        "px-3 py-2 text-right font-semibold " +
                        (diff > 0
                          ? "text-red-600"
                          : diff < 0
                            ? "text-accent-green"
                            : "text-neutral-500")
                      }
                    >
                      {diff > 0 ? "+" : ""}
                      {formatCurrency(diff, current.currencySymbol)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {saved.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
          <p className="text-sm text-neutral-500">
            Save estimates first to compare them side by side.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Saved Tab ───
function SavedTab({
  estimates,
  onDelete,
  onExport,
}: {
  estimates: {
    id: string;
    title: string;
    totalCost: number;
    currency: string;
    estimateData: AdvancedEstimateData;
    createdAt: string;
  }[];
  onDelete: (id: string) => void;
  onExport: () => void;
}) {
  if (estimates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
        <p className="text-sm text-neutral-500">
          No saved estimates yet. Save an estimate from the Breakdown or Smart
          tabs.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {estimates.map((e) => (
        <div
          key={e.id}
          className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
        >
          <div>
            <p className="text-sm font-semibold text-brand-navy dark:text-white">
              {e.title}
            </p>
            <p className="text-xs text-neutral-500">
              {new Date(e.createdAt).toLocaleDateString()} ·{" "}
              {formatCurrency(e.totalCost, e.estimateData.currencySymbol)} ·{" "}
              {e.estimateData.projectType}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onExport}
              className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 hover:text-brand-purple dark:hover:bg-white/10"
            >
              <Download aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(e.id)}
              className="rounded-md p-2 text-neutral-500 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ───
function NumField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-neutral-600">
        {label}
      </span>
      <input
        type="number"
        min={0}
        step={step ?? "0.01"}
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input-field mt-1"
      />
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-2.5 dark:bg-white/5">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-sm font-semibold text-brand-navy dark:text-white">
        {value}
      </span>
    </div>
  );
}

function generateQuotationHTML(
  estimate: AdvancedEstimateData,
  saved?: { title: string } | undefined,
): string {
  const title = saved?.title || `${estimate.projectType} Estimate`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}: Quotation</title>
<style>
body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1a1a2e}
.header{text-align:center;border-bottom:3px solid #6366f1;padding-bottom:20px;margin-bottom:30px}
.header h1{font-size:24px;margin:0;color:#1a1a2e}
.header p{color:#666;font-size:13px;margin:5px 0 0}
table{width:100%;border-collapse:collapse;margin:20px 0}
th{background:#f5f5f5;text-align:left;padding:10px;font-size:12px;color:#666}
td{padding:10px;border-bottom:1px solid #eee;font-size:13px}
.total-row{background:#1a1a2e;color:#fff;font-weight:bold}
.total-row td{border:none}
.summary{margin-top:20px;padding:20px;background:#f9f9f9;border-radius:8px}
.summary div{display:flex;justify-content:space-between;padding:5px 0;font-size:14px}
.grand{font-size:18px;font-weight:bold;color:#1a1a2e;border-top:2px solid #1a1a2e;padding-top:10px;margin-top:10px}
.footer{margin-top:40px;text-align:center;font-size:11px;color:#999}
</style></head><body>
<div class="header"><h1>FRELUX</h1><p>Professional Quotation: ${title}</p><p>${new Date().toLocaleDateString()}</p></div>
<table><thead><tr><th>Material/Service</th><th>Qty</th><th>Unit</th><th>Unit Price</th><th>Total</th></tr></thead>
<tbody>
${estimate.lineItems.map((i) => `<tr><td>${i.label}</td><td>${formatNumber(i.quantity)}</td><td>${i.unit}</td><td>${estimate.currencySymbol}${formatNumber(i.unitPrice)}</td><td>${estimate.currencySymbol}${formatNumber(i.total)}</td></tr>`).join("")}
</tbody></table>
<div class="summary">
<div><span>Material Cost</span><span>${estimate.currencySymbol}${formatNumber(estimate.materialCost)}</span></div>
${estimate.labourCost > 0 ? `<div><span>Labour Cost</span><span>${estimate.currencySymbol}${formatNumber(estimate.labourCost)}</span></div>` : ""}
<div><span>Transport</span><span>${estimate.currencySymbol}${formatNumber(estimate.transportCost)}</span></div>
<div><span>Waste (${estimate.wastePercentage}%)</span><span>${estimate.currencySymbol}${formatNumber(estimate.wasteAmount)}</span></div>
${estimate.markupAmount > 0 ? `<div><span>Markup (${estimate.markupPercentage}%)</span><span>${estimate.currencySymbol}${formatNumber(estimate.markupAmount)}</span></div>` : ""}
${estimate.profitAmount > 0 ? `<div><span>Profit (${estimate.profitPercentage}%)</span><span>${estimate.currencySymbol}${formatNumber(estimate.profitAmount)}</span></div>` : ""}
<div><span>Tax/VAT (${estimate.taxPercentage}%)</span><span>${estimate.currencySymbol}${formatNumber(estimate.taxAmount)}</span></div>
<div class="grand"><span>Grand Total</span><span>${estimate.currencySymbol}${formatNumber(estimate.grandTotal)}</span></div>
</div>
${estimate.aiRecommendations.length > 0 ? `<div style="margin-top:20px;padding:15px;background:#f0fdf4;border-radius:8px"><h3 style="font-size:14px;color:#1a1a2e">AI Recommendations</h3><ul style="font-size:13px;color:#444">${estimate.aiRecommendations.map((r) => `<li>${r}</li>`).join("")}</ul></div>` : ""}
<div class="footer"><p>Generated by FRELUX Advanced Calculator</p></div>
</body></html>`;
}
