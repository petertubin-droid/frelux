import { useState, useCallback } from 'react';
import { useSeo } from '@/lib/seo';
import {
  designFoundation, SOIL_BEARING_CAPACITY, SOIL_DESCRIPTIONS,
  type FoundationDesignInput, type SoilType, type FoundationShape,
} from '@/lib/engineering/foundation-calculator';
import {
  Layers, AlertTriangle, CheckCircle2, ShieldCheck, Calculator,
  ChevronRight, ChevronDown, Building2,
} from 'lucide-react';
import { SubscriptionGate } from '@/components/subscription/SubscriptionGate';
import { RelatedTools, CALC_LINKS } from '@/components/seo/SeoSections';
import RelatedToolsLinks from '@/components/ui/RelatedToolsLinks';
import { monitoredCalc } from '@/lib/calculator-monitor';

export default function FoundationCalculator() {
  useSeo({
    title: 'Foundation Design Calculator | FRELUX',
    description: 'Calculate strip, pad, and raft foundation sizes based on soil bearing capacity. Nigerian soil types with BS 8004 simplified methods.',
    keywords: 'foundation calculator, strip footing, pad footing, raft foundation, soil bearing capacity Nigeria',
  });

  const [shape, setShape] = useState<FoundationShape>('strip');
  const [soilType, setSoilType] = useState<SoilType>('lateritic');
  const [customBearing, setCustomBearing] = useState(150);
  const [wallLoad, setWallLoad] = useState(40);
  const [columnLoad, setColumnLoad] = useState(200);
  const [depth, setDepth] = useState(0.9);
  const [buildingLength, setBuildingLength] = useState(15);
  const [buildingWidth, setBuildingWidth] = useState(10);
  const [measurementUnit, setMeasurementUnit] = useState<'m' | 'ft'>('m');
  const [result, setResult] = useState<ReturnType<typeof designFoundation> | null>(null);
  const [showFormulas, setShowFormulas] = useState(false);

  const calculate = useCallback(() => {
    const mPerFt = 0.3048;
    const input: FoundationDesignInput = {
      shape, soil_type: soilType,
      custom_bearing_capacity: soilType === 'custom' ? customBearing : undefined,
      wall_load: wallLoad,
      column_load: shape === 'pad' ? columnLoad : undefined,
      foundation_depth: measurementUnit === 'ft' ? depth * mPerFt : depth,
      concrete_grade: 'C25',
      building_length: measurementUnit === 'ft' ? buildingLength * mPerFt : buildingLength,
      building_width: measurementUnit === 'ft' ? buildingWidth * mPerFt : buildingWidth,
    };
    setResult(monitoredCalc('Foundation Calculator', () => designFoundation(input)));
  }, [shape, soilType, customBearing, wallLoad, columnLoad, depth, buildingLength, buildingWidth, measurementUnit]);

  if (!result) calculate();

  return (
    <SubscriptionGate feature="foundation_calculator">
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-brand-navy text-white">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-2">
            <Layers className="w-8 h-8 text-accent-green" />
            <h1 className="text-2xl md:text-3xl font-bold">Foundation Design Calculator</h1>
          </div>
          <p className="text-white/70 text-sm md:text-base">
            Strip, pad, and raft foundation sizing based on soil bearing capacity. BS 8004 simplified method.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Inputs */}
        <div className="calc-card rounded-2xl border border-neutral-200 bg-white shadow-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-medium text-neutral-500">Measurement unit:</span>
            <div className="inline-flex rounded-lg border border-neutral-200 overflow-hidden">
              <button onClick={() => {
                if (measurementUnit === 'ft') {
                  setMeasurementUnit('m');
                  setDepth(parseFloat((depth * 0.3048).toFixed(2)));
                  setBuildingLength(parseFloat((buildingLength * 0.3048).toFixed(2)));
                  setBuildingWidth(parseFloat((buildingWidth * 0.3048).toFixed(2)));
                }
              }} className={`px-3 py-1 text-xs font-medium ${measurementUnit === 'm' ? 'bg-brand-purple text-white' : 'text-neutral-500'}`}>m</button>
              <button onClick={() => {
                if (measurementUnit === 'm') {
                  setMeasurementUnit('ft');
                  setDepth(parseFloat((depth / 0.3048).toFixed(2)));
                  setBuildingLength(parseFloat((buildingLength / 0.3048).toFixed(2)));
                  setBuildingWidth(parseFloat((buildingWidth / 0.3048).toFixed(2)));
                }
              }} className={`px-3 py-1 text-xs font-medium ${measurementUnit === 'ft' ? 'bg-brand-purple text-white' : 'text-neutral-500'}`}>ft</button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Foundation type</label>
              <select value={shape} onChange={e => setShape(e.target.value as FoundationShape)}
                className="input-field">
                <option value="strip">Strip Footing (walls)</option>
                <option value="pad">Pad Footing (columns)</option>
                <option value="raft">Raft Foundation</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Soil type</label>
              <select value={soilType} onChange={e => setSoilType(e.target.value as SoilType)}
                className="input-field">
                {(Object.keys(SOIL_BEARING_CAPACITY) as SoilType[]).map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            {soilType === 'custom' && (
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Bearing capacity (kN/m²)</label>
                <input type="number" value={customBearing} onChange={e => setCustomBearing(parseFloat(e.target.value) || 0)}
                  className="input-field" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">{shape === 'pad' ? 'Column load (kN)' : 'Wall load (kN/m)'}</label>
              <input type="number" value={shape === 'pad' ? columnLoad : wallLoad}
                onChange={e => shape === 'pad' ? setColumnLoad(parseFloat(e.target.value) || 0) : setWallLoad(parseFloat(e.target.value) || 0)}
                className="input-field" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Foundation depth ({measurementUnit})</label>
              <input type="number" value={depth} step="0.1" onChange={e => setDepth(parseFloat(e.target.value) || 0)}
                className="input-field" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Building length ({measurementUnit})</label>
              <input type="number" value={buildingLength} step="0.5" onChange={e => setBuildingLength(parseFloat(e.target.value) || 0)}
                className="input-field" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Building width ({measurementUnit})</label>
              <input type="number" value={buildingWidth} step="0.5" onChange={e => setBuildingWidth(parseFloat(e.target.value) || 0)}
                className="input-field" />
            </div>
          </div>

          {/* Soil description */}
          <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-3 flex items-start gap-2">
            <Building2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700">{SOIL_DESCRIPTIONS[soilType]}</p>
          </div>

          <button onClick={calculate}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-purple px-6 py-3 text-sm font-bold text-white hover:bg-brand-purple-dark">
            <Calculator className="w-4 h-4" /> Calculate Foundation
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="calc-card rounded-2xl border border-neutral-200 bg-white shadow-card p-6">
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {result.shape !== 'raft' && (
                <div className="rounded-xl bg-brand-navy p-4 text-white">
                  <p className="text-xs text-white/60 mb-1">{result.shape === 'pad' ? 'Pad Size' : 'Footing Width'}</p>
                  <p className="text-xl font-bold">
                    {result.shape === 'pad'
                      ? `${result.recommended_width} × ${result.recommended_length} mm`
                      : `${result.recommended_width} mm`}
                  </p>
                </div>
              )}
              <div className="rounded-xl bg-brand-navy p-4 text-white">
                <p className="text-xs text-white/60 mb-1">Allowable Bearing</p>
                <p className="text-xl font-bold">{result.bearing_capacity} <span className="text-sm text-white/60">kN/m²</span></p>
              </div>
              <div className="rounded-xl bg-brand-navy p-4 text-white">
                <p className="text-xs text-white/60 mb-1">Factor of Safety</p>
                <p className="text-xl font-bold">{result.factor_of_safety}</p>
              </div>
            </div>

            {/* Bearing check */}
            <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3 mb-4">
              {result.bearing_check_pass
                ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                : <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />}
              <div>
                <p className="text-xs font-medium text-neutral-500">Bearing Capacity Check</p>
                <p className="text-sm text-neutral-900">
                  Applied: {result.applied_pressure} kN/m² ≤ Allowable: {result.bearing_capacity} kN/m²
                </p>
              </div>
            </div>

            {/* Volumes */}
            <div className="grid md:grid-cols-4 gap-3 text-sm">
              <div className="flex justify-between border-b border-neutral-50 py-1.5">
                <span className="text-neutral-500">Excavation</span>
                <span className="font-medium text-neutral-900">{result.excavation_volume} m³</span>
              </div>
              <div className="flex justify-between border-b border-neutral-50 py-1.5">
                <span className="text-neutral-500">Concrete</span>
                <span className="font-medium text-neutral-900">{result.concrete_volume} m³</span>
              </div>
              <div className="flex justify-between border-b border-neutral-50 py-1.5">
                <span className="text-neutral-500">Blinding</span>
                <span className="font-medium text-neutral-900">{result.blinding_volume} m³</span>
              </div>
              <div className="flex justify-between border-b border-neutral-50 py-1.5">
                <span className="text-neutral-500">Hardcore</span>
                <span className="font-medium text-neutral-900">{result.hardcore_volume} m³</span>
              </div>
            </div>

            {result.warnings.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-medium text-amber-700 mb-1">⚠️ Warnings</p>
                <ul className="space-y-1">
                  {result.warnings.map((w, i) => <li key={i} className="text-xs text-amber-600">• {w}</li>)}
                </ul>
              </div>
            )}

            {/* Formula transparency */}
            <div className="mt-4">
              <button onClick={() => setShowFormulas(!showFormulas)}
                className="text-xs font-medium text-brand-purple hover:text-brand-purple-dark flex items-center gap-1">
                {showFormulas ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                {showFormulas ? 'Hide' : 'Show'} calculation formulas
              </button>
              {showFormulas && (
                <div className="mt-2 rounded-lg bg-neutral-900 p-4 space-y-1">
                  {result.formula_transparency.map((f, i) => <p key={i} className="text-xs font-mono text-green-400">{f}</p>)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">Geotechnical Disclaimer</p>
              <p className="text-xs text-amber-700 mt-1">
                Soil bearing capacities shown are typical values for Nigerian soil types. A geotechnical
                investigation (soil test) is mandatory for actual foundation design. These calculations
                are for preliminary sizing and budgetary purposes only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
      <RelatedTools links={[
        CALC_LINKS.structuralCalc,
        CALC_LINKS.buildToRoof,
        CALC_LINKS.constructionSeq,
        CALC_LINKS.imageEstimator,
        CALC_LINKS.costEstimator,
      ]} />
        <RelatedToolsLinks />
    </SubscriptionGate>
  );
}
