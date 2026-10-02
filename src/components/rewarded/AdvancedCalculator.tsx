import { useState, useEffect, useCallback } from "react";
import {
  Bot,
  Save,
  Copy,
  Download,
  Trash2,
  Loader2,
  Layers,
  DollarSign,
  Brain,
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  saveAdvancedEstimate,
  fetchAdvancedEstimates,
  deleteAdvancedEstimate,
} from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import type { AdvancedEstimateData } from "@/types";
import { PremiumFeatureGate } from "@/components/premium/PremiumFeatureGate";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/shadcn/button";

interface Props {
  /** Identifies which calculator this is attached to, e.g. "paint", "tile", "pop", "screeding" */
  toolKey?: string;
  /** Human-readable label for the calculator type, shown in the header */
  toolLabel?: string;
  /** A text summary of the current calculator's results that the AI can analyze */
  contextSummary: string;
  /** Anonymous client hash from rewarded access */
  clientHash: string;
}

type Tab = "breakdown" | "costs" | "ai" | "saved";

export function AdvancedCalculator({
  toolKey = "advanced_calculator",
  toolLabel = "Advanced Calculator",
  contextSummary,
  clientHash,
}: Props) {
  const [tab, setTab] = useState<Tab>("ai");
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
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiBreakdown, setAiBreakdown] = useState<string | null>(null);
  const [aiBreakdownLoading, setAiBreakdownLoading] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [pdfGateOpen, setPdfGateOpen] = useState(false);
  const [pdfUnlocked, setPdfUnlocked] = useState(false);
  const { isPaid } = useAuth();

  // Universal cost adjustment inputs (work for any calculator type)
  const [costAdjust, setCostAdjust] = useState({
    labourCost: 0,
    transportCost: 0,
    wastePercentage: 10,
    markupPercentage: 0,
    profitPercentage: 0,
    taxPercentage: 7.5,
  });

  // Fetch AI breakdown for non-screeding calculators on mount
  const fetchAiBreakdown = useCallback(async () => {
    setAiBreakdownLoading(true);
    try {
      const prompt = `You are an expert construction cost analyst AI. Analyze the following calculator results and provide a detailed advanced breakdown.

${contextSummary}

Provide your analysis in this exact format:

## Advanced Breakdown
A detailed itemized breakdown of all materials, quantities, and costs.

## Cost Analysis
Analysis of the cost structure, highlighting where money is being spent.

## Smart Recommendations
3-5 specific, actionable recommendations to optimize costs, reduce waste, and improve project quality.

## Risk Assessment
Flag any unrealistic values, potential issues, or things to verify on site.

Use ₦ (Naira) for all currency. Be specific with numbers. Keep it practical and concise.`;
      const { data } = await supabase.functions.invoke<{
        response?: string;
        error?: string;
      }>("ai-studio", {
        body: { tool: "chat", prompt },
      });
      setAiBreakdown(
        data?.response || data?.error || "Unable to generate analysis.",
      );
    } catch {
      setAiBreakdown("Unable to reach the AI assistant. Please try again.");
    }
    setAiBreakdownLoading(false);
  }, [contextSummary]);

  useEffect(() => {
    fetchAiBreakdown();
  }, [fetchAiBreakdown]);

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

  function updateCost<K extends keyof typeof costAdjust>(
    key: K,
    value: number,
  ) {
    setCostAdjust((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaveStatus("saving");
    const title =
      saveTitle || `${toolLabel} estimate ${new Date().toLocaleDateString()}`;
    const { id, error } = await saveAdvancedEstimate({
      clientHash,
      toolKey,
      title,
      projectType: toolKey,
      estimateData: {
        contextSummary,
        aiBreakdown,
        costAdjust,
      } as unknown as Record<string, unknown>,
      totalCost: 0,
      currency: "NGN",
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
    await deleteAdvancedEstimate(id, clientHash);
    setSavedEstimates((prev) => prev.filter((e) => e.id !== id));
  }

  function handleDuplicate() {
    setSaveTitle(`${toolLabel} copy`);
    setSaveStatus(null);
  }

  function handleExportPDF() {
    // Paid subscribers bypass the gate
    if (!isPaid && !pdfUnlocked) {
      setPdfGateOpen(true);
      return;
    }
    const win = window.open("", "_blank");
    if (!win) {
      setSaveStatus(
        "Popup blocked. Please allow popups for this site to export PDF.",
      );
      window.setTimeout(() => setSaveStatus(null), 5000);
      return;
    }
    const html = generateAiQuotationHTML(
      toolLabel,
      contextSummary,
      aiBreakdown,
      costAdjust,
    );
    win.document.write(html);
    win.document.close();
    win.print();
    // Session-scoped: reset unlock after use
    setPdfUnlocked(false);
  }

  async function handleAiAsk() {
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    setAiResponse(null);
    try {
      const prompt = `You are an expert construction cost analyst AI. The user is working with a ${toolLabel}.

Here are the current calculator results:
${contextSummary}

Cost adjustments applied:
- Labour: ₦${formatNumber(costAdjust.labourCost)}
- Transport: ₦${formatNumber(costAdjust.transportCost)}
- Waste: ${costAdjust.wastePercentage}%
- Markup: ${costAdjust.markupPercentage}%
- Profit: ${costAdjust.profitPercentage}%
- Tax/VAT: ${costAdjust.taxPercentage}%

Question: ${aiQuestion}

Give a concise, practical answer with specific numbers and recommendations. Use ₦ for currency.`;
      const { data } = await supabase.functions.invoke<{
        response?: string;
        error?: string;
      }>("ai-studio", {
        body: { tool: "chat", prompt },
      });
      setAiResponse(data?.response || data?.error || "No response received.");
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
      const prompt = `You are an expert construction cost analyst AI. Analyze this ${toolLabel} project and provide 5 specific recommendations to reduce waste and lower costs.

Current results:
${contextSummary}

Cost adjustments: Labour ₦${formatNumber(costAdjust.labourCost)}, Transport ₦${formatNumber(costAdjust.transportCost)}, Waste ${costAdjust.wastePercentage}%, Markup ${costAdjust.markupPercentage}%, Tax ${costAdjust.taxPercentage}%

Also flag any unrealistic values or potential issues. Use ₦ for currency. Be specific and practical.`;
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

  const uniqueTabs: { key: Tab; label: string; icon: typeof Layers }[] = [
    { key: "breakdown", label: "AI Analysis", icon: Brain },
    { key: "costs", label: "Cost Adjuster", icon: DollarSign },
    { key: "ai", label: "AI Assistant", icon: Bot },
    { key: "saved", label: "Saved", icon: Save },
  ];

  return (
    <div className="mt-6 rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-card to-primary/[0.02] p-1">
      <div className="rounded-xl bg-card p-4 sm:p-6 dark:bg-card">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border/50 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Bot aria-hidden="true" className="h-5 w-5 text-brand-purple" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-foreground dark:text-primary-foreground">
              {toolLabel}: AI Advanced Mode
            </h3>
            <p className="text-xs text-muted-foreground">
              AI-powered breakdown, smart recommendations, cost optimization &
              PDF export
            </p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-brand-purple">
            <Brain className="h-3 w-3" /> AI
          </span>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {uniqueTabs.map((t) => {
            const Icon = t.icon;
            return (
              <Button
                variant="ghost"
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all " +
                  (tab === t.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted dark:bg-white/5 dark:text-muted-foreground dark:hover:bg-white/10")
                }
              >
                <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                {t.label}
              </Button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="mt-5">
          {tab === "breakdown" && (
            <AiBreakdownTab
              contextSummary={contextSummary}
              aiBreakdown={aiBreakdown}
              loading={aiBreakdownLoading}
              onRefresh={fetchAiBreakdown}
              onSave={handleSave}
              onExport={handleExportPDF}
              saveTitle={saveTitle}
              setSaveTitle={setSaveTitle}
              saveStatus={saveStatus}
              onDuplicate={handleDuplicate}
            />
          )}
          {tab === "costs" && (
            <CostsTab
              costAdjust={costAdjust}
              update={updateCost}
              pdfGateOpen={pdfGateOpen}
              setPdfGateOpen={setPdfGateOpen}
              setPdfUnlocked={setPdfUnlocked}
              onExportPDF={handleExportPDF}
            />
          )}
          {tab === "ai" && (
            <AiTab
              question={aiQuestion}
              setQuestion={setAiQuestion}
              onAsk={handleAiAsk}
              onRecommend={handleAiRecommendations}
              loading={aiLoading}
              response={aiResponse}
              toolLabel={toolLabel}
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

// ─── AI Breakdown Tab (for non-screeding calculators) ───
function AiBreakdownTab({
  contextSummary,
  aiBreakdown,
  loading,
  onRefresh,
  onSave,
  onExport,
  saveTitle,
  setSaveTitle,
  saveStatus,
  onDuplicate,
}: {
  contextSummary: string;
  aiBreakdown: string | null;
  loading: boolean;
  onRefresh: () => void;
  onSave: () => void;
  onExport: () => void;
  saveTitle: string;
  setSaveTitle: (v: string) => void;
  saveStatus: string | null;
  onDuplicate: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Source data */}
      <div className="rounded-lg border border-border bg-muted/50 p-4 dark:border-white/5 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <Layers aria-hidden="true" className="h-4 w-4 text-brand-purple" />
          <h4 className="text-sm font-bold text-foreground dark:text-primary-foreground">
            Calculator Input Summary
          </h4>
        </div>
        <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground dark:text-muted-foreground/80">
          {contextSummary}
        </pre>
      </div>

      {/* AI Analysis */}
      <div className="rounded-lg border border-brand-purple/20 bg-primary/[0.02] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain aria-hidden="true" className="h-4 w-4 text-brand-purple" />
            <h4 className="text-sm font-bold text-foreground dark:text-primary-foreground">
              AI-Powered Analysis
            </h4>
          </div>
          <Button
            variant="ghost"
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="text-xs font-semibold text-brand-purple hover:underline disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Refresh"}
          </Button>
        </div>

        {loading && (
          <div className="mt-4 flex items-center gap-2 py-8 justify-center">
            <Loader2
              aria-hidden="true"
              className="h-6 w-6 animate-spin text-brand-purple"
            />
            <p className="text-sm text-muted-foreground">
              AI is analyzing your project…
            </p>
          </div>
        )}

        {!loading && aiBreakdown && (
          <div className="mt-3 prose prose-sm max-w-none text-card-foreground dark:text-muted-foreground/60">
            <FormattedAiResponse content={aiBreakdown} />
          </div>
        )}

        {!loading && !aiBreakdown && (
          <p className="mt-3 text-sm text-muted-foreground">
            No analysis yet. Click refresh to generate.
          </p>
        )}
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
          <Button
            variant="default"
            type="button"
            onClick={onSave}
            className="flex items-center gap-1.5 whitespace-nowrap"
          >
            <Save aria-hidden="true" className="h-4 w-4" /> Save
          </Button>
        </div>
        <Button
          variant="secondary"
          type="button"
          onClick={onDuplicate}
          className="flex items-center gap-1.5"
        >
          <Copy aria-hidden="true" className="h-4 w-4" /> Duplicate
        </Button>
        <Button
          variant="secondary"
          type="button"
          onClick={onExport}
          className="flex items-center gap-1.5"
        >
          <Download aria-hidden="true" className="h-4 w-4" /> PDF
        </Button>
      </div>
      {saveStatus === "saving" && (
        <p className="text-xs text-muted-foreground">Saving…</p>
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

// ─── Universal Costs Tab ───
function CostsTab({
  costAdjust,
  update,
  pdfGateOpen,
  setPdfGateOpen,
  setPdfUnlocked,
  onExportPDF,
}: {
  costAdjust: {
    labourCost: number;
    transportCost: number;
    wastePercentage: number;
    markupPercentage: number;
    profitPercentage: number;
    taxPercentage: number;
  };
  update: <K extends keyof typeof costAdjust>(key: K, value: number) => void;
  pdfGateOpen: boolean;
  setPdfGateOpen: (open: boolean) => void;
  setPdfUnlocked: (unlocked: boolean) => void;
  onExportPDF: () => void;
}) {
  const transport = costAdjust.transportCost;
  const subtotal = transport + costAdjust.labourCost;
  const markupAmount = subtotal * (costAdjust.markupPercentage / 100);
  const profitAmount =
    (subtotal + markupAmount) * (costAdjust.profitPercentage / 100);
  const preTax = subtotal + markupAmount + profitAmount;
  const taxAmount = preTax * (costAdjust.taxPercentage / 100);
  const grandTotal = preTax + taxAmount;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-brand-purple/20 bg-primary/5 p-3">
        <div className="flex items-center gap-2">
          <Bot aria-hidden="true" className="h-4 w-4 text-brand-purple" />
          <p className="text-xs text-muted-foreground dark:text-muted-foreground/80">
            These adjustments apply on top of your calculator's base results.
            Use the AI Analysis tab for a full breakdown.
          </p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2">
        <NumField
          label="Labour cost (₦)"
          value={costAdjust.labourCost}
          onChange={(v) => update("labourCost", v)}
        />
        <NumField
          label="Transport cost (₦)"
          value={costAdjust.transportCost}
          onChange={(v) => update("transportCost", v)}
        />
      </div>

      <div>
        <h4 className="text-sm font-bold text-foreground dark:text-primary-foreground">
          Waste Percentage Scenarios
        </h4>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Compare different waste allowances.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[0, 5, 10, 15, 20, 25].map((w) => (
            <Button
              variant="ghost"
              key={w}
              type="button"
              onClick={() => update("wastePercentage", w)}
              className={
                "rounded-lg border px-4 py-2 text-sm font-semibold transition-all " +
                (costAdjust.wastePercentage === w
                  ? "border-brand-purple bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground dark:border-white/10 dark:text-muted-foreground/80 hover:border-border")
              }
            >
              {w}%
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2">
        <NumField
          label="Markup (%)"
          value={costAdjust.markupPercentage}
          onChange={(v) => update("markupPercentage", v)}
        />
        <NumField
          label="Profit (%)"
          value={costAdjust.profitPercentage}
          onChange={(v) => update("profitPercentage", v)}
        />
        <NumField
          label="Tax/VAT (%)"
          value={costAdjust.taxPercentage}
          onChange={(v) => update("taxPercentage", v)}
        />
      </div>

      <div className="rounded-lg border border-border p-4 dark:border-white/5">
        <h4 className="text-sm font-bold text-foreground dark:text-primary-foreground">
          Cost Summary
        </h4>
        <div className="mt-3 space-y-2 text-sm">
          <>
            <SummaryRow
              label="Labour"
              value={formatCurrency(costAdjust.labourCost)}
            />
            <SummaryRow
              label="Transport"
              value={formatCurrency(costAdjust.transportCost)}
            />
            <SummaryRow
              label={`Markup (${costAdjust.markupPercentage}%)`}
              value={formatCurrency(markupAmount)}
            />
            <SummaryRow
              label={`Profit (${costAdjust.profitPercentage}%)`}
              value={formatCurrency(profitAmount)}
            />
            <SummaryRow
              label={`Tax/VAT (${costAdjust.taxPercentage}%)`}
              value={formatCurrency(taxAmount)}
            />
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="font-bold text-foreground dark:text-primary-foreground">
                Additional Costs
              </span>
              <span className="text-lg font-bold text-foreground dark:text-primary-foreground">
                {formatCurrency(grandTotal)}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Add this to your calculator's base material cost for the full
              project total.
            </p>
          </>
          {pdfGateOpen && (
            <PremiumFeatureGate
              featureKey="pdf_export"
              featureName="PDF Export"
              description="Export professional PDF quotations. One-time use. Unlock each export."
              onUnlock={() => {
                setPdfUnlocked(true);
                setPdfGateOpen(false);
                onExportPDF();
              }}
              onClose={() => setPdfGateOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AI Assistant Tab ───
function AiTab({
  question,
  setQuestion,
  onAsk,
  onRecommend,
  loading,
  response,
  toolLabel,
}: {
  question: string;
  setQuestion: (v: string) => void;
  onAsk: () => void;
  onRecommend: () => void;
  loading: boolean;
  response: string | null;
  toolLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-brand-purple/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2">
          <Bot aria-hidden="true" className="h-4 w-4 text-brand-purple" />
          <h4 className="text-sm font-bold text-foreground dark:text-primary-foreground">
            AI Powered Recommendations
          </h4>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Get smart suggestions to reduce waste and lower costs for your{" "}
          {toolLabel.toLowerCase()} project.
        </p>
        <Button
          variant="default"
          type="button"
          onClick={onRecommend}
          disabled={loading}
          className="mt-3 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Brain aria-hidden="true" className="h-3.5 w-3.5" />
          )}
          Analyze Project & Recommend
        </Button>
      </div>

      <div>
        <h4 className="text-sm font-bold text-foreground dark:text-primary-foreground">
          Ask the AI Assistant
        </h4>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Ask about calculations, materials, cost saving tips, or construction
          best practices.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) onAsk();
            }}
            placeholder="e.g. How can I reduce material waste?"
            className="input-field flex-1"
          />
          <Button
            variant="default"
            type="button"
            onClick={onAsk}
            disabled={loading || !question.trim()}
            className="flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
          >
            {loading ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Bot aria-hidden="true" className="h-4 w-4" />
            )}
            Ask
          </Button>
        </div>
      </div>

      {loading && !response && (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />{" "}
          Analyzing your project…
        </div>
      )}

      {response && (
        <div className="rounded-lg border border-border bg-muted/50 dark:border-white/5 dark:bg-white/5 p-4">
          <div className="flex items-start gap-2">
            <Bot
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-brand-purple mt-0.5"
            />
            <div className="flex-1 text-sm text-card-foreground dark:text-muted-foreground/60">
              <FormattedAiResponse content={response} />
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Powered by FRELUX AI · Responses are estimates, verify with your
        supplier
      </p>
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
      <div className="rounded-lg border border-dashed border-border bg-muted/50 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No saved estimates yet. Save an estimate to access it later.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {estimates.map((e) => (
        <div
          key={e.id}
          className="flex items-center justify-between rounded-lg border border-border bg-card p-3 dark:border-white/5 dark:bg-white/5"
        >
          <div>
            <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
              {e.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(e.createdAt).toLocaleDateString()} · {e.currency}{" "}
              {formatNumber(e.totalCost)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              type="button"
              onClick={onExport}
              className="rounded p-1.5 text-muted-foreground hover:text-brand-purple"
              aria-label="Export"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => onDelete(e.id)}
              className="rounded p-1.5 text-muted-foreground hover:text-red-500"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Helper Components ───
function NumField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="input-field mt-1 w-full"
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground dark:text-primary-foreground">
        {value}
      </span>
    </div>
  );
}

// ─── Formatted AI Response (renders markdown-ish content) ───
function FormattedAiResponse({ content }: { content: string }) {
  const sections = content.split(/^## /m);
  return (
    <div className="space-y-3">
      {sections
        .filter((s) => s.trim())
        .map((section, i) => {
          const lines = section.split("\n");
          const heading = lines[0].trim();
          const body = lines.slice(1).join("\n").trim();
          return (
            <div key={i}>
              {heading && !heading.startsWith("•") && (
                <h4 className="text-sm font-bold text-foreground dark:text-primary-foreground mb-1">
                  {heading}
                </h4>
              )}
              <div className="text-sm text-muted-foreground dark:text-muted-foreground/80 whitespace-pre-wrap leading-relaxed">
                {body || heading}
              </div>
            </div>
          );
        })}
    </div>
  );
}

function generateAiQuotationHTML(
  toolLabel: string,
  contextSummary: string,
  aiBreakdown: string | null,
  costAdjust: {
    labourCost: number;
    transportCost: number;
    wastePercentage: number;
    markupPercentage: number;
    profitPercentage: number;
    taxPercentage: number;
  },
): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${toolLabel} AI Analysis</title>
<style>
body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1a1a2e}
.header{text-align:center;border-bottom:3px solid #6366f1;padding-bottom:20px;margin-bottom:30px}
.header h1{font-size:24px;margin:0;color:#1a1a2e}
.header p{color:#666;font-size:13px;margin:5px 0 0}
.section{margin:20px 0;padding:15px;background:#f9f9f9;border-radius:8px}
.section h2{font-size:16px;color:#6366f1;margin:0 0 10px}
.section p{font-size:13px;color:#333;white-space:pre-wrap;line-height:1.6}
.costs{margin-top:20px;padding:20px;background:#f0f0ff;border-radius:8px}
.costs div{display:flex;justify-content:space-between;padding:5px 0;font-size:14px}
.footer{margin-top:40px;text-align:center;font-size:11px;color:#999}
</style></head><body>
<div class="header"><h1>FRELUX | ${toolLabel}</h1><p>AI-Powered Advanced Analysis</p><p>${new Date().toLocaleDateString()}</p></div>
<div class="section"><h2>Calculator Results</h2><p>${contextSummary.replace(/</g, "&lt;")}</p></div>
${aiBreakdown ? `<div class="section"><h2>AI Analysis</h2><p>${aiBreakdown.replace(/</g, "&lt;")}</p></div>` : ""}
<div class="costs">
<h2>Cost Adjustments</h2>
<div><span>Labour</span><span>₦${formatNumber(costAdjust.labourCost)}</span></div>
<div><span>Transport</span><span>₦${formatNumber(costAdjust.transportCost)}</span></div>
<div><span>Waste</span><span>${costAdjust.wastePercentage}%</span></div>
<div><span>Markup</span><span>${costAdjust.markupPercentage}%</span></div>
<div><span>Profit</span><span>${costAdjust.profitPercentage}%</span></div>
<div><span>Tax/VAT</span><span>${costAdjust.taxPercentage}%</span></div>
</div>
<div class="footer"><p>This analysis is AI-generated. Actual costs may vary based on site conditions and market prices.</p><p>Generated by FRELUX Advanced Calculator, AI Powered</p></div>
</body></html>`;
}
