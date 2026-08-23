import { useState, useMemo, useCallback } from 'react';
import { useSeo } from '@/lib/seo';
import {
  Building2, ChevronRight, ChevronLeft, Calculator, Upload, FileText,
  CheckCircle2, AlertTriangle, Info, Package, Users, DollarSign,
  TrendingUp, ShieldCheck, Layers, Home, Ruler, Hammer, FolderOpen,
  Download, Printer, ArrowRight, Settings,
} from 'lucide-react';
import {
  calculateBuildToRoof,
  DEFAULT_PRICES,
  DEFAULT_LABOUR,
  DEFAULT_WASTAGE,
} from '@/lib/estimation/build-to-roof-engine';
import type {
  BuildToRoofInput, BuildToRoofResult, BuildingType, FoundationType,
  RoofType, BlockSize, RoofingMaterial, OpeningInput, StructuralMemberInput,
} from '@/types/build-to-roof';
import { formatCurrency, formatNumber } from '@/lib/utils';

const STEPS = [
  { id: 'project', label: 'Project', icon: Home },
  { id: 'dimensions', label: 'Dimensions', icon: Ruler },
  { id: 'openings', label: 'Openings', icon: FolderOpen },
  { id: 'foundation', label: 'Foundation', icon: Layers },
  { id: 'blocks', label: 'Blocks & Mix', icon: Settings },
  { id: 'roof', label: 'Roof', icon: Building2 },
  { id: 'structural', label: 'Structural', icon: Hammer },
  { id: 'prices', label: 'Prices', icon: DollarSign },
  { id: 'labour', label: 'Labour', icon: Users },
  { id: 'drawing', label: 'Drawing', icon: Upload },
  { id: 'result', label: 'Estimate', icon: Calculator },
];

const BUILDING_TYPES: { value: BuildingType; label: string }[] = [
  { value: 'bungalow', label: 'Bungalow' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'two_storey', label: 'Two-Storey' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'office', label: 'Office' },
  { value: 'shop', label: 'Shop / Commercial' },
  { value: 'custom', label: 'Custom Building' },
];

const FOUNDATION_TYPES: { value: FoundationType; label: string }[] = [
  { value: 'strip_footing', label: 'Strip Footing' },
  { value: 'pad_footing', label: 'Pad Footing' },
  { value: 'raft', label: 'Raft Foundation' },
  { value: 'pile', label: 'Pile Foundation' },
  { value: 'custom', label: 'Custom' },
];

const ROOF_TYPES: { value: RoofType; label: string }[] = [
  { value: 'gable', label: 'Gable' },
  { value: 'hip', label: 'Hip' },
  { value: 'mono_pitch', label: 'Mono-Pitch' },
  { value: 'flat', label: 'Flat' },
  { value: 'custom', label: 'Custom' },
];

const BLOCK_SIZES: { value: BlockSize; label: string }[] = [
  { value: '225mm', label: '9-inch (225mm)' },
  { value: '150mm', label: '6-inch (150mm)' },
  { value: '125mm', label: '5-inch (125mm)' },
  { value: 'custom', label: 'Custom' },
];

const ROOFING_MATERIALS: { value: RoofingMaterial; label: string }[] = [
  { value: 'long_span_aluminium', label: 'Long Span Aluminium' },
  { value: 'stone_coated', label: 'Stone Coated' },
  { value: 'gi_sheet', label: 'GI Sheet' },
  { value: 'shingle', label: 'Shingle' },
  { value: 'custom', label: 'Custom' },
];

// ── Reusable input components ──

function Field({ label, value, onChange, type = 'number', unit, placeholder, step }: {
  label: string; value: number | string; onChange: (v: string) => void;
  type?: string; unit?: string; placeholder?: string; step?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-neutral-600 mb-1 block">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          step={step}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20 transition-all"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">{unit}</span>
        )}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-sm font-medium text-neutral-600 mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20 transition-all"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, className = '' }: {
  title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-neutral-200 bg-white shadow-card p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-brand-purple" />
        <h3 className="font-semibold text-neutral-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ── Main component ──

export default function BuildToRoofEstimator() {
  useSeo({
    title: 'Build-to-Roof Construction Cost Estimator | FRELUX',
    description: 'Calculate materials, quantities, and costs for your building from foundation to roof. Upload drawings, configure prices, and get a professional Build-to-Roof estimate.',
    keywords: 'build to roof, construction cost estimator, Nigerian construction, foundation to roof, building materials calculator',
  });

  const [step, setStep] = useState(0);
  const [result, setResult] = useState<BuildToRoofResult | null>(null);

  const [input, setInput] = useState<BuildToRoofInput>({
    project_name: '',
    location: 'Lagos',
    building_type: 'bungalow',
    number_of_floors: 1,
    building_length: 15,
    building_width: 10,
    floor_to_floor_height: 3,
    wall_thickness: 0.225,
    internal_wall_length: 25,
    internal_wall_thickness: 0.15,
    openings: [
      { type: 'door', width: 0.9, height: 2.1, count: 4 },
      { type: 'window', width: 1.2, height: 1.2, count: 6 },
    ],
    foundation_type: 'strip_footing',
    foundation_depth: 0.9,
    foundation_width: 0.675,
    blinding_thickness: 0.075,
    hardcore_thickness: 0.15,
    dpc_length: 50,
    block_size: '225mm',
    block_length: 450,
    block_height: 225,
    block_width: 225,
    concrete_mix_cement: 1,
    concrete_mix_sand: 2,
    concrete_mix_aggregate: 4,
    mortar_mix_cement: 1,
    mortar_mix_sand: 6,
    roof_type: 'gable',
    roof_pitch_degrees: 25,
    roof_overhang: 0.6,
    roofing_material: 'long_span_aluminium',
    structural_members: [],
    has_engineer_schedule: false,
    wastage: DEFAULT_WASTAGE,
    prices: DEFAULT_PRICES,
    labour: DEFAULT_LABOUR,
    contingency_percent: 5,
  });

  const update = useCallback(<K extends keyof BuildToRoofInput>(key: K, value: BuildToRoofInput[K]) => {
    setInput(prev => ({ ...prev, [key]: value }));
  }, []);

  const calculate = useCallback(() => {
    const r = calculateBuildToRoof(input);
    setResult(r);
    setStep(STEPS.length - 1);
  }, [input]);

  const next = () => step < STEPS.length - 1 && setStep(step + 1);
  const prev = () => step > 0 && setStep(step - 1);

  // ── Step rendering ──

  const canProceed = useMemo(() => {
    if (step === 0) return input.project_name.length > 0;
    return true;
  }, [step, input.project_name]);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-brand-navy text-white">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-8 h-8 text-accent-green" />
            <h1 className="text-2xl md:text-3xl font-bold">Build-to-Roof Estimator</h1>
          </div>
          <p className="text-white/70 text-sm md:text-base">
            Calculate materials. Estimate costs. Build with confidence.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
            <ShieldCheck className="w-3.5 h-3.5" />
            Foundation → Ground Floor → Walls → Structural Frame → Roof → Ready for Finishing
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <button
                  key={s.id}
                  onClick={() => i <= step && setStep(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isActive ? 'bg-brand-purple text-white' :
                    isDone ? 'bg-brand-purple/10 text-brand-purple' :
                    'text-neutral-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Step content */}
        {result && step === STEPS.length - 1 ? (
          <EstimateResult result={result} onBack={() => { setResult(null); setStep(STEPS.length - 2); }} />
        ) : (
          <>
            {/* Step 0: Project */}
            {step === 0 && (
              <div className="space-y-4">
                <SectionCard title="Project Information" icon={Home}>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Project name" type="text" value={input.project_name} onChange={v => update('project_name', v)} placeholder="e.g. 3-Bedroom Bungalow" />
                    <Field label="Location" type="text" value={input.location} onChange={v => update('location', v)} placeholder="e.g. Lagos" />
                    <SelectField label="Building type" value={input.building_type} onChange={v => update('building_type', v as BuildingType)} options={BUILDING_TYPES} />
                    <Field label="Number of floors" type="number" value={input.number_of_floors} onChange={v => update('number_of_floors', parseInt(v) || 1)} />
                  </div>
                </SectionCard>
              </div>
            )}

            {/* Step 1: Dimensions */}
            {step === 1 && (
              <SectionCard title="Building Dimensions" icon={Ruler}>
                <div className="grid md:grid-cols-3 gap-4">
                  <Field label="Building length" unit="m" value={input.building_length} onChange={v => update('building_length', parseFloat(v) || 0)} step="0.1" />
                  <Field label="Building width" unit="m" value={input.building_width} onChange={v => update('building_width', parseFloat(v) || 0)} step="0.1" />
                  <Field label="Floor-to-floor height" unit="m" value={input.floor_to_floor_height} onChange={v => update('floor_to_floor_height', parseFloat(v) || 0)} step="0.1" />
                  <Field label="External wall thickness" unit="m" value={input.wall_thickness} onChange={v => update('wall_thickness', parseFloat(v) || 0)} step="0.025" />
                  <Field label="Internal wall total length" unit="m" value={input.internal_wall_length} onChange={v => update('internal_wall_length', parseFloat(v) || 0)} step="0.5" />
                  <Field label="Internal wall thickness" unit="m" value={input.internal_wall_thickness} onChange={v => update('internal_wall_thickness', parseFloat(v) || 0)} step="0.025" />
                </div>
                <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-3 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700">
                    Enter the total length of all internal partition walls combined. This is used for block and mortar calculations.
                  </p>
                </div>
              </SectionCard>
            )}

            {/* Step 2: Openings */}
            {step === 2 && (
              <SectionCard title="Door & Window Openings" icon={FolderOpen}>
                <p className="text-sm text-neutral-500 mb-4">
                  Openings are used only as wall deductions. Door/window purchase and installation costs are NOT included in the Build-to-Roof total.
                </p>
                <div className="space-y-3">
                  {input.openings.map((opening, i) => (
                    <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end p-3 rounded-lg bg-neutral-50 border border-neutral-100">
                      <div>
                        <label className="text-xs font-medium text-neutral-500 mb-1 block">Type</label>
                        <select
                          value={opening.type}
                          onChange={e => {
                            const openings = [...input.openings];
                            openings[i] = { ...opening, type: e.target.value as 'door' | 'window' };
                            update('openings', openings);
                          }}
                          className="w-full rounded-lg border border-neutral-200 px-2.5 py-2 text-sm"
                        >
                          <option value="door">Door</option>
                          <option value="window">Window</option>
                        </select>
                      </div>
                      <Field label="Width (m)" value={opening.width} onChange={v => {
                        const openings = [...input.openings];
                        openings[i] = { ...opening, width: parseFloat(v) || 0 };
                        update('openings', openings);
                      }} step="0.1" />
                      <Field label="Height (m)" value={opening.height} onChange={v => {
                        const openings = [...input.openings];
                        openings[i] = { ...opening, height: parseFloat(v) || 0 };
                        update('openings', openings);
                      }} step="0.1" />
                      <Field label="Count" value={opening.count} onChange={v => {
                        const openings = [...input.openings];
                        openings[i] = { ...opening, count: parseInt(v) || 0 };
                        update('openings', openings);
                      }} />
                      <button
                        onClick={() => update('openings', input.openings.filter((_, idx) => idx !== i))}
                        className="text-sm text-red-500 hover:text-red-700 font-medium"
                      >Remove</button>
                    </div>
                  ))}
                  <button
                    onClick={() => update('openings', [...input.openings, { type: 'window', width: 1.2, height: 1.2, count: 1 }])}
                    className="text-sm text-brand-purple hover:text-brand-purple-dark font-medium flex items-center gap-1"
                  >
                    + Add opening
                  </button>
                </div>
              </SectionCard>
            )}

            {/* Step 3: Foundation */}
            {step === 3 && (
              <SectionCard title="Foundation Details" icon={Layers}>
                <div className="grid md:grid-cols-3 gap-4">
                  <SelectField label="Foundation type" value={input.foundation_type} onChange={v => update('foundation_type', v as FoundationType)} options={FOUNDATION_TYPES} />
                  <Field label="Foundation depth" unit="m" value={input.foundation_depth} onChange={v => update('foundation_depth', parseFloat(v) || 0)} step="0.1" />
                  <Field label="Foundation width" unit="m" value={input.foundation_width} onChange={v => update('foundation_width', parseFloat(v) || 0)} step="0.025" />
                  <Field label="Blinding thickness" unit="m" value={input.blinding_thickness} onChange={v => update('blinding_thickness', parseFloat(v) || 0)} step="0.025" />
                  <Field label="Hardcore thickness" unit="m" value={input.hardcore_thickness} onChange={v => update('hardcore_thickness', parseFloat(v) || 0)} step="0.025" />
                  <Field label="DPC length" unit="m" value={input.dpc_length} onChange={v => update('dpc_length', parseFloat(v) || 0)} />
                </div>
              </SectionCard>
            )}

            {/* Step 4: Blocks & Mix */}
            {step === 4 && (
              <div className="space-y-4">
                <SectionCard title="Block Specification" icon={Settings}>
                  <div className="grid md:grid-cols-4 gap-4">
                    <SelectField label="Block size" value={input.block_size} onChange={v => {
                      const size = v as BlockSize;
                      const dims: Record<string, [number, number, number]> = {
                        '225mm': [450, 225, 225],
                        '150mm': [450, 225, 150],
                        '125mm': [450, 225, 125],
                      };
                      const d = dims[v] || [450, 225, 225];
                      setInput(prev => ({ ...prev, block_size: size, block_length: d[0], block_height: d[1], block_width: d[2] }));
                    }} options={BLOCK_SIZES} />
                    <Field label="Block length" unit="mm" value={input.block_length} onChange={v => update('block_length', parseFloat(v) || 0)} />
                    <Field label="Block height" unit="mm" value={input.block_height} onChange={v => update('block_height', parseFloat(v) || 0)} />
                    <Field label="Block width" unit="mm" value={input.block_width} onChange={v => update('block_width', parseFloat(v) || 0)} />
                  </div>
                </SectionCard>
                <SectionCard title="Concrete Mix Ratio" icon={Settings}>
                  <div className="grid grid-cols-3 gap-4">
                    <Field label="Cement (parts)" value={input.concrete_mix_cement} onChange={v => update('concrete_mix_cement', parseFloat(v) || 1)} />
                    <Field label="Sand (parts)" value={input.concrete_mix_sand} onChange={v => update('concrete_mix_sand', parseFloat(v) || 1)} />
                    <Field label="Aggregate (parts)" value={input.concrete_mix_aggregate} onChange={v => update('concrete_mix_aggregate', parseFloat(v) || 1)} />
                  </div>
                  <p className="mt-2 text-xs text-neutral-400">Current ratio: {input.concrete_mix_cement}:{input.concrete_mix_sand}:{input.concrete_mix_aggregate}</p>
                </SectionCard>
                <SectionCard title="Mortar Mix Ratio" icon={Settings}>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Cement (parts)" value={input.mortar_mix_cement} onChange={v => update('mortar_mix_cement', parseFloat(v) || 1)} />
                    <Field label="Sand (parts)" value={input.mortar_mix_sand} onChange={v => update('mortar_mix_sand', parseFloat(v) || 1)} />
                  </div>
                  <p className="mt-2 text-xs text-neutral-400">Current ratio: {input.mortar_mix_cement}:{input.mortar_mix_sand}</p>
                </SectionCard>
                <SectionCard title="Wastage Allowances" icon={TrendingUp}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Field label="Blocks" unit="%" value={input.wastage.blocks} onChange={v => update('wastage', { ...input.wastage, blocks: parseFloat(v) || 0 })} />
                    <Field label="Cement" unit="%" value={input.wastage.cement} onChange={v => update('wastage', { ...input.wastage, cement: parseFloat(v) || 0 })} />
                    <Field label="Sand" unit="%" value={input.wastage.sand} onChange={v => update('wastage', { ...input.wastage, sand: parseFloat(v) || 0 })} />
                    <Field label="Aggregate" unit="%" value={input.wastage.aggregate} onChange={v => update('wastage', { ...input.wastage, aggregate: parseFloat(v) || 0 })} />
                    <Field label="Reinforcement" unit="%" value={input.wastage.reinforcement} onChange={v => update('wastage', { ...input.wastage, reinforcement: parseFloat(v) || 0 })} />
                    <Field label="Timber" unit="%" value={input.wastage.timber} onChange={v => update('wastage', { ...input.wastage, timber: parseFloat(v) || 0 })} />
                    <Field label="Roofing sheets" unit="%" value={input.wastage.roofing_sheets} onChange={v => update('wastage', { ...input.wastage, roofing_sheets: parseFloat(v) || 0 })} />
                  </div>
                </SectionCard>
              </div>
            )}

            {/* Step 5: Roof */}
            {step === 5 && (
              <SectionCard title="Roof Configuration" icon={Building2}>
                <div className="grid md:grid-cols-3 gap-4">
                  <SelectField label="Roof type" value={input.roof_type} onChange={v => update('roof_type', v as RoofType)} options={ROOF_TYPES} />
                  <Field label="Roof pitch" unit="°" value={input.roof_pitch_degrees} onChange={v => update('roof_pitch_degrees', parseFloat(v) || 0)} />
                  <Field label="Overhang" unit="m" value={input.roof_overhang} onChange={v => update('roof_overhang', parseFloat(v) || 0)} step="0.1" />
                  <SelectField label="Roofing material" value={input.roofing_material} onChange={v => update('roofing_material', v as RoofingMaterial)} options={ROOFING_MATERIALS} />
                </div>
              </SectionCard>
            )}

            {/* Step 6: Structural */}
            {step === 6 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-amber-900 mb-1">Structural Engineering Safety Boundary</h3>
                      <p className="text-sm text-amber-800">
                        FRELUX does NOT design or certify foundation sizes, column sizes, beam sizes, slab thicknesses, or reinforcement.
                        If you have an engineer's structural schedule, enter the verified dimensions below for accurate material quantification.
                        Without an engineer's schedule, structural quantities cannot be reliably determined and are marked as preliminary.
                      </p>
                    </div>
                  </div>
                </div>
                <SectionCard title="Engineer-Supplied Structural Schedule" icon={Hammer}>
                  <label className="flex items-center gap-2 mb-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={input.has_engineer_schedule}
                      onChange={e => update('has_engineer_schedule', e.target.checked)}
                      className="w-4 h-4 rounded border-neutral-300 text-brand-purple focus:ring-brand-purple/20"
                    />
                    <span className="text-sm font-medium text-neutral-700">I have an engineer-supplied structural schedule</span>
                  </label>
                  {input.has_engineer_schedule && (
                    <div className="space-y-3">
                      {input.structural_members.map((member, i) => (
                        <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end p-3 rounded-lg bg-neutral-50 border border-neutral-100">
                          <div>
                            <label className="text-xs font-medium text-neutral-500 mb-1 block">Type</label>
                            <select
                              value={member.type}
                              onChange={e => {
                                const members = [...input.structural_members];
                                members[i] = { ...member, type: e.target.value as StructuralMemberInput['type'] };
                                update('structural_members', members);
                              }}
                              className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-xs"
                            >
                              <option value="column">Column</option>
                              <option value="ground_beam">Ground Beam</option>
                              <option value="suspended_beam">Suspended Beam</option>
                              <option value="ring_beam">Ring Beam</option>
                              <option value="lintel">Lintel</option>
                              <option value="slab">Slab</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <Field label="Label" value={member.label} onChange={v => {
                            const members = [...input.structural_members];
                            members[i] = { ...member, label: v };
                            update('structural_members', members);
                          }} type="text" />
                          <Field label="L (m)" value={member.length} onChange={v => {
                            const members = [...input.structural_members];
                            members[i] = { ...member, length: parseFloat(v) || 0 };
                            update('structural_members', members);
                          }} step="0.1" />
                          <Field label="W (m)" value={member.width} onChange={v => {
                            const members = [...input.structural_members];
                            members[i] = { ...member, width: parseFloat(v) || 0 };
                            update('structural_members', members);
                          }} step="0.025" />
                          <Field label="D (m)" value={member.depth} onChange={v => {
                            const members = [...input.structural_members];
                            members[i] = { ...member, depth: parseFloat(v) || 0 };
                            update('structural_members', members);
                          }} step="0.025" />
                          <Field label="Qty" value={member.quantity} onChange={v => {
                            const members = [...input.structural_members];
                            members[i] = { ...member, quantity: parseInt(v) || 1 };
                            update('structural_members', members);
                          }} />
                          <button
                            onClick={() => update('structural_members', input.structural_members.filter((_, idx) => idx !== i))}
                            className="col-span-2 md:col-span-6 text-xs text-red-500 hover:text-red-700 font-medium text-left"
                          >Remove member</button>
                        </div>
                      ))}
                      <button
                        onClick={() => update('structural_members', [...input.structural_members, {
                          id: `m${Date.now()}`, type: 'column', label: 'New Member',
                          length: 3, width: 0.225, depth: 0.225, quantity: 1,
                        }])}
                        className="text-sm text-brand-purple hover:text-brand-purple-dark font-medium"
                      >+ Add structural member</button>
                    </div>
                  )}
                  {!input.has_engineer_schedule && (
                    <div className="rounded-lg bg-neutral-50 border border-neutral-100 p-4">
                      <p className="text-sm text-neutral-500">
                        No engineer's schedule provided. Structural concrete quantities will not be calculated.
                        The estimate will be labeled as <span className="font-medium text-amber-600">preliminary</span> for structural items.
                      </p>
                    </div>
                  )}
                </SectionCard>
              </div>
            )}

            {/* Step 7: Prices */}
            {step === 7 && (
              <div className="space-y-4">
                <SectionCard title="Material Prices (₦)" icon={DollarSign}>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Field label="Cement per bag" unit="₦" value={input.prices.cement_per_bag} onChange={v => update('prices', { ...input.prices, cement_per_bag: parseFloat(v) || 0 })} />
                    <Field label="Block per piece" unit="₦" value={input.prices.block_per_piece} onChange={v => update('prices', { ...input.prices, block_per_piece: parseFloat(v) || 0 })} />
                    <Field label="Sand per m³" unit="₦" value={input.prices.sand_per_m3} onChange={v => update('prices', { ...input.prices, sand_per_m3: parseFloat(v) || 0 })} />
                    <Field label="Granite per m³" unit="₦" value={input.prices.granite_per_m3} onChange={v => update('prices', { ...input.prices, granite_per_m3: parseFloat(v) || 0 })} />
                    <Field label="Reinforcement per tonne" unit="₦" value={input.prices.reinforcement_per_tonne} onChange={v => update('prices', { ...input.prices, reinforcement_per_tonne: parseFloat(v) || 0 })} />
                    <Field label="Binding wire per kg" unit="₦" value={input.prices.binding_wire_per_kg} onChange={v => update('prices', { ...input.prices, binding_wire_per_kg: parseFloat(v) || 0 })} />
                    <Field label="Timber per meter" unit="₦" value={input.prices.timber_per_m} onChange={v => update('prices', { ...input.prices, timber_per_m: parseFloat(v) || 0 })} />
                    <Field label="Roofing sheet per piece" unit="₦" value={input.prices.roofing_sheet_per_piece} onChange={v => update('prices', { ...input.prices, roofing_sheet_per_piece: parseFloat(v) || 0 })} />
                    <Field label="Ridge cap per meter" unit="₦" value={input.prices.ridge_cap_per_meter} onChange={v => update('prices', { ...input.prices, ridge_cap_per_meter: parseFloat(v) || 0 })} />
                    <Field label="Roofing screws per piece" unit="₦" value={input.prices.roofing_screws_per_piece} onChange={v => update('prices', { ...input.prices, roofing_screws_per_piece: parseFloat(v) || 0 })} />
                    <Field label="Fascia per meter" unit="₦" value={input.prices.fascia_per_meter} onChange={v => update('prices', { ...input.prices, fascia_per_meter: parseFloat(v) || 0 })} />
                    <Field label="DPC per meter" unit="₦" value={input.prices.dpc_per_meter} onChange={v => update('prices', { ...input.prices, dpc_per_meter: parseFloat(v) || 0 })} />
                    <Field label="Formwork per m²" unit="₦" value={input.prices.formwork_per_m2} onChange={v => update('prices', { ...input.prices, formwork_per_m2: parseFloat(v) || 0 })} />
                    <Field label="Contingency" unit="%" value={input.contingency_percent} onChange={v => update('contingency_percent', parseFloat(v) || 0)} />
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-neutral-400">
                    <Info className="w-3.5 h-3.5" />
                    <span>Prices are user-configurable and not permanently stored. Update with current local market rates.</span>
                  </div>
                </SectionCard>
              </div>
            )}

            {/* Step 8: Labour */}
            {step === 8 && (
              <SectionCard title="Labour Rates (₦)" icon={Users}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Excavation per m³" unit="₦" value={input.labour.excavation_per_m3} onChange={v => update('labour', { ...input.labour, excavation_per_m3: parseFloat(v) || 0 })} />
                  <Field label="Blockwork per block" unit="₦" value={input.labour.blockwork_per_block} onChange={v => update('labour', { ...input.labour, blockwork_per_block: parseFloat(v) || 0 })} />
                  <Field label="Concrete per m³" unit="₦" value={input.labour.concrete_per_m3} onChange={v => update('labour', { ...input.labour, concrete_per_m3: parseFloat(v) || 0 })} />
                  <Field label="Reinforcement per tonne" unit="₦" value={input.labour.reinforcement_per_tonne} onChange={v => update('labour', { ...input.labour, reinforcement_per_tonne: parseFloat(v) || 0 })} />
                  <Field label="Formwork per m²" unit="₦" value={input.labour.formwork_per_m2} onChange={v => update('labour', { ...input.labour, formwork_per_m2: parseFloat(v) || 0 })} />
                  <Field label="Roofing per m²" unit="₦" value={input.labour.roofing_per_m2} onChange={v => update('labour', { ...input.labour, roofing_per_m2: parseFloat(v) || 0 })} />
                  <Field label="Blinding per m³" unit="₦" value={input.labour.blinding_per_m3} onChange={v => update('labour', { ...input.labour, blinding_per_m3: parseFloat(v) || 0 })} />
                  <Field label="Hardcore per m³" unit="₦" value={input.labour.hardcore_per_m3} onChange={v => update('labour', { ...input.labour, hardcore_per_m3: parseFloat(v) || 0 })} />
                  <Field label="Sand filling per m³" unit="₦" value={input.labour.sand_filling_per_m3} onChange={v => update('labour', { ...input.labour, sand_filling_per_m3: parseFloat(v) || 0 })} />
                  <Field label="General labour per day" unit="₦" value={input.labour.general_labour_per_day} onChange={v => update('labour', { ...input.labour, general_labour_per_day: parseFloat(v) || 0 })} />
                  <Field label="Site prep days" unit="days" value={input.labour.general_labour_days} onChange={v => update('labour', { ...input.labour, general_labour_days: parseFloat(v) || 0 })} />
                </div>
              </SectionCard>
            )}

            {/* Step 9: Drawing upload */}
            {step === 9 && (
              <SectionCard title="Upload Architectural Drawing (Optional)" icon={Upload}>
                <div className="border-2 border-dashed border-neutral-300 rounded-xl p-8 text-center">
                  <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-sm text-neutral-600 mb-2">Upload floor plans, elevations, sections, or roof plans</p>
                  <p className="text-xs text-neutral-400 mb-4">PDF, JPG, PNG supported</p>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    id="drawing-upload"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      update('drawing_analysis', {
                        file_name: file.name,
                        detected: {},
                        confirmed: {
                          building_length: null,
                          building_width: null,
                          wall_thickness: null,
                          floor_height: null,
                          number_of_floors: null,
                          internal_wall_length: null,
                          openings_confirmed: false,
                          roof_confirmed: false,
                          structural_confirmed: false,
                          user_corrections: [],
                        },
                        processed_at: new Date().toISOString(),
                        notes: ['Drawing uploaded — dimension extraction coming soon'],
                      });
                    }}
                  />
                  <label htmlFor="drawing-upload" className="inline-flex items-center gap-2 rounded-lg bg-brand-purple px-4 py-2.5 text-sm font-medium text-white cursor-pointer hover:bg-brand-purple-dark transition-colors">
                    <Upload className="w-4 h-4" />
                    Choose File
                  </label>
                </div>
                {input.drawing_analysis && (
                  <div className="mt-4 rounded-lg bg-green-50 border border-green-100 p-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-700">{input.drawing_analysis.file_name} uploaded</span>
                  </div>
                )}
                <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-4">
                  <p className="text-sm text-blue-700">
                    Drawing analysis and dimension extraction will be available in a future update.
                    For now, you can proceed with manually entered dimensions — these are fully functional.
                  </p>
                </div>
              </SectionCard>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={prev}
                disabled={step === 0}
                className="inline-flex items-center gap-1 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              {step < STEPS.length - 2 ? (
                <button
                  onClick={next}
                  disabled={!canProceed}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand-purple px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40 hover:bg-brand-purple-dark transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : step === STEPS.length - 2 ? (
                <button
                  onClick={calculate}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent-green px-6 py-3 text-sm font-bold text-white hover:bg-accent-green/90 transition-colors"
                >
                  <Calculator className="w-4 h-4" />
                  Generate Estimate
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Estimate Result Dashboard ──

function EstimateResult({ result, onBack }: { result: BuildToRoofResult; onBack: () => void }) {
  const confidenceColors: Record<string, string> = {
    high: 'bg-green-50 text-green-700 border-green-200',
    moderate: 'bg-amber-50 text-amber-700 border-amber-200',
    preliminary: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  return (
    <div className="space-y-6">
      {/* Project Summary */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">{result.project_name}</h2>
            <p className="text-sm text-neutral-500 mt-1">{result.location} · {result.total_floor_area} m² total floor area</p>
          </div>
          <div className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${confidenceColors[result.confidence]}`}>
            {result.confidence === 'high' ? 'High Confidence' : result.confidence === 'moderate' ? 'Moderate Confidence' : 'Preliminary Estimate'}
          </div>
        </div>
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
          <ArrowRight className="w-3.5 h-3.5 text-accent-green" />
          {result.construction_stage}
        </div>
        <p className="mt-2 text-xs text-neutral-400">{result.confidence_reason}</p>
      </div>

      {/* Grand Total */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-neutral-200 bg-brand-navy p-6 text-white">
          <p className="text-xs text-white/60 mb-1">Estimated Build-to-Roof Cost</p>
          <p className="text-2xl font-bold">{formatCurrency(result.grand_total)}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          <p className="text-xs text-neutral-500 mb-1">Materials</p>
          <p className="text-xl font-bold text-neutral-900">{formatCurrency(result.materials_total)}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          <p className="text-xs text-neutral-500 mb-1">Labour</p>
          <p className="text-xl font-bold text-neutral-900">{formatCurrency(result.labour_total)}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          <p className="text-xs text-neutral-500 mb-1">Contingency</p>
          <p className="text-xl font-bold text-neutral-900">{formatCurrency(result.contingency)}</p>
          <p className="text-xs text-neutral-400 mt-1">Wastage: {formatCurrency(result.wastage_allowance)}</p>
        </div>
      </div>

      {/* Cost Breakdown Table */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-card overflow-hidden">
        <div className="p-6 pb-3">
          <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-brand-purple" />
            Cost Breakdown by Stage
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-neutral-100 bg-neutral-50 text-left">
                <th className="px-6 py-3 font-medium text-neutral-500">Stage</th>
                <th className="px-6 py-3 font-medium text-neutral-500 text-right">Materials</th>
                <th className="px-6 py-3 font-medium text-neutral-500 text-right">Labour</th>
                <th className="px-6 py-3 font-medium text-neutral-500 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {result.stages.map((stage, i) => (
                <tr key={i} className="border-b border-neutral-50">
                  <td className="px-6 py-3 font-medium text-neutral-900">{stage.stage_label}</td>
                  <td className="px-6 py-3 text-right text-neutral-600">{formatCurrency(stage.materials_total)}</td>
                  <td className="px-6 py-3 text-right text-neutral-600">{formatCurrency(stage.labour_total)}</td>
                  <td className="px-6 py-3 text-right font-semibold text-neutral-900">{formatCurrency(stage.stage_total)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-neutral-200 bg-neutral-50">
                <td className="px-6 py-3 font-bold text-neutral-900">TOTAL</td>
                <td className="px-6 py-3 text-right font-semibold text-neutral-900">{formatCurrency(result.materials_total)}</td>
                <td className="px-6 py-3 text-right font-semibold text-neutral-900">{formatCurrency(result.labour_total)}</td>
                <td className="px-6 py-3 text-right font-bold text-brand-purple">{formatCurrency(result.materials_total + result.labour_total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Shopping List */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-card overflow-hidden">
        <div className="p-6 pb-3">
          <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-purple" />
            Consolidated Material Shopping List
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-neutral-100 bg-neutral-50 text-left">
                <th className="px-6 py-3 font-medium text-neutral-500">Material</th>
                <th className="px-6 py-3 font-medium text-neutral-500 text-right">Quantity</th>
                <th className="px-6 py-3 font-medium text-neutral-500 text-right">Unit</th>
                <th className="px-6 py-3 font-medium text-neutral-500 text-right">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {result.shopping_list.map((item, i) => (
                <tr key={i} className="border-b border-neutral-50">
                  <td className="px-6 py-3 font-medium text-neutral-900">{item.label}</td>
                  <td className="px-6 py-3 text-right text-neutral-600">{formatNumber(item.total_quantity)}</td>
                  <td className="px-6 py-3 text-right text-neutral-400">{item.unit}</td>
                  <td className="px-6 py-3 text-right font-semibold text-neutral-900">{formatCurrency(item.total_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Quantities per Stage */}
      {result.stages.map((stage, i) => (
        <details key={i} className="rounded-2xl border border-neutral-200 bg-white shadow-card">
          <summary className="cursor-pointer p-6 flex items-center justify-between">
            <span className="font-semibold text-neutral-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-purple" />
              {stage.stage_label} — Detailed Quantities
            </span>
            <span className="text-sm text-neutral-500">{formatCurrency(stage.stage_total)}</span>
          </summary>
          <div className="px-6 pb-6 space-y-4">
            {/* Quantities */}
            <div>
              <h4 className="text-xs font-medium text-neutral-400 uppercase mb-2">Quantity Takeoff</h4>
              <div className="space-y-2">
                {stage.quantities.map((q, j) => (
                  <div key={j} className="rounded-lg bg-neutral-50 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-700">{q.label}</span>
                      <span className="text-sm font-semibold text-neutral-900">
                        {formatNumber(q.base_quantity)} {q.unit}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400">{q.formula}</p>
                    {q.wastage_percent > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        +{q.wastage_percent}% wastage → {formatNumber(q.final_quantity)} {q.unit}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* Materials */}
            {stage.materials.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-neutral-400 uppercase mb-2">Materials</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 text-left">
                      <th className="py-2 font-medium text-neutral-400">Item</th>
                      <th className="py-2 font-medium text-neutral-400 text-right">Qty</th>
                      <th className="py-2 font-medium text-neutral-400 text-right">Unit</th>
                      <th className="py-2 font-medium text-neutral-400 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stage.materials.map((m, j) => (
                      <tr key={j} className="border-b border-neutral-50">
                        <td className="py-2 text-neutral-700">{m.label}</td>
                        <td className="py-2 text-right text-neutral-600">{formatNumber(m.final_quantity)}</td>
                        <td className="py-2 text-right text-neutral-400">{m.unit}</td>
                        <td className="py-2 text-right font-medium text-neutral-900">{formatCurrency(m.total_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Labour */}
            {stage.labour.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-neutral-400 uppercase mb-2">Labour</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 text-left">
                      <th className="py-2 font-medium text-neutral-400">Task</th>
                      <th className="py-2 font-medium text-neutral-400 text-right">Qty</th>
                      <th className="py-2 font-medium text-neutral-400 text-right">Rate</th>
                      <th className="py-2 font-medium text-neutral-400 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stage.labour.map((l, j) => (
                      <tr key={j} className="border-b border-neutral-50">
                        <td className="py-2 text-neutral-700">{l.label}</td>
                        <td className="py-2 text-right text-neutral-600">{formatNumber(l.quantity)}</td>
                        <td className="py-2 text-right text-neutral-600">{formatCurrency(l.rate)}</td>
                        <td className="py-2 text-right font-medium text-neutral-900">{formatCurrency(l.total_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </details>
      ))}

      {/* Assumptions & Limitations */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-card p-6">
          <h3 className="font-semibold text-neutral-900 flex items-center gap-2 mb-3">
            <Info className="w-5 h-5 text-blue-500" />
            Assumptions
          </h3>
          <ul className="space-y-1.5">
            {result.assumptions.map((a, i) => (
              <li key={i} className="text-sm text-neutral-600 flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-card p-6">
          <h3 className="font-semibold text-neutral-900 flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Limitations & Missing Info
          </h3>
          <ul className="space-y-1.5">
            {result.limitations.map((l, i) => (
              <li key={i} className="text-sm text-neutral-600 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{l}</span>
              </li>
            ))}
            {result.missing_info.map((m, i) => (
              <li key={`m${i}`} className="text-sm text-amber-700 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Price Info */}
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
        <p className="text-sm text-neutral-500">
          <span className="font-medium text-neutral-700">Price Date:</span> {result.price_date} ·
          <span className="font-medium text-neutral-700 ml-2">Source:</span> {result.price_source}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Edit Inputs
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
