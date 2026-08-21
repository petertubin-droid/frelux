import { useState, useEffect, useMemo } from 'react';
import {
  Bot, Save, Copy, Download, Trash2,
  TrendingUp, ShoppingBag, Loader2,
  Layers, Percent, DollarSign, Calculator,
} from 'lucide-react';
import { calculateAdvancedEstimate, type AdvancedCalcInput } from '@/lib/calc';
import { formatCurrency, formatNumber } from '@/lib/utils';
import {
  saveAdvancedEstimate, fetchAdvancedEstimates, deleteAdvancedEstimate,
} from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import type { AdvancedEstimateData, ScreedingMixConfig } from '@/types';

interface Props {
  netArea: number;
  config: ScreedingMixConfig;
  clientHash: string;
}

type Tab = 'breakdown' | 'mix' | 'costs' | 'compare' | 'ai' | 'saved';

export function AdvancedCalculator({ netArea, config, clientHash }: Props) {
  const [tab, setTab] = useState<Tab>('breakdown');
  const [savedEstimates, setSavedEstimates] = useState<{ id: string; title: string; totalCost: number; currency: string; estimateData: AdvancedEstimateData; createdAt: string }[]>([]);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [compareEstimate, setCompareEstimate] = useState<AdvancedEstimateData | null>(null);

  const [input, setInput] = useState<AdvancedCalcInput>({
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

  const estimate = useMemo(() => calculateAdvancedEstimate(input), [input]);

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

  function update<K extends keyof AdvancedCalcInput>(key: K, value: AdvancedCalcInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaveStatus('saving');
    const title = saveTitle || `Estimate ${new Date().toLocaleDateString()}`;
    const { id, error } = await saveAdvancedEstimate({
      clientHash,
      toolKey: 'advanced_calculator',
      title,
      projectType: 'screeding',
      estimateData: estimate as unknown as Record<string, unknown>,
      totalCost: estimate.grandTotal,
      currency: estimate.currency,
    });
    if (error) {
      setSaveStatus(`Error: ${error}`);
      return;
    }
    setSaveStatus('saved');
    setSaveTitle('');
    const { data } = await fetchAdvancedEstimates(clientHash);
    setSavedEstimates(data.map((d) => ({
      id: d.id, title: d.title, totalCost: d.total_cost ?? 0, currency: d.currency,
      estimateData: d.estimate_data as unknown as AdvancedEstimateData, createdAt: d.created_at,
    })));
    if (id) setSaveStatus(null);
  }

  async function handleDelete(id: string) {
    await deleteAdvancedEstimate(id);
    setSavedEstimates((prev) => prev.filter((e) => e.id !== id));
  }

  function handleDuplicate() {
    setSaveTitle(estimate.projectType + ' copy');
    setSaveStatus(null);
  }

  function handleExportPDF() {
    const win = window.open('', '_blank');
    if (!win) {
      setSaveStatus('Popup blocked. Please allow popups for this site to export PDF.');
      window.setTimeout(() => setSaveStatus(null), 5000);
      return;
    }
    const html = generateQuotationHTML(estimate, savedEstimates.find((e) => e.estimateData === estimate));
    win.document.write(html);
    win.document.close();
    win.print();
  }

  async function handleAiAsk() {
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    setAiResponse(null);
    try {
      const prompt = `You are a construction cost expert. The user has a wall screeding estimate with these details:
- Net area: ${estimate.netArea} m²
- Thickness: ${estimate.thickness} mm
- Coats: ${estimate.coats}
- Paint: ${estimate.paintBuckets} buckets (20L), cost: ${estimate.currencySymbol}${formatNumber(estimate.lineItems[0].total)}
- Cement: ${estimate.cementBags} bags (40kg), cost: ${estimate.currencySymbol}${formatNumber(estimate.lineItems[1].total)}
- Material cost: ${estimate.currencySymbol}${formatNumber(estimate.materialCost)}
- Labour: ${estimate.currencySymbol}${formatNumber(estimate.labourCost)}
- Transport: ${estimate.currencySymbol}${formatNumber(estimate.transportCost)}
- Grand total: ${estimate.currencySymbol}${formatNumber(estimate.grandTotal)}

Question: ${aiQuestion}

Give a concise, practical answer with specific numbers and recommendations.`;
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
      const prompt = `Review this wall screeding estimate and provide 3-5 specific recommendations to reduce waste and lower costs:
- Area: ${estimate.netArea} m², Thickness: ${estimate.thickness} mm, Coats: ${estimate.coats}
- Paint: ${estimate.paintBuckets} × 20L buckets @ ${estimate.currencySymbol}${formatNumber(input.paintPricePerBucket)}
- Cement: ${estimate.cementBags} × 40kg bags @ ${estimate.currencySymbol}${formatNumber(input.cementPricePerBag)}
- Material: ${estimate.currencySymbol}${formatNumber(estimate.materialCost)}, Labour: ${estimate.currencySymbol}${formatNumber(estimate.labourCost)}
- Waste: ${estimate.wastePercentage}%, Markup: ${estimate.markupPercentage}%, Tax: ${estimate.taxPercentage}%
- Grand total: ${estimate.currencySymbol}${formatNumber(estimate.grandTotal)}

Also flag any unrealistic values or potential issues.`;
      const { data } = await supabase.functions.invoke<{ response?: string; error?: string }>('ai-studio', {
        body: { tool: 'chat', prompt },
      });
      setAiResponse(data?.response || data?.error || 'No response received.');
    } catch {
      setAiResponse('Unable to reach the AI assistant right now.');
    }
    setAiLoading(false);
  }

  const tabs: { key: Tab; label: string; icon: typeof Layers }[] = [
    { key: 'breakdown', label: 'Breakdown', icon: Layers },
    { key: 'mix', label: 'Mix Ratio', icon: Percent },
    { key: 'costs', label: 'Costs', icon: DollarSign },
    { key: 'compare', label: 'Compare', icon: TrendingUp },
    { key: 'ai', label: 'AI Assistant', icon: Bot },
    { key: 'saved', label: 'Saved', icon: Save },
  ];

  return (
    <div className="mt-6 rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-white to-brand-purple/[0.02] p-1">
      <div className="rounded-xl bg-white p-4 sm:p-6 dark:bg-brand-navy-mid dark:bg-brand-navy-mid">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-purple/10">
            <Bot className="h-5 w-5 text-brand-purple" />
          </div>
          <div>
            <h3 className="text-base font-bold text-brand-navy dark:text-white dark:text-white">Advanced Calculator</h3>
            <p className="text-xs text-neutral-400">Detailed breakdown, AI recommendations, PDF export & more</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ' +
                  (tab === t.key ? 'bg-brand-purple text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200')
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="mt-5">
          {tab === 'breakdown' && <BreakdownTab estimate={estimate} input={input} update={update} onSave={handleSave} onDuplicate={handleDuplicate} onExport={handleExportPDF} saveTitle={saveTitle} setSaveTitle={setSaveTitle} saveStatus={saveStatus} />}
          {tab === 'mix' && <MixTab input={input} update={update} config={config} />}
          {tab === 'costs' && <CostsTab input={input} update={update} estimate={estimate} />}
          {tab === 'compare' && <CompareTab current={estimate} saved={savedEstimates} onSelect={setCompareEstimate} selected={compareEstimate} />}
          {tab === 'ai' && <AiTab question={aiQuestion} setQuestion={setAiQuestion} onAsk={handleAiAsk} onRecommend={handleAiRecommendations} loading={aiLoading} response={aiResponse} />}
          {tab === 'saved' && <SavedTab estimates={savedEstimates} onDelete={handleDelete} onExport={handleExportPDF} />}
        </div>
      </div>
    </div>
  );
}

// ─── Breakdown Tab ───
function BreakdownTab({ estimate, input, update, onSave, onDuplicate, onExport, saveTitle, setSaveTitle, saveStatus }: {
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
      <div className="grid gap-4 sm:grid-cols-3">
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
                <td className="px-3 py-2.5 font-medium text-brand-navy dark:text-white dark:text-white">{item.label}</td>
                <td className="px-3 py-2.5 text-right text-neutral-600">{formatNumber(item.quantity)} {item.unit}</td>
                <td className="px-3 py-2.5 text-right text-neutral-600">{formatCurrency(item.unitPrice, estimate.currencySymbol)}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-brand-navy dark:text-white dark:text-white">{formatCurrency(item.total, estimate.currencySymbol)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2">
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
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 dark:border-white/5 dark:bg-white/5 p-4 dark:border-white/5 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-brand-purple" />
          <h4 className="text-sm font-bold text-brand-navy dark:text-white dark:text-white">Material Shopping List</h4>
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
            <Save className="h-4 w-4" /> Save
          </button>
        </div>
        <button type="button" onClick={onDuplicate} className="btn-secondary flex items-center gap-1.5">
          <Copy className="h-4 w-4" /> Duplicate
        </button>
        <button type="button" onClick={onExport} className="btn-secondary flex items-center gap-1.5">
          <Download className="h-4 w-4" /> PDF
        </button>
      </div>
      {saveStatus === 'saving' && <p className="text-xs text-neutral-400">Saving…</p>}
      {saveStatus === 'saved' && <p className="text-xs text-accent-green">Saved successfully.</p>}
      {saveStatus?.startsWith('Error') && <p className="text-xs text-red-600">{saveStatus}</p>}
    </div>
  );
}

// ─── Mix Ratio Tab ───
function MixTab({ input, update, config }: {
  input: AdvancedCalcInput;
  update: <K extends keyof AdvancedCalcInput>(key: K, value: AdvancedCalcInput[K]) => void;
  config: ScreedingMixConfig;
}) {
  const ratios = ['1:1', '2:1', '3:1', '3:2', '4:1'];
  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-bold text-brand-navy dark:text-white dark:text-white">Custom Mix Ratio Editor</h4>
        <p className="mt-0.5 text-xs text-neutral-400">Adjust the paint to cement mix ratio for your wall condition.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ratios.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => update('mixRatio', r)}
              className={
                'rounded-lg border px-4 py-2 text-sm font-semibold transition-all ' +
                (input.mixRatio === r ? 'border-brand-purple bg-brand-purple text-white' : 'border-neutral-200 text-neutral-600 dark:border-white/10 dark:text-neutral-300 hover:border-neutral-300 dark:border-white/5 dark:text-neutral-300 dark:hover:border-white/10')
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

      <div className="grid gap-4 sm:grid-cols-2">
        <NumField label="Paint coverage (m²/L)" value={input.paintCoverageRateM2PerL} onChange={(v) => update('paintCoverageRateM2PerL', v)} step={0.1} />
        <NumField label="Cement ratio (kg/L)" value={input.cementRatioKgPerL} onChange={(v) => update('cementRatioKgPerL', v)} step={0.1} />
        <NumField label="Paint bucket size (L)" value={input.paintBucketSizeL} onChange={(v) => update('paintBucketSizeL', v)} />
        <NumField label="Cement bag size (kg)" value={input.cementBagSizeKg} onChange={(v) => update('cementBagSizeKg', v)} />
      </div>

      <div className="rounded-lg border border-brand-purple/20 bg-brand-purple/5 p-4">
        <p className="text-xs text-neutral-600">
          <span className="font-semibold">Default ratio:</span> {config.defaultMixRatio} · 
          <span className="font-semibold"> Paint:</span> {config.paintBucketSizeL}L buckets · 
          <span className="font-semibold"> Cement:</span> {config.cementBagSizeKg}kg bags
        </p>
      </div>
    </div>
  );
}

// ─── Costs Tab ───
function CostsTab({ input, update, estimate }: {
  input: AdvancedCalcInput;
  update: <K extends keyof AdvancedCalcInput>(key: K, value: AdvancedCalcInput[K]) => void;
  estimate: AdvancedEstimateData;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumField label="Labour rate (per m²)" value={input.labourRatePerSqm} onChange={(v) => update('labourRatePerSqm', v)} />
        <NumField label="Transport cost" value={input.transportCost} onChange={(v) => update('transportCost', v)} />
      </div>

      <div>
        <h4 className="text-sm font-bold text-brand-navy dark:text-white dark:text-white">Waste Percentage Scenarios</h4>
        <p className="mt-0.5 text-xs text-neutral-400">Compare different waste allowances.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[0, 5, 10, 15, 20, 25].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => update('wastePercentage', w)}
              className={
                'rounded-lg border px-4 py-2 text-sm font-semibold transition-all ' +
                (input.wastePercentage === w ? 'border-brand-purple bg-brand-purple text-white' : 'border-neutral-200 text-neutral-600 dark:border-white/10 dark:text-neutral-300 hover:border-neutral-300 dark:border-white/5 dark:text-neutral-300 dark:hover:border-white/10')
              }
            >
              {w}%
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumField label="Markup (%)" value={input.markupPercentage} onChange={(v) => update('markupPercentage', v)} />
        <NumField label="Profit (%)" value={input.profitPercentage} onChange={(v) => update('profitPercentage', v)} />
        <NumField label="Tax/VAT (%)" value={input.taxPercentage} onChange={(v) => update('taxPercentage', v)} />
      </div>

      <div className="rounded-lg border border-neutral-200 p-4 dark:border-white/5">
        <h4 className="text-sm font-bold text-brand-navy dark:text-white dark:text-white">Cost Summary</h4>
        <div className="mt-3 space-y-2 text-sm">
          <SummaryRow label="Materials" value={formatCurrency(estimate.materialCost, estimate.currencySymbol)} />
          <SummaryRow label="Labour" value={formatCurrency(estimate.labourCost, estimate.currencySymbol)} />
          <SummaryRow label="Transport" value={formatCurrency(estimate.transportCost, estimate.currencySymbol)} />
          <SummaryRow label="Waste" value={formatCurrency(estimate.wasteAmount, estimate.currencySymbol)} />
          <SummaryRow label="Markup" value={formatCurrency(estimate.markupAmount, estimate.currencySymbol)} />
          <SummaryRow label="Profit" value={formatCurrency(estimate.profitAmount, estimate.currencySymbol)} />
          <SummaryRow label="Tax/VAT" value={formatCurrency(estimate.taxAmount, estimate.currencySymbol)} />
          <div className="flex items-center justify-between border-t border-neutral-200 pt-2">
            <span className="font-bold text-brand-navy dark:text-white">Grand Total</span>
            <span className="text-lg font-bold text-brand-navy dark:text-white">{formatCurrency(estimate.grandTotal, estimate.currencySymbol)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Compare Tab ───
function CompareTab({ current, saved, onSelect, selected }: {
  current: AdvancedEstimateData;
  saved: { id: string; title: string; totalCost: number; currency: string; estimateData: AdvancedEstimateData; createdAt: string }[];
  onSelect: (e: AdvancedEstimateData | null) => void;
  selected: AdvancedEstimateData | null;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-bold text-brand-navy dark:text-white dark:text-white">Cost Comparison</h4>
        <p className="mt-0.5 text-xs text-neutral-400">Compare your current estimate with saved estimates or different material brands.</p>
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
                  (selected === s.estimateData ? 'border-brand-purple bg-brand-purple text-white' : 'border-neutral-200 text-neutral-600 dark:border-white/10 dark:text-neutral-300 hover:border-neutral-300 dark:border-white/5 dark:text-neutral-300 dark:hover:border-white/10')
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
                    <td className="px-3 py-2 font-medium text-brand-navy dark:text-white dark:text-white">{row.label}</td>
                    <td className="px-3 py-2 text-right text-neutral-600">{formatNumber(row.cur)}</td>
                    <td className="px-3 py-2 text-right text-neutral-600">{formatNumber(row.sav)}</td>
                    <td className={'px-3 py-2 text-right font-semibold ' + (diff > 0 ? 'text-red-600' : diff < 0 ? 'text-accent-green' : 'text-neutral-400')}>
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

// ─── AI Tab ───
function AiTab({ question, setQuestion, onAsk, onRecommend, loading, response }: {
  question: string;
  setQuestion: (v: string) => void;
  onAsk: () => void;
  onRecommend: () => void;
  loading: boolean;
  response: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-brand-purple/20 bg-brand-purple/5 p-4">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-brand-purple" />
          <h4 className="text-sm font-bold text-brand-navy dark:text-white dark:text-white">AI Powered Recommendations</h4>
        </div>
        <p className="mt-1 text-xs text-neutral-500">Get smart suggestions to reduce waste and lower costs.</p>
        <button
          type="button"
          onClick={onRecommend}
          disabled={loading}
          className="mt-3 flex items-center gap-1.5 rounded-lg bg-brand-purple px-3 py-2 text-xs font-semibold text-white hover:bg-brand-purple/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calculator className="h-3.5 w-3.5" />}
          Analyze Estimate & Recommend
        </button>
      </div>

      <div>
        <h4 className="text-sm font-bold text-brand-navy dark:text-white dark:text-white">Ask the AI Assistant</h4>
        <p className="mt-0.5 text-xs text-neutral-400">Ask about calculations, materials, or cost saving tips.</p>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !loading) onAsk(); }}
            placeholder="e.g. How can I reduce cement usage?"
            className="input-field flex-1"
          />
          <button type="button" onClick={onAsk} disabled={loading || !question.trim()} className="btn-primary flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            Ask
          </button>
        </div>
      </div>

      {loading && !response && (
        <div className="flex items-center gap-2 py-4 text-sm text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Analyzing your estimate…
        </div>
      )}

      {response && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 dark:border-white/5 dark:bg-white/5 p-4 dark:border-white/5 dark:bg-white/5">
          <div className="flex items-start gap-2">
            <Bot className="mt-0.5 h-4 w-4 shrink-0 text-brand-purple" />
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-neutral-700">{response}</div>
          </div>
        </div>
      )}
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
        <p className="text-sm text-neutral-500">No saved estimates yet. Save an estimate from the Breakdown tab.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {estimates.map((e) => (
        <div key={e.id} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4">
          <div>
            <p className="text-sm font-semibold text-brand-navy dark:text-white dark:text-white">{e.title}</p>
            <p className="text-xs text-neutral-400">
              {new Date(e.createdAt).toLocaleDateString()} · {formatCurrency(e.totalCost, e.estimateData.currencySymbol)}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onExport} className="rounded-md p-2 text-neutral-400 hover:bg-neutral-100 hover:text-brand-purple">
              <Download className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => onDelete(e.id)} className="rounded-md p-2 text-neutral-400 hover:bg-red-50 hover:text-red-500">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ───
function NumField({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-neutral-600">{label}</span>
      <input
        type="number"
        min={0}
        step={step ?? '0.01'}
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input-field mt-1"
      />
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-2.5">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-sm font-semibold text-brand-navy dark:text-white dark:text-white">{value}</span>
    </div>
  );
}

function generateQuotationHTML(estimate: AdvancedEstimateData, saved?: { title: string } | undefined): string {
  const title = saved?.title || 'Screeding Estimate';
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
<div class="footer"><p>This quotation is an estimate. Actual costs may vary based on site conditions and market prices.</p><p>Generated by FRELUX Advanced Calculator</p></div>
</body></html>`;
}
