import { useState, useCallback } from 'react';
import { useSeo } from '@/lib/seo';
import { calculateBuildToRoof, DEFAULT_PRICES, DEFAULT_LABOUR, DEFAULT_WASTAGE } from '@/lib/estimation/build-to-roof-engine';
import {
  designBeam, designColumn, designSlab,
  type BeamDesignInput, type ColumnDesignInput, type SlabDesignInput,
  type ConcreteGrade, type SteelGrade, type SupportCondition,
  type BeamType, type SlabType,
} from '@/lib/engineering/structural-calculator';
import type { BuildToRoofInput, BuildToRoofResult } from '@/types/build-to-roof';
import {
  Calculator, Building2, AlertTriangle, CheckCircle2, Info, ShieldCheck,
  Loader2, Ruler, Layers, TrendingUp, ChevronRight, ChevronDown,
} from 'lucide-react';
import { SubscriptionGate } from '@/components/subscription/SubscriptionGate';
import { RelatedTools, CALC_LINKS } from '@/components/seo/SeoSections';

type Tab = 'beam' | 'column' | 'slab';

export default function StructuralCalculator() {
  useSeo({
    title: 'Structural Calculator | FRELUX',
    description: 'Engineering-grade beam, column, and slab sizing for Nigerian construction. BS 8110 simplified method with full formula transparency.',
    keywords: 'structural calculator, beam design, column design, slab design, Nigerian construction engineering',
  });

  const [tab, setTab] = useState<Tab>('beam');

  return (
    <SubscriptionGate feature="structural_calculator">
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-brand-navy text-white">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-8 h-8 text-accent-green" />
            <h1 className="text-2xl md:text-3xl font-bold">Structural Engineering Calculator</h1>
          </div>
          <p className="text-white/70 text-sm md:text-base">
            Engineer-grade beam, column, and slab sizing based on BS 8110. Full formula transparency. Preliminary sizing — always verify with a qualified structural engineer.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {([
            { id: 'beam', label: 'Beam Design', icon: Ruler },
            { id: 'column', label: 'Column Design', icon: Layers },
            { id: 'slab', label: 'Slab Design', icon: TrendingUp },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-brand-purple text-white'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'beam' && <BeamCalculator />}
        {tab === 'column' && <ColumnCalculator />}
        {tab === 'slab' && <SlabCalculator />}

        {/* Disclaimer */}
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">Professional Disclaimer</p>
              <p className="text-xs text-amber-700 mt-1">
                These calculations provide preliminary member sizing based on BS 8110 simplified methods.
                They are for budgetary planning and initial design only. A qualified structural engineer
                must verify and approve all structural designs before construction. FRELUX is not liable
                for designs based solely on this tool.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </SubscriptionGate>
  );
}

// ── Beam Calculator ──

function BeamCalculator() {
  const [span, setSpan] = useState(4.5);
  const [beamType, setBeamType] = useState<BeamType>('suspended_beam');
  const [support, setSupport] = useState<SupportCondition>('simply_supported');
  const [liveLoad, setLiveLoad] = useState(2.0);
  const [deadLoad, setDeadLoad] = useState(3.0);
  const [tribWidth, setTribWidth] = useState(3.0);
  const [concreteGrade, setConcreteGrade] = useState<ConcreteGrade>('C25');
  const [steelGrade, setSteelGrade] = useState<SteelGrade>('Fe500');
  const [cover, setCover] = useState(25);
  const [result, setResult] = useState<ReturnType<typeof designBeam> | null>(null);
  const [showFormulas, setShowFormulas] = useState(false);

  const calculate = useCallback(() => {
    const input: BeamDesignInput = {
      span, beam_type: beamType, support_condition: support,
      live_load: liveLoad, dead_load: deadLoad, tributary_width: tribWidth,
      concrete_grade: concreteGrade, steel_grade: steelGrade, cover_mm: cover,
    };
    setResult(designBeam(input));
  }, [span, beamType, support, liveLoad, deadLoad, tribWidth, concreteGrade, steelGrade, cover]);

  if (!result) { calculate(); }

  return (
    <div className="space-y-6">
      <InputGrid>
        <NumInput label="Span (m)" value={span} onChange={setSpan} step="0.1" />
        <SelectInput label="Beam type" value={beamType} onChange={v => setBeamType(v as BeamType)} options={[
          { v: 'ground_beam', l: 'Ground Beam' },
          { v: 'suspended_beam', l: 'Suspended Beam' },
          { v: 'ring_beam', l: 'Ring Beam' },
          { v: 'lintel', l: 'Lintel' },
        ]} />
        <SelectInput label="Support condition" value={support} onChange={v => setSupport(v as SupportCondition)} options={[
          { v: 'simply_supported', l: 'Simply Supported' },
          { v: 'fixed', l: 'Fixed Ends' },
          { v: 'continuous', l: 'Continuous' },
          { v: 'cantilever', l: 'Cantilever' },
        ]} />
        <NumInput label="Live load (kN/m²)" value={liveLoad} onChange={setLiveLoad} step="0.5" />
        <NumInput label="Dead load (kN/m²)" value={deadLoad} onChange={setDeadLoad} step="0.5" />
        <NumInput label="Tributary width (m)" value={tribWidth} onChange={setTribWidth} step="0.5" />
        <SelectInput label="Concrete grade" value={concreteGrade} onChange={v => setConcreteGrade(v as ConcreteGrade)} options={[
          { v: 'C20', l: 'C20 (20 MPa)' },
          { v: 'C25', l: 'C25 (25 MPa)' },
          { v: 'C30', l: 'C30 (30 MPa)' },
          { v: 'C35', l: 'C35 (35 MPa)' },
        ]} />
        <SelectInput label="Steel grade" value={steelGrade} onChange={v => setSteelGrade(v as SteelGrade)} options={[
          { v: 'Fe410', l: 'Fe410 (410 MPa)' },
          { v: 'Fe500', l: 'Fe500 (500 MPa)' },
        ]} />
        <NumInput label="Cover (mm)" value={cover} onChange={setCover} step="5" />
      </InputGrid>

      <button onClick={calculate} className="inline-flex items-center gap-2 rounded-lg bg-brand-purple px-6 py-3 text-sm font-bold text-white hover:bg-brand-purple-dark">
        <Calculator className="w-4 h-4" /> Calculate Beam
      </button>

      {result && (
        <ResultCard>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <StatBox label="Recommended Size" value={`${result.recommended_width} × ${result.recommended_depth}`} unit="mm" />
            <StatBox label="Main Bars" value={`${result.recommended_bar_count}Y${result.recommended_bar_diameter}`} unit="" />
            <StatBox label="Links" value={`Y${result.link_diameter} @ ${result.link_spacing}mm`} unit="" />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <CheckRow label="Shear Check" pass={result.shear_check_pass} value={`${result.shear_capacity} kN ≥ ${result.max_shear.toFixed(1)} kN`} />
            <CheckRow label="Deflection Check" pass={result.deflection_check_pass} value={`L/d = ${result.span_to_depth}`} />
          </div>

          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <DetailItem label="Design load" value={`${result.factored_load.toFixed(2)} kN/m`} />
            <DetailItem label="Max moment" value={`${result.max_moment.toFixed(2)} kN·m`} />
            <DetailItem label="Max shear" value={`${result.max_shear.toFixed(2)} kN`} />
            <DetailItem label="Steel area" value={`${result.area_steel_required} mm²`} />
            <DetailItem label="Min steel" value={`${result.min_steel_area} mm²`} />
            <DetailItem label="Effective span" value={`${result.effective_span.toFixed(2)} m`} />
          </div>

          {result.warnings.length > 0 && (
            <WarningList warnings={result.warnings} />
          )}

          <FormulaToggle show={showFormulas} setShow={setShowFormulas} formulas={result.formula_transparency} />
        </ResultCard>
      )}
      <RelatedTools links={[
        CALC_LINKS.foundationCalc,
        CALC_LINKS.buildToRoof,
        CALC_LINKS.constructionSeq,
        CALC_LINKS.imageEstimator,
        CALC_LINKS.costEstimator,
      ]} />
    </div>
  );
}

// ── Column Calculator ──

function ColumnCalculator() {
  const [axialLoad, setAxialLoad] = useState(200);
  const [height, setHeight] = useState(3.0);
  const [concreteGrade, setConcreteGrade] = useState<ConcreteGrade>('C25');
  const [steelGrade, setSteelGrade] = useState<SteelGrade>('Fe500');
  const [cover, setCover] = useState(25);
  const [isRect, setIsRect] = useState(true);
  const [result, setResult] = useState<ReturnType<typeof designColumn> | null>(null);
  const [showFormulas, setShowFormulas] = useState(false);

  const calculate = useCallback(() => {
    const input: ColumnDesignInput = {
      axial_load: axialLoad, height, concrete_grade: concreteGrade,
      steel_grade: steelGrade, cover_mm: cover, is_rectangular: isRect,
      unbraced_height_ratio: 0,
    };
    setResult(designColumn(input));
  }, [axialLoad, height, concreteGrade, steelGrade, cover, isRect]);

  if (!result) calculate();

  return (
    <div className="space-y-6">
      <InputGrid>
        <NumInput label="Axial load (kN)" value={axialLoad} onChange={setAxialLoad} step="10" />
        <NumInput label="Height (m)" value={height} onChange={setHeight} step="0.1" />
        <SelectInput label="Concrete grade" value={concreteGrade} onChange={v => setConcreteGrade(v as ConcreteGrade)} options={[
          { v: 'C20', l: 'C20 (20 MPa)' },
          { v: 'C25', l: 'C25 (25 MPa)' },
          { v: 'C30', l: 'C30 (30 MPa)' },
          { v: 'C35', l: 'C35 (35 MPa)' },
        ]} />
        <SelectInput label="Steel grade" value={steelGrade} onChange={v => setSteelGrade(v as SteelGrade)} options={[
          { v: 'Fe410', l: 'Fe410 (410 MPa)' },
          { v: 'Fe500', l: 'Fe500 (500 MPa)' },
        ]} />
        <NumInput label="Cover (mm)" value={cover} onChange={setCover} step="5" />
        <SelectInput label="Section shape" value={isRect ? 'rect' : 'circular'} onChange={v => setIsRect(v === 'rect')} options={[
          { v: 'rect', l: 'Rectangular' },
          { v: 'circular', l: 'Circular' },
        ]} />
      </InputGrid>

      <button onClick={calculate} className="inline-flex items-center gap-2 rounded-lg bg-brand-purple px-6 py-3 text-sm font-bold text-white hover:bg-brand-purple-dark">
        <Calculator className="w-4 h-4" /> Calculate Column
      </button>

      {result && (
        <ResultCard>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <StatBox label={isRect ? "Section Size" : "Diameter"} value={`${result.recommended_width} × ${result.recommended_depth}`} unit="mm" />
            <StatBox label="Main Bars" value={`${result.recommended_bar_count}Y${result.recommended_bar_diameter}`} unit="" />
            <StatBox label="Links" value={`Y${result.link_diameter} @ ${result.link_spacing}mm`} unit="" />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <CheckRow label="Capacity Check" pass={result.capacity_check_pass} value={`${result.load_capacity} kN ≥ ${result.factored_load.toFixed(1)} kN`} />
            <CheckRow label="Slenderness" pass={result.slenderness_check} value={result.short_or_slender === 'short' ? 'Short column ✓' : 'Slender — needs detailed analysis'} />
          </div>

          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <DetailItem label="Factored load" value={`${result.factored_load.toFixed(1)} kN`} />
            <DetailItem label="Required area" value={`${result.required_area} mm²`} />
            <DetailItem label="Steel ratio" value={`${result.steel_ratio}%`} />
            <DetailItem label="Min ratio" value={`${result.min_steel_ratio}%`} />
            <DetailItem label="Max ratio" value={`${result.max_steel_ratio}%`} />
            <DetailItem label="Load capacity" value={`${result.load_capacity} kN`} />
          </div>

          {result.warnings.length > 0 && <WarningList warnings={result.warnings} />}
          <FormulaToggle show={showFormulas} setShow={setShowFormulas} formulas={result.formula_transparency} />
        </ResultCard>
      )}
    </div>
  );
}

// ── Slab Calculator ──

function SlabCalculator() {
  const [spanX, setSpanX] = useState(4.0);
  const [spanY, setSpanY] = useState(6.0);
  const [slabType, setSlabType] = useState<SlabType>('one_way');
  const [support, setSupport] = useState<SupportCondition>('simply_supported');
  const [liveLoad, setLiveLoad] = useState(2.0);
  const [deadLoad, setDeadLoad] = useState(1.5);
  const [concreteGrade, setConcreteGrade] = useState<ConcreteGrade>('C25');
  const [steelGrade, setSteelGrade] = useState<SteelGrade>('Fe500');
  const [cover, setCover] = useState(20);
  const [result, setResult] = useState<ReturnType<typeof designSlab> | null>(null);
  const [showFormulas, setShowFormulas] = useState(false);

  const calculate = useCallback(() => {
    const input: SlabDesignInput = {
      span_x: spanX, span_y: spanY, slab_type: slabType, support_condition: support,
      live_load: liveLoad, dead_load: deadLoad, concrete_grade: concreteGrade,
      steel_grade: steelGrade, cover_mm: cover,
    };
    setResult(designSlab(input));
  }, [spanX, spanY, slabType, support, liveLoad, deadLoad, concreteGrade, steelGrade, cover]);

  if (!result) calculate();

  return (
    <div className="space-y-6">
      <InputGrid>
        <NumInput label="Short span (m)" value={spanX} onChange={setSpanX} step="0.1" />
        <NumInput label="Long span (m)" value={spanY} onChange={setSpanY} step="0.1" />
        <SelectInput label="Slab type" value={slabType} onChange={v => setSlabType(v as SlabType)} options={[
          { v: 'one_way', l: 'One-way' },
          { v: 'two_way', l: 'Two-way' },
          { v: 'cantilever_slab', l: 'Cantilever' },
        ]} />
        <SelectInput label="Support condition" value={support} onChange={v => setSupport(v as SupportCondition)} options={[
          { v: 'simply_supported', l: 'Simply Supported' },
          { v: 'fixed', l: 'Fixed' },
          { v: 'continuous', l: 'Continuous' },
          { v: 'cantilever', l: 'Cantilever' },
        ]} />
        <NumInput label="Live load (kN/m²)" value={liveLoad} onChange={setLiveLoad} step="0.5" />
        <NumInput label="Dead load (kN/m²)" value={deadLoad} onChange={setDeadLoad} step="0.5" />
        <SelectInput label="Concrete grade" value={concreteGrade} onChange={v => setConcreteGrade(v as ConcreteGrade)} options={[
          { v: 'C20', l: 'C20 (20 MPa)' },
          { v: 'C25', l: 'C25 (25 MPa)' },
          { v: 'C30', l: 'C30 (30 MPa)' },
        ]} />
        <SelectInput label="Steel grade" value={steelGrade} onChange={v => setSteelGrade(v as SteelGrade)} options={[
          { v: 'Fe410', l: 'Fe410' },
          { v: 'Fe500', l: 'Fe500' },
        ]} />
        <NumInput label="Cover (mm)" value={cover} onChange={setCover} step="5" />
      </InputGrid>

      <button onClick={calculate} className="inline-flex items-center gap-2 rounded-lg bg-brand-purple px-6 py-3 text-sm font-bold text-white hover:bg-brand-purple-dark">
        <Calculator className="w-4 h-4" /> Calculate Slab
      </button>

      {result && (
        <ResultCard>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <StatBox label="Thickness" value={`${result.recommended_thickness}`} unit="mm" />
            <StatBox label="Main Bars" value={`Y${result.recommended_bar_diameter} @ ${result.recommended_bar_spacing}mm c/c`} unit="" />
            <StatBox label="Total Load" value={`${result.total_load}`} unit="kN/m²" />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <CheckRow label="Deflection Check" pass={result.deflection_check_pass} value={`L/d = ${result.span_to_depth}`} />
            <CheckRow label="Shear" pass={result.link_check.includes('No shear')} value={result.link_check} />
          </div>

          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <DetailItem label="Self weight" value={`${result.self_weight} kN/m²`} />
            <DetailItem label="Max moment" value={`${result.max_moment} kN·m/m`} />
            <DetailItem label="Max shear" value={`${result.max_shear} kN/m`} />
            <DetailItem label="Steel area" value={`${result.steel_area_required} mm²/m`} />
            <DetailItem label="Required thickness" value={`${result.required_thickness} mm`} />
            <DetailItem label="Slab type" value={result.slab_type.replace(/_/g, ' ')} />
          </div>

          {result.warnings.length > 0 && <WarningList warnings={result.warnings} />}
          <FormulaToggle show={showFormulas} setShow={setShowFormulas} formulas={result.formula_transparency} />
        </ResultCard>
      )}
    </div>
  );
}

// ── Shared UI components ──

function InputGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{children}</div>;
}

function NumInput({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-neutral-500 mb-1 block">{label}</label>
      <input type="number" value={value} step={step} onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full rounded-lg border border-neutral-200 px-2.5 py-2 text-sm text-neutral-900 focus:border-brand-purple focus:outline-none" />
    </div>
  );
}

function SelectInput({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div>
      <label className="text-xs font-medium text-neutral-500 mb-1 block">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-200 px-2.5 py-2 text-sm text-neutral-900 focus:border-brand-purple focus:outline-none">
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function ResultCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-neutral-200 bg-white shadow-card p-6">{children}</div>;
}

function StatBox({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl bg-brand-navy p-4 text-white">
      <p className="text-xs text-white/60 mb-1">{label}</p>
      <p className="text-xl font-bold">{value} {unit && <span className="text-sm text-white/60">{unit}</span>}</p>
    </div>
  );
}

function CheckRow({ label, pass, value }: { label: string; pass: boolean; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3">
      {pass ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />}
      <div>
        <p className="text-xs font-medium text-neutral-500">{label}</p>
        <p className="text-sm text-neutral-900">{value}</p>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-neutral-50 py-1.5">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-900">{value}</span>
    </div>
  );
}

function WarningList({ warnings }: { warnings: string[] }) {
  return (
    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs font-medium text-amber-700 mb-1">⚠️ Warnings</p>
      <ul className="space-y-1">
        {warnings.map((w, i) => <li key={i} className="text-xs text-amber-600">• {w}</li>)}
      </ul>
    </div>
  );
}

function FormulaToggle({ show, setShow, formulas }: { show: boolean; setShow: (v: boolean) => void; formulas: string[] }) {
  return (
    <div className="mt-4">
      <button onClick={() => setShow(!show)} className="text-xs font-medium text-brand-purple hover:text-brand-purple-dark flex items-center gap-1">
        {show ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {show ? 'Hide' : 'Show'} calculation formulas
      </button>
      {show && (
        <div className="mt-2 rounded-lg bg-neutral-900 p-4 space-y-1">
          {formulas.map((f, i) => <p key={i} className="text-xs font-mono text-green-400">{f}</p>)}
        </div>
      )}
    </div>
  );
}
