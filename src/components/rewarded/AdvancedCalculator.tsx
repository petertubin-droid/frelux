import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bot, Save, Copy, Download, Trash2,
  TrendingUp, ShoppingBag, Loader2,
  Layers, Percent, DollarSign, Calculator,
  Brain, AlertTriangle,
} from 'lucide-react';
import { calculateAdvancedEstimate, type AdvancedCalcInput } from '@/lib/calc';
import { formatCurrency, formatNumber } from '@/lib/utils';
import {
  saveAdvancedEstimate, fetchAdvancedEstimates, deleteAdvancedEstimate,
} from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import type { AdvancedEstimateData, ScreedingMixConfig } from '@/types';

interface Props {
  /** Identifies which calculator this is attached to, e.g. "paint", "tile", "pop", "screeding" */
  toolKey?: string;
  /** Human-readable label for the calculator type, shown in the header */
  toolLabel?: string;
  /** A text summary of the current calculator's results that the AI can analyze */
  contextSummary: string;
  /** For screeding mode: the net area to calculate on */
  netArea?: number;
  /** For screeding mode: the screeding mix config from the database */
  config?: ScreedingMixConfig | null;
  /** Anonymous client hash from rewarded access */
  clientHash: string;
}

type Tab = 'breakdown' | 'mix' | 'costs' | 'compare' | 'ai' | 'saved';

export function AdvancedCalculator({
  toolKey = 'advanced_calculator',
  toolLabel = 'Advanced Calculator',
  contextSummary,
  netArea = 0,
  config = null,
  clientHash,
}: Props) {
  const isScreeding = !!config;
  const [tab, setTab] = useState<Tab>(isScreeding ? 'breakdown' : 'ai');
  const [savedEstimates, setSavedEstimates] = useState<{ id: string; title: string; totalCost: number; currency: string; estimateData: AdvancedEstimateData; createdAt: string }[]>([]);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiBreakdown, setAiBreakdown] = useState<string | null>(null);
  const [aiBreakdownLoading, setAiBreakdownLoading] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [compareEstimate, setCompareEstimate] = useState<AdvancedEstimateData | null>(null);

  // Universal cost adjustment inputs (work for any calculator type)
  const [costAdjust, setCostAdjust] = useState({
    labourCost: 0,
    transportCost: 0,
    wastePercentage: 10,
    markupPercentage: 0,
    profitPercentage: 0,
    taxPercentage: 7.5,
  });

  // ── Screeding-specific calculation (existing logic) ──
  const [screedingInput, setScreedingInput] = useState<AdvancedCalcInput | null>(null);

  useEffect(() => {
    if (!isScreeding || !config) return;
    setScreedingInput({
      netArea: netArea || 0,
      thickness: 10,
      coats: 2,
      mixRatio: config.defaultMixRatio || '2:1',
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
  }, [netArea, config, isScreeding]);

  const estimate = useMemo(() => {
    if (!screedingInput) return null;
    return calculateAdvancedEstimate(screedingInput);
  }, [screedingInput]);

  // Fetch AI breakdown for non-screeding calculators on mount
  const fetchAiBreakdown = useCallback(async () => {
    if (isScreeding) return;
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
      const { data } = await supabase.functions.invoke<{ response?: string; error?: string }>('ai-studio', {
        body: { tool: 'chat', prompt },
      });
      setAiBreakdown(data?.response || data?.error || 'Unable to generate analysis.');
    } catch {
      setAiBreakdown('Unable to reach the AI assistant. Please try again.');
    }
    setAiBreakdownLoading(false);
  }, [isScreeding, contextSummary]);

  useEffect(() => {
    if (!isScreeding) fetchAiBreakdown();
  }, [fetchAiBreakdown, isScreeding]);

  useEffect(() => {
    fetchAdvancedEstimates(clientHash).then(({ data }) => {
      setSavedEstimates(data.map((d) => ({
        id: d.id,
        title: d.title,
        totalCost: d.total_cost ?? 0,
        currency: d.currency,
        estimateData: d.estimate_data as unknown as AdvancedEstimateData,
        createdAt: d.created_at,
      })));
    });
  }, [clientHash]);

  function updateScreeding<K extends keyof AdvancedCalcInput>(key: K, value: AdvancedCalcInput[K]) {
    setScreedingInput((prev) => prev ? { ...prev, [key]: value } : null);
  }

  function updateCost<K extends keyof typeof costAdjust>(key: K, value: number) {
    setCostAdjust((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaveStatus('saving');
    const title = saveTitle || `${toolLabel} estimate ${new Date().toLocaleDateString()}`;
    const projectType = toolKey === 'advanced_calculator' && isScreeding ? 'screeding' : toolKey;

    if (isScreeding && estimate) {
      const { id, error } = await saveAdvancedEstimate({
        clientHash,
        toolKey,
        title,
        projectType,
        estimateData: estimate as unknown as Record<string, unknown>,
        totalCost: estimate.grandTotal,
        currency: estimate.currency,
      });
      if (error) { setSaveStatus(`Error: ${error}`); return; }
      setSaveStatus('saved');
      setSaveTitle('');
      const { data } = await fetchAdvancedEstimates(clientHash);
      setSavedEstimates(data.map((d) => ({
        id: d.id, title: d.title, totalCost: d.total_cost ?? 0, currency: d.currency,
        estimateData: d.estimate_data as unknown as AdvancedEstimateData, createdAt: d.created_at,
      })));
      if (id) setSaveStatus(null);
    } else {
      // For AI-powered mode, save the context summary and AI breakdown
      const { id, error } = await saveAdvancedEstimate({
        clientHash,
        toolKey,
        title,
        projectType,
        estimateData: { contextSummary, aiBreakdown, costAdjust } as unknown as Record<string, unknown>,
        totalCost: 0,
        currency: 'NGN',
      });
      if (error) { setSaveStatus(`Error: ${error}`); return; }
      setSaveStatus('saved');
      setSaveTitle('');
      const { data } = await fetchAdvancedEstimates(clientHash);
      setSavedEstimates(data.map((d) => ({
        id: d.id, title: d.title, totalCost: d.total_cost ?? 0, currency: d.currency,
        estimateData: d.estimate_data as unknown as AdvancedEstimateData, createdAt: d.created_at,
      })));
      if (id) setSaveStatus(null);
    }
  }

  async function handleDelete(id: string) {
    await deleteAdvancedEstimate(id);
    setSavedEstimates((prev) => prev.filter((e) => e.id !== id));
  }

  function handleDuplicate() {
    setSaveTitle(`${toolLabel} copy`);
    setSaveStatus(null);
  }

  function handleExportPDF() {
    const win = window.open('', '_blank');
    if (!win) {
      setSaveStatus('Popup blocked. Please allow popups for this site to export PDF.');
      window.setTimeout(() => setSaveStatus(null), 5000);
      return;
    }
    if (isScreeding && estimate) {
      const html = generateQuotationHTML(estimate, { title: toolLabel }, contextSummary);
      win.document.write(html);
      win.document.close();
      win.print();
    } else {
      const html = generateAiQuotationHTML(toolLabel, contextSummary, aiBreakdown, costAdjust);
      win.document.write(html);
      win.document.close();
      win.print();
    }
  }

  async function handleAiAsk() {
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    setAiResponse(null);
    try {
      const prompt = `You are an expert construction cost analyst AI. The user is working with a ${toolLabel}.

Here are the current calculator results:
${contextSummary}

${isScreeding && estimate ? `Advanced calculation data:
- Material cost: ${estimate.currencySymbol}${formatNumber(estimate.materialCost)}
- Grand total: ${estimate.currencySymbol}${formatNumber(estimate.grandTotal)}
- Waste: ${estimate.wastePercentage}%, Markup: ${estimate.markupPercentage}%, Tax: ${estimate.taxPercentage}%
` : ''}

Cost adjustments applied:
- Labour: ₦${formatNumber(costAdjust.labourCost)}
- Transport: ₦${formatNumber(costAdjust.transportCost)}
- Waste: ${costAdjust.wastePercentage}%
- Markup: ${costAdjust.markupPercentage}%
- Profit: ${costAdjust.profitPercentage}%
- Tax/VAT: ${costAdjust.taxPercentage}%

Question: ${aiQuestion}

Give a concise, practical answer with specific numbers and recommendations. Use ₦ for currency.`;
      const { data } = await supabase.functions.invoke<{ response?: string; error?: string }>('ai-studio', {
        body: { tool: 'chat', prompt },
      });
      setAiResponse(data?.response || data?.error || 'No response received.');
    } catch {
      setAiResponse('Unable to reach the AI assistant right now. Please try again.');
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

${isScreeding && estimate ? `Advanced calculation:
- Paint: ${estimate.paintBuckets} × 20L buckets @ ${estimate.currencySymbol}${formatNumber(screedingInput?.paintPricePerBucket ?? 0)}
- Cement: ${estimate.cementBags} × 40kg bags @ ${estimate.currencySymbol}${formatNumber(screedingInput?.cementPricePerBag ?? 0)}
- Material: ${estimate.currencySymbol}${formatNumber(estimate.materialCost)}, Grand total: ${estimate.currencySymbol}${formatNumber(estimate.grandTotal)}
- Waste: ${estimate.wastePercentage}%, Markup: ${estimate.markupPercentage}%, Tax: ${estimate.taxPercentage}%
` : `Cost adjustments: Labour ₦${formatNumber(costAdjust.labourCost)}, Transport ₦${formatNumber(costAdjust.transportCost)}, Waste ${costAdjust.wastePercentage}%, Markup ${costAdjust.markupPercentage}%, Tax ${costAdjust.taxPercentage}%`}

Also flag any unrealistic values or potential issues. Use ₦ for currency. Be specific and practical.`;
      const { data } = await supabase.functions.invoke<{ response?: string; error?: string }>('ai-studio', {
        body: { tool: 'chat', prompt },
      });
      setAiResponse(data?.response || data?.error || 'No response received.');
    } catch {
      setAiResponse('Unable to reach the AI assistant right now.');
    }
    setAiLoading(false);
  }

  // Build tabs list — hide Mix Ratio for non-screeding
  const tabs: { key: Tab; label: string; icon: typeof Layers }[] = isScreeding
    ? [
        { key: 'breakdown', label: 'Breakdown', icon: Layers },
        { key: 'mix', label: 'Mix Ratio', icon: Percent },
        { key: 'costs', label: 'Costs', icon: DollarSign },
        { key: 'compare', label: 'Compare', icon: TrendingUp },
        { key: 'ai', label: 'AI Assistant', icon: Bot },
        { key: 'saved', label: 'Saved', icon: Save },
      ]
    : [
        { key: 'ai', label: 'AI Analysis', icon: Brain },
        { key: 'costs', label: 'Cost Adjuster', icon: DollarSign },
        { key: 'ai', label: 'AI Assistant', icon: Bot }, // This won't render duplicate since we filter by key
        { key: 'saved', label: 'Saved', icon: Save },
      ];

  // Remove duplicate AI tab for non-screeding
  const uniqueTabs = isScreeding ? tabs : [
    { key: 'breakdown' as Tab, label: 'AI Analysis', icon: Brain },
    { key: 'costs' as Tab, label: 'Cost Adjuster', icon: DollarSign },
    { key: 'ai' as Tab, label: 'AI Assistant', icon: Bot },
    { key: 'saved' as Tab, label: 'Saved', icon: Save },
  ];

  return (
    <div className="mt-6 rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-white to-brand-purple/[0.02] p-1">
      <div className="rounded-xl bg-white p-4 sm:p-6 dark:bg-brand-navy-mid">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-purple/10">
            <Bot aria-hidden="true" className="h-5 w-5 text-brand-purple" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-brand-navy dark:text-white">{toolLabel} — AI Advanced Mode</h3>
            <p className="text-xs text-neutral-500">AI-powered breakdown, smart recommendations, cost optimization & PDF export</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-brand-purple/10 px-2.5 py-1 text-xs font-semibold text-brand-purple">
            <Brain className="h-3 w-3" /> AI
          </span>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {uniqueTabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ' +
                  (tab === t.key ? 'bg-brand-purple text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-white/5 dark:text-neutral-400 dark:hover:bg-white/10')
                }
              >
                <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="mt-5">
          {tab === 'breakdown' && isScreeding && estimate && screedingInput && (
            <ScreedingBreakdownTab
              estimate={estimate}
              input={screedingInput}
              update={updateScreeding}
              onSave={handleSave}
              onDuplicate={handleDuplicate}
              onExport={handleExportPDF}
              saveTitle={saveTitle}
              setSaveTitle={setSaveTitle}
              saveStatus={saveStatus}
            />
          )}
          {tab === 'breakdown' && !isScreeding && (
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
          {tab === 'mix' && isScreeding && screedingInput && (
            <MixTab input={screedingInput} update={updateScreeding} config={config!} />
          )}
          {tab === 'costs' && (
            <CostsTab
              costAdjust={costAdjust}
              update={updateCost}
              estimate={estimate}
              isScreeding={isScreeding}
              contextSummary={contextSummary}
              aiBreakdown={aiBreakdown}
            />
          )}
          {tab === 'compare' && isScreeding && estimate && (
            <CompareTab current={estimate} saved={savedEstimates} onSelect={setCompareEstimate} selected={compareEstimate} />
          )}
          {tab === 'ai' && (
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
          {tab === 'saved' && (
            <SavedTab estimates={savedEstimates} onDelete={handleDelete} onExport={handleExportPDF} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AI Breakdown Tab (for non-screeding calculators) ───
function AiBreakdownTab({ contextSummary, aiBreakdown, loading, onRefresh, onSave, onExport, saveTitle, setSaveTitle, saveStatus, onDuplicate }: {
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
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-white/5 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <Layers aria-hidden="true" className="h-4 w-4 text-brand-purple" />
          <h4 className="text-sm font-bold text-brand-navy dark:text-white">Calculator Input Summary</h4>
        </div>
        <pre className="mt-2 whitespace-pre-wrap text-xs text-neutral-600 dark:text-neutral-300">{contextSummary}</pre>
      </div>

      {/* AI Analysis */}
      <div className="rounded-lg border border-brand-purple/20 bg-brand-purple/[0.02] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain aria-hidden="true" className="h-4 w-4 text-brand-purple" />
            <h4 className="text-sm font-bold text-brand-navy dark:text-white">AI-Powered Analysis</h4>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="text-xs font-semibold text-brand-purple hover:underline disabled:opacity-50"
          >
            {loading ? 'Analyzing…' : 'Refresh'}
          </button>
        </div>

        {loading && (
          <div className="mt-4 flex items-center gap-2 py-8 justify-center">
            <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-brand-purple" />
            <p className="text-sm text-neutral-500">AI is analyzing your project…</p>
          </div>
        )}

        {!loading && aiBreakdown && (
          <div className="mt-3 prose prose-sm max-w-none text-neutral-700 dark:text-neutral-200">
            <FormattedAiResponse content={aiBreakdown} />
          </div>
        )}

        {!loading && !aiBreakdown && (
          <p className="mt-3 text-sm text-neutral-500">No analysis yet. Click refresh to generate.</p>
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
          <button type="button" onClick={onSave} className="btn-primary flex items-center gap-1.5 whitespace-nowrap">
            <Save aria-hidden="true" className="h-4 w-4" /> Save
          </button>
        </div>
        <button type="button" onClick={onDuplicate} className="btn-secondary flex items-center gap-1.5">
          <Copy aria-hidden="true" className="h-4 w-4" /> Duplicate
        </button>
        <button type="button" onClick={onExport} className="btn-secondary flex items-center gap-1.5">
          <Download aria-hidden="true" className="h-4 w-4" /> PDF
        </button>
      </div>
      {saveStatus === 'saving' && <p className="text-xs text-neutral-500">Saving…</p>}
      {saveStatus === 'saved' && <p className="text-xs text-accent-green">Saved successfully.</p>}
      {saveStatus?.startsWith('Error') && <p className="text-xs text-red-600">{saveStatus}</p>}
    </div>
  );
}

// ─── Screeding Breakdown Tab (existing logic) ───
function ScreedingBreakdownTab({ estimate, input, update, onSave, onDuplicate, onExport, saveTitle, setSaveTitle, saveStatus }: {
  estimate: AdvancedEstimateData;
  input: AdvancedCalcInput;
  update: <K extends keyof AdvancedCalcInput>(key: K, value: AdvancedCalcInput[K]) => void;
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
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <NumField label="Net area (m²)" value={input.netArea} onChange={(v) => update('netArea', v)} />
        <NumField label="Thickness (mm)" value={input.thickness} onChange={(v) => update('thickness', v)} />
        <NumField label="Coats" value={input.coats} onChange={(v) => update('coats', v)} />
      </div>

      {/* Line items */}
      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-white/5">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-white/5">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">Material</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-neutral-500">Qty</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-neutral-500">Unit Price</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-neutral-500">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {estimate.lineItems.map((item) => (
              <tr key={item.label}>
                <td className="px-3 py-2.5 font-medium text-brand-navy dark:text-white">{item.label}</td>
                <td className="px-3 py-2.5 text-right text-neutral-600">{formatNumber(item.quantity)} {item.unit}</td>
                <td className="px-3 py-2.5 text-right text-neutral-600">{formatCurrency(item.unitPrice, estimate.currencySymbol)}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-brand-navy dark:text-white">{formatCurrency(item.total, estimate.currencySymbol)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-2">
        <SummaryRow label="Material Cost" value={formatCurrency(estimate.materialCost, estimate.currencySymbol)} />
        <SummaryRow label="Labour Cost" value={formatCurrency(estimate.labourCost, estimate.currencySymbol)} />
        <SummaryRow label="Transport" value={formatCurrency(estimate.transportCost, estimate.currencySymbol)} />
        <SummaryRow label={`Waste (${estimate.wastePercentage}%)`} value={formatCurrency(estimate.wasteAmount, estimate.currencySymbol)} />
        {estimate.markupAmount > 0 && <SummaryRow label={`Markup (${estimate.markupPercentage}%)`} value={formatCurrency(estimate.markupAmount, estimate.currencySymbol)} />}
        {estimate.profitAmount > 0 && <SummaryRow label={`Profit (${estimate.profitPercentage}%)`} value={formatCurrency(estimate.profitAmount, estimate.currencySymbol)} />}
        <SummaryRow label={`Tax/VAT (${estimate.taxPercentage}%)`} value={formatCurrency(estimate.taxAmount, estimate.currencySymbol)} />
        <div className="flex items-center justify-between rounded-lg bg-brand-navy px-4 py-3 text-white">
          <span className="text-sm font-bold">Grand Total</span>
          <span className="text-lg font-bold">{formatCurrency(estimate.grandTotal, estimate.currencySymbol)}</span>
        </div>
      </div>

      {/* Shopping list */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 dark:border-white/5 dark:bg-white/5 p-4">
        <div className="flex items-center gap-2">
          <ShoppingBag aria-hidden="true" className="h-4 w-4 text-brand-purple" />
          <h4 className="text-sm font-bold text-brand-navy dark:text-white">Material Shopping List</h4>
        </div>
        <ul className="mt-2 space-y-1 text-sm text-neutral-600">
          <li>{estimate.paintBuckets} × Screeding Paint (20 L bucket): {formatCurrency(estimate.paintBuckets * input.paintPricePerBucket, estimate.currencySymbol)}</li>
          <li>{estimate.cementBags} × White Cement (40 kg bag): {formatCurrency(estimate.cementBags * input.cementPricePerBag, estimate.currencySymbol)}</li>
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
          <button type="button" onClick={onSave} className="btn-primary flex items-center gap-1.5 whitespace-nowrap">
            <Save aria-hidden="true" className="h-4 w-4" /> Save
          </button>
        </div>
        <button type="button" onClick={onDuplicate} className="btn-secondary flex items-center gap-1.5">
          <Copy aria-hidden="true" className="h-4 w-4" /> Duplicate
        </button>
        <button type="button" onClick={onExport} className="btn-secondary flex items-center gap-1.5">
          <Download aria-hidden="true" className="h-4 w-4" /> PDF
        </button>
      </div>
      {saveStatus === 'saving' && <p className="text-xs text-neutral-500">Saving…</p>}
      {saveStatus === 'saved' && <p className="text-xs text-accent-green">Saved successfully.</p>}
      {saveStatus?.startsWith('Error') && <p className="text-xs text-red-600">{saveStatus}</p>}
    </div>
  );
}

// ─── Mix Ratio Tab (screeding only) ───
function MixTab({ input, update, config }: {
  input: AdvancedCalcInput;
  update: <K extends keyof AdvancedCalcInput>(key: K, value: AdvancedCalcInput[K]) => void;
  config: ScreedingMixConfig;
}) {
  const ratios = ['1:1', '2:1', '3:1', '3:2', '4:1'];
  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-bold text-brand-navy dark:text-white">Custom Mix Ratio Editor</h4>
        <p className="mt-0.5 text-xs text-neutral-500">Adjust the paint to cement mix ratio for your wall condition.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ratios.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => update('mixRatio', r)}
              className={
                'rounded-lg border px-4 py-2 text-sm font-semibold transition-all ' +
                (input.mixRatio === r ? 'border-brand-purple bg-brand-purple text-white' : 'border-neutral-200 text-neutral-600 dark:border-white/10 dark:text-neutral-300 hover:border-neutral-300')
              }
            >
              {r}
            </button>
          ))}
          <input
            type="text"
            value={input.mixRatio}
            onChange={(e) => update('mixRatio', e.target.value)}
            className="input-field w-24"
            placeholder="Custom"
          />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2">
        <NumField label="Paint coverage (m²/L)" value={input.paintCoverageRateM2PerL} onChange={(v) => update('paintCoverageRateM2PerL', v)} step={0.1} />
        <NumField label="Cement ratio (kg/L)" value={input.cementRatioKgPerL} onChange={(v) => update('cementRatioKgPerL', v)} step={0.1} />
        <NumField label="Paint bucket size (L)" value={input.paintBucketSizeL} onChange={(v) => update('paintBucketSizeL', v)} />
        <NumField label="Cement bag size (kg)" value={input.cementBagSizeKg} onChange={(v) => update('cementBagSizeKg', v)} />
      </div>

      <div className="grid gap-4 grid-cols-2">
        <NumField label="Paint price per bucket" value={input.paintPricePerBucket} onChange={(v) => update('paintPricePerBucket', v)} />
        <NumField label="Cement price per bag" value={input.cementPricePerBag} onChange={(v) => update('cementPricePerBag', v)} />
      </div>
    </div>
  );
}

// ─── Universal Costs Tab ───
function CostsTab({ costAdjust, update, estimate, isScreeding, contextSummary, aiBreakdown }: {
  costAdjust: { labourCost: number; transportCost: number; wastePercentage: number; markupPercentage: number; profitPercentage: number; taxPercentage: number };
  update: <K extends keyof typeof costAdjust>(key: K, value: number) => void;
  estimate: AdvancedEstimateData | null;
  isScreeding: boolean;
  contextSummary: string;
  aiBreakdown: string | null;
}) {
  // For screeding, use the calculated estimate. For AI mode, estimate is conceptual.
  const baseCost = isScreeding && estimate ? estimate.materialCost : 0;
  const transport = costAdjust.transportCost;
  const subtotal = baseCost + transport + costAdjust.labourCost;
  const markupAmount = subtotal * (costAdjust.markupPercentage / 100);
  const profitAmount = (subtotal + markupAmount) * (costAdjust.profitPercentage / 100);
  const preTax = subtotal + markupAmount + profitAmount;
  const taxAmount = preTax * (costAdjust.taxPercentage / 100);
  const grandTotal = preTax + taxAmount;

  return (
    <div className="space-y-5">
      {!isScreeding && (
        <div className="rounded-lg border border-brand-purple/20 bg-brand-purple/5 p-3">
          <div className="flex items-center gap-2">
            <Bot aria-hidden="true" className="h-4 w-4 text-brand-purple" />
            <p className="text-xs text-neutral-600 dark:text-neutral-300">
              These adjustments apply on top of your calculator's base results. Use the AI Analysis tab for a full breakdown.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 grid-cols-2">
        <NumField label="Labour cost (₦)" value={costAdjust.labourCost} onChange={(v) => update('labourCost', v)} />
        <NumField label="Transport cost (₦)" value={costAdjust.transportCost} onChange={(v) => update('transportCost', v)} />
      </div>

      <div>
        <h4 className="text-sm font-bold text-brand-navy dark:text-white">Waste Percentage Scenarios</h4>
        <p className="mt-0.5 text-xs text-neutral-500">Compare different waste allowances.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[0, 5, 10, 15, 20, 25].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => update('wastePercentage', w)}
              className={
                'rounded-lg border px-4 py-2 text-sm font-semibold transition-all ' +
                (costAdjust.wastePercentage === w ? 'border-brand-purple bg-brand-purple text-white' : 'border-neutral-200 text-neutral-600 dark:border-white/10 dark:text-neutral-300 hover:border-neutral-300')
              }
            >
              {w}%
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2">
        <NumField label="Markup (%)" value={costAdjust.markupPercentage} onChange={(v) => update('markupPercentage', v)} />
        <NumField label="Profit (%)" value={costAdjust.profitPercentage} onChange={(v) => update('profitPercentage', v)} />
        <NumField label="Tax/VAT (%)" value={costAdjust.taxPercentage} onChange={(v) => update('taxPercentage', v)} />
      </div>

      <div className="rounded-lg border border-neutral-200 p-4 dark:border-white/5">
        <h4 className="text-sm font-bold text-brand-navy dark:text-white">Cost Summary</h4>
        <div className="mt-3 space-y-2 text-sm">
          {isScreeding && estimate ? (
            <>
              <SummaryRow label="Materials" value={formatCurrency(estimate.materialCost, estimate.currencySymbol)} />
              <SummaryRow label="Labour" value={formatCurrency(costAdjust.labourCost, estimate.currencySymbol)} />
              <SummaryRow label="Transport" value={formatCurrency(costAdjust.transportCost, estimate.currencySymbol)} />
              <SummaryRow label="Waste" value={formatCurrency(estimate.wasteAmount, estimate.currencySymbol)} />
              <SummaryRow label="Markup" value={formatCurrency(markupAmount, estimate.currencySymbol)} />
              <SummaryRow label="Profit" value={formatCurrency(profitAmount, estimate.currencySymbol)} />
              <SummaryRow label="Tax/VAT" value={formatCurrency(taxAmount, estimate.currencySymbol)} />
              <div className="flex items-center justify-between border-t border-neutral-200 pt-2">
                <span className="font-bold text-brand-navy dark:text-white">Grand Total</span>
                <span className="text-lg font-bold text-brand-navy dark:text-white">{formatCurrency(grandTotal, estimate.currencySymbol)}</span>
              </div>
            </>
          ) : (
            <>
              <SummaryRow label="Labour" value={formatCurrency(costAdjust.labourCost)} />
              <SummaryRow label="Transport" value={formatCurrency(costAdjust.transportCost)} />
              <SummaryRow label={`Markup (${costAdjust.markupPercentage}%)`} value={formatCurrency(markupAmount)} />
              <SummaryRow label={`Profit (${costAdjust.profitPercentage}%)`} value={formatCurrency(profitAmount)} />
              <SummaryRow label={`Tax/VAT (${costAdjust.taxPercentage}%)`} value={formatCurrency(taxAmount)} />
              <div className="flex items-center justify-between border-t border-neutral-200 pt-2">
                <span className="font-bold text-brand-navy dark:text-white">Additional Costs</span>
                <span className="text-lg font-bold text-brand-navy dark:text-white">{formatCurrency(grandTotal)}</span>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                Add this to your calculator's base material cost for the full project total.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Compare Tab (screeding only — needs structured data) ───
function CompareTab({ current, saved, onSelect, selected }: {
  current: AdvancedEstimateData;
  saved: { id: string; title: string; totalCost: number; currency: string; estimateData: AdvancedEstimateData; createdAt: string }[];
  onSelect: (e: AdvancedEstimateData | null) => void;
  selected: AdvancedEstimateData | null;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-bold text-brand-navy dark:text-white">Cost Comparison</h4>
        <p className="mt-0.5 text-xs text-neutral-500">Compare your current estimate with saved estimates.</p>
      </div>

      {saved.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-neutral-500">Select an estimate to compare:</p>
          <div className="flex flex-wrap gap-2">
            {saved.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(selected === s.estimateData ? null : s.estimateData)}
                className={
                  'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ' +
                  (selected === s.estimateData ? 'border-brand-purple bg-brand-purple text-white' : 'border-neutral-200 text-neutral-600 dark:border-white/10 dark:text-neutral-300 hover:border-neutral-300')
                }
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-white/5">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-white/5">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">Metric</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-neutral-500">Current</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-neutral-500">Saved</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-neutral-500">Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {[
                { label: 'Paint (buckets)', cur: current.paintBuckets, sav: selected.paintBuckets },
                { label: 'Cement (bags)', cur: current.cementBags, sav: selected.cementBags },
                { label: 'Material', cur: current.materialCost, sav: selected.materialCost },
                { label: 'Labour', cur: current.labourCost, sav: selected.labourCost },
                { label: 'Grand Total', cur: current.grandTotal, sav: selected.grandTotal },
              ].map((row) => {
                const diff = row.cur - row.sav;
                return (
                  <tr key={row.label}>
                    <td className="px-3 py-2 font-medium text-brand-navy dark:text-white">{row.label}</td>
                    <td className="px-3 py-2 text-right text-neutral-600">{formatNumber(row.cur)}</td>
                    <td className="px-3 py-2 text-right text-neutral-600">{formatNumber(row.sav)}</td>
                    <td className={'px-3 py-2 text-right font-semibold ' + (diff > 0 ? 'text-red-600' : diff < 0 ? 'text-accent-green' : 'text-neutral-500')}>
                      {diff > 0 ? '+' : ''}{formatNumber(diff)}
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
          <p className="text-sm text-neutral-500">Save estimates first to compare them side by side.</p>
        </div>
      )}
    </div>
  );
}

// ─── AI Assistant Tab ───
function AiTab({ question, setQuestion, onAsk, onRecommend, loading, response, toolLabel }: {
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
      <div className="rounded-lg border border-brand-purple/20 bg-brand-purple/5 p-4">
        <div className="flex items-center gap-2">
          <Bot aria-hidden="true" className="h-4 w-4 text-brand-purple" />
          <h4 className="text-sm font-bold text-brand-navy dark:text-white">AI Powered Recommendations</h4>
        </div>
        <p className="mt-1 text-xs text-neutral-500">Get smart suggestions to reduce waste and lower costs for your {toolLabel.toLowerCase()} project.</p>
        <button
          type="button"
          onClick={onRecommend}
          disabled={loading}
          className="mt-3 flex items-center gap-1.5 rounded-lg bg-brand-purple px-3 py-2 text-xs font-semibold text-white hover:bg-brand-purple/90 disabled:opacity-50"
        >
          {loading ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <Brain aria-hidden="true" className="h-3.5 w-3.5" />}
          Analyze Project & Recommend
        </button>
      </div>

      <div>
        <h4 className="text-sm font-bold text-brand-navy dark:text-white">Ask the AI Assistant</h4>
        <p className="mt-0.5 text-xs text-neutral-500">Ask about calculations, materials, cost saving tips, or construction best practices.</p>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !loading) onAsk(); }}
            placeholder="e.g. How can I reduce material waste?"
            className="input-field flex-1"
          />
          <button type="button" onClick={onAsk} disabled={loading || !question.trim()} className="btn-primary flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50">
            {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Bot aria-hidden="true" className="h-4 w-4" />}
            Ask
          </button>
        </div>
      </div>

      {loading && !response && (
        <div className="flex items-center gap-2 py-4 text-sm text-neutral-500">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Analyzing your project…
        </div>
      )}

      {response && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 dark:border-white/5 dark:bg-white/5 p-4">
          <div className="flex items-start gap-2">
            <Bot aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-purple mt-0.5" />
            <div className="flex-1 text-sm text-neutral-700 dark:text-neutral-200">
              <FormattedAiResponse content={response} />
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-neutral-500">
        Powered by FRELUX AI · Responses are estimates, verify with your supplier
      </p>
    </div>
  );
}

// ─── Saved Tab ───
function SavedTab({ estimates, onDelete, onExport }: {
  estimates: { id: string; title: string; totalCost: number; currency: string; estimateData: AdvancedEstimateData; createdAt: string }[];
  onDelete: (id: string) => void;
  onExport: () => void;
}) {
  if (estimates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
        <p className="text-sm text-neutral-500">No saved estimates yet. Save an estimate to access it later.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {estimates.map((e) => (
        <div key={e.id} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-3 dark:border-white/5 dark:bg-white/5">
          <div>
            <p className="text-sm font-semibold text-brand-navy dark:text-white">{e.title}</p>
            <p className="text-xs text-neutral-500">
              {new Date(e.createdAt).toLocaleDateString()} · {e.currency} {formatNumber(e.totalCost)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onExport} className="rounded p-1.5 text-neutral-500 hover:text-brand-purple" aria-label="Export">
              <Download className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => onDelete(e.id)} className="rounded p-1.5 text-neutral-500 hover:text-red-500" aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Helper Components ───
function NumField({ label, value, onChange, step = 1 }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-neutral-500">{label}</label>
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
    <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-2.5">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-sm font-semibold text-brand-navy dark:text-white">{value}</span>
    </div>
  );
}

// ─── Formatted AI Response (renders markdown-ish content) ───
function FormattedAiResponse({ content }: { content: string }) {
  const sections = content.split(/^## /m);
  return (
    <div className="space-y-3">
      {sections.filter(s => s.trim()).map((section, i) => {
        const lines = section.split('\n');
        const heading = lines[0].trim();
        const body = lines.slice(1).join('\n').trim();
        return (
          <div key={i}>
            {heading && !heading.startsWith('•') && (
              <h4 className="text-sm font-bold text-brand-navy dark:text-white mb-1">{heading}</h4>
            )}
            <div className="text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
              {body || heading}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── PDF Generators ───
function generateQuotationHTML(estimate: AdvancedEstimateData, _saved: { title: string }, _context: string): string {
  const title = `${_saved.title} Estimate`;
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
${estimate.lineItems.map((i) => `<tr><td>${i.label}</td><td>${formatNumber(i.quantity)}</td><td>${i.unit}</td><td>${estimate.currencySymbol}${formatNumber(i.unitPrice)}</td><td>${estimate.currencySymbol}${formatNumber(i.total)}</td></tr>`).join('')}
</tbody></table>
<div class="summary">
<div><span>Material Cost</span><span>${estimate.currencySymbol}${formatNumber(estimate.materialCost)}</span></div>
<div><span>Labour Cost</span><span>${estimate.currencySymbol}${formatNumber(estimate.labourCost)}</span></div>
<div><span>Transport</span><span>${estimate.currencySymbol}${formatNumber(estimate.transportCost)}</span></div>
<div><span>Waste (${estimate.wastePercentage}%)</span><span>${estimate.currencySymbol}${formatNumber(estimate.wasteAmount)}</span></div>
${estimate.markupAmount > 0 ? `<div><span>Markup (${estimate.markupPercentage}%)</span><span>${estimate.currencySymbol}${formatNumber(estimate.markupAmount)}</span></div>` : ''}
${estimate.profitAmount > 0 ? `<div><span>Profit (${estimate.profitPercentage}%)</span><span>${estimate.currencySymbol}${formatNumber(estimate.profitAmount)}</span></div>` : ''}
<div><span>Tax/VAT (${estimate.taxPercentage}%)</span><span>${estimate.currencySymbol}${formatNumber(estimate.taxAmount)}</span></div>
<div class="grand"><span>Grand Total</span><span>${estimate.currencySymbol}${formatNumber(estimate.grandTotal)}</span></div>
</div>
<div class="footer"><p>This quotation is an estimate. Actual costs may vary based on site conditions and market prices.</p><p>Generated by FRELUX Advanced Calculator — AI Powered</p></div>
</body></html>`;
}

function generateAiQuotationHTML(toolLabel: string, contextSummary: string, aiBreakdown: string | null, costAdjust: { labourCost: number; transportCost: number; wastePercentage: number; markupPercentage: number; profitPercentage: number; taxPercentage: number }): string {
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
<div class="header"><h1>FRELUX — ${toolLabel}</h1><p>AI-Powered Advanced Analysis</p><p>${new Date().toLocaleDateString()}</p></div>
<div class="section"><h2>Calculator Results</h2><p>${contextSummary.replace(/</g, '&lt;')}</p></div>
${aiBreakdown ? `<div class="section"><h2>AI Analysis</h2><p>${aiBreakdown.replace(/</g, '&lt;')}</p></div>` : ''}
<div class="costs">
<h2>Cost Adjustments</h2>
<div><span>Labour</span><span>₦${formatNumber(costAdjust.labourCost)}</span></div>
<div><span>Transport</span><span>₦${formatNumber(costAdjust.transportCost)}</span></div>
<div><span>Waste</span><span>${costAdjust.wastePercentage}%</span></div>
<div><span>Markup</span><span>${costAdjust.markupPercentage}%</span></div>
<div><span>Profit</span><span>${costAdjust.profitPercentage}%</span></div>
<div><span>Tax/VAT</span><span>${costAdjust.taxPercentage}%</span></div>
</div>
<div class="footer"><p>This analysis is AI-generated. Actual costs may vary based on site conditions and market prices.</p><p>Generated by FRELUX Advanced Calculator — AI Powered</p></div>
</body></html>`;
}
