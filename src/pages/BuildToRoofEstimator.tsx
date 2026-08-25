import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSeo } from '@/lib/seo';
import { RelatedTools, CALC_LINKS } from '@/components/seo/SeoSections';
import {
  Building2, ChevronRight, ChevronLeft, Calculator, Upload, FileText,
  CheckCircle2, AlertTriangle, Info, Package, Users, DollarSign,
  TrendingUp, ShieldCheck, Layers, Home, Ruler, Hammer, FolderOpen,
  Printer, ArrowRight, Settings, Camera, Gem, BadgeCheck,
} from 'lucide-react';
import {
  calculateBuildToRoof,
  DEFAULT_PRICES,
  DEFAULT_LABOUR,
  DEFAULT_WASTAGE,
} from '@/lib/estimation/build-to-roof-engine';
import type {
  BuildToRoofInput, BuildToRoofResult, BuildingType, FoundationType,
  RoofType, BlockSize, RoofingMaterial, StructuralMemberInput,
} from '@/types/build-to-roof';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { SubscriptionGate } from '@/components/subscription/SubscriptionGate';
import { RoofViewPanel } from '@/components/roof-view/RoofViewPanel';
import { RoofGeometryEditor } from '@/components/roof-view/RoofGeometryEditor';
import { createDefaultRoofGeometry } from '@/lib/roof/geometry-engine';
import type { RoofGeometry } from '@/lib/roof/geometry-types';
import { trackBuildToRoofRewards } from '@/lib/rewards-integration';
import { monitoredCalc } from '@/lib/calculator-monitor';

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

const BLOCK_SIZES: { value: BlockSize; label: string; description: string }[] = [
  { value: '9inch', label: '9-inch Block', description: 'Hollow · Best for foundations & storey buildings' },
  { value: '6inch', label: '6-inch Block', description: 'Hollow or solid · Internal walls & partitions' },
  { value: '5inch', label: '5-inch Block', description: 'Solid only · Non-load-bearing partitions' },
  { value: 'custom', label: 'Custom', description: 'Specify custom dimensions' },
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
      <label className="text-xs sm:text-sm font-medium text-neutral-600 mb-1.5 block">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          step={step}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 sm:py-3 text-sm text-neutral-900 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20 transition-all duration-200 hover:border-neutral-300"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none font-medium">{unit}</span>
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
      <label className="text-xs sm:text-sm font-medium text-neutral-600 mb-1.5 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 sm:py-3 text-sm text-neutral-900 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20 transition-all duration-200 hover:border-neutral-300 cursor-pointer"
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
    <div className={`rounded-2xl border border-neutral-200 bg-white shadow-card p-4 sm:p-6 transition-shadow duration-300 hover:shadow-card-hover ${className}`}>
      <div className="flex items-center gap-2.5 mb-4 sm:mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-purple/15 to-brand-purple/5 ring-1 ring-brand-purple/10">
          <Icon className="w-4.5 h-4.5 text-brand-purple" />
        </div>
        <h3 className="font-semibold text-neutral-900 text-base sm:text-lg">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ── Main component ──


// ── Premium rotating text slide component with smooth slide animation ──
function RotatingText({ messages, interval = 3800 }: { messages: string[]; interval?: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % messages.length);
    }, interval);
    return () => clearInterval(timer);
  }, [messages.length, interval]);

  return (
    <div className="relative h-7 overflow-hidden">
      {messages.map((msg, i) => {
        const isActive = i === index;
        const isPrev = i === (index - 1 + messages.length) % messages.length;
        return (
          <div
            key={i}
            className="absolute inset-0 flex items-center gap-2 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              opacity: isActive ? 1 : 0,
              transform: isActive
                ? 'translateY(0) translateX(0)'
                : isPrev
                ? 'translateY(-100%) translateX(-8px)'
                : 'translateY(100%) translateX(8px)',
            }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-green shrink-0 animate-pulse" />
            <span className="text-xs sm:text-sm font-medium text-white/80 whitespace-nowrap">{msg}</span>
          </div>
        );
      })}
    </div>
  );
}


export default function BuildToRoofEstimator() {
  useSeo({
    title: 'Build-to-Roof Construction Cost Estimator | FRELUX',
    description: 'Calculate materials, quantities, and costs for your building from foundation to roof. Upload drawings, configure prices, and get a professional Build-to-Roof estimate.',
    keywords: 'build to roof, construction cost estimator, Nigerian construction, foundation to roof, building materials calculator',
    canonicalPath: '/build-to-roof-estimator',
    structuredDataArray: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        'name': 'Build-to-Roof Construction Cost Estimator',
        'url': 'https://freluxtools.netlify.app/build-to-roof-estimator',
        'description': 'Calculate materials, quantities, and costs for your building from foundation to roof with Nigerian-market pricing.',
        'applicationCategory': 'BusinessApplication',
        'operatingSystem': 'Web',
        'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'NGN' },
        'audience': { '@type': 'Audience', 'audienceType': 'Homeowners, Builders, Contractors' },
        'areaServed': { '@type': 'Country', 'name': 'Nigeria' }
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://freluxtools.netlify.app' },
          { '@type': 'ListItem', 'position': 2, 'name': 'Calculators', 'item': 'https://freluxtools.netlify.app/calculators' },
          { '@type': 'ListItem', 'position': 3, 'name': 'Build-to-Roof Estimator', 'item': 'https://freluxtools.netlify.app/build-to-roof-estimator' }
        ]
      }
    ],
  });

  const [step, setStep] = useState(0);
  const [result, setResult] = useState<BuildToRoofResult | null>(null);
  const [roofGeometry, setRoofGeometry] = useState<RoofGeometry>(() => createDefaultRoofGeometry());

  const [input, setInput] = useState<BuildToRoofInput>({
    project_name: '',
    location: 'Lagos',
    building_type: 'bungalow',
    number_of_floors: 1,
    measurement_unit: 'm',
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
    footing_thickness: 0.225,
    blinding_thickness: 0.075,
    hardcore_thickness: 0.15,
    dpc_length: 50,
    block_size: '9inch',
    block_length: 18, // inches (450mm ≈ 18")
    block_height: 9, // inches (225mm ≈ 9")
    block_width: 9, // inches (225mm ≈ 9")
    concrete_mix_cement: 1,
    concrete_mix_sand: 2,
    concrete_mix_granite: 4,
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
    const r = monitoredCalc('Build-to-Roof Estimator', () => calculateBuildToRoof(input));
    setResult(r);
    setStep(STEPS.length - 1);
    trackBuildToRoofRewards();
  }, [input]);

  const next = () => step < STEPS.length - 1 && setStep(step + 1);
  const prev = () => step > 0 && setStep(step - 1);

  // ── Step rendering ──

  const canProceed = useMemo(() => {
    if (step === 0) return input.project_name.length > 0;
    return true;
  }, [step, input.project_name]);

  return (
    <SubscriptionGate feature="build_to_roof_estimator">
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100/50">
      {/* Premium Header with mesh gradient */}
      <div className="relative overflow-hidden bg-brand-navy text-white">
        {/* Animated mesh background */}
        <div className="absolute inset-0 animate-mesh-float" style={{
          background: `radial-gradient(at 15% 20%, rgba(109, 40, 217, 0.28) 0px, transparent 50%), radial-gradient(at 85% 80%, rgba(34, 197, 94, 0.15) 0px, transparent 50%), radial-gradient(at 50% 50%, rgba(109, 40, 217, 0.1) 0px, transparent 50%)`,
        }} />
        <div className="absolute inset-0 animate-premium-shimmer" />
        {/* Grid overlay for premium texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }} />

        <div className="relative max-w-6xl mx-auto px-4 py-10 sm:py-14">
          <div className="flex items-center gap-3 sm:gap-4 mb-2">
            <div className="flex h-11 w-11 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple/30 to-brand-purple/10 ring-1 ring-brand-purple/30 backdrop-blur-sm">
              <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-accent-green" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-3xl md:text-4xl font-bold tracking-tight">Build-to-Roof Estimator</h1>
              <div className="mt-1.5">
                <RotatingText
                  messages={[
                    'Foundation → Block walls → Structural frame → Roof — all in one estimate',
                    'Nigerian-market prices for cement, blocks, sand, granite & more',
                    'Engineer-ready material schedules with quantities and costs',
                    '11 guided steps · Full transparency · No hidden assumptions',
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Feature badges row */}
          <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium text-white/80 backdrop-blur-md animate-badge-pop-in" style={{ animationDelay: '0.1s' }}>
              <ShieldCheck className="w-3.5 h-3.5 text-accent-green" />
              <span className="hidden sm:inline">Foundation to Roof</span>
              <span className="sm:hidden">F→R</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium text-white/80 backdrop-blur-md animate-badge-pop-in" style={{ animationDelay: '0.2s' }}>
              <BadgeCheck className="w-3.5 h-3.5 text-accent-green" />
              <span className="hidden sm:inline">Transparent Pricing</span>
              <span className="sm:hidden">Pricing</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium text-white/80 backdrop-blur-md animate-badge-pop-in" style={{ animationDelay: '0.3s' }}>
              <Gem className="w-3.5 h-3.5 text-brand-purple-light" />
              <span className="hidden sm:inline">11-Step Professional Flow</span>
              <span className="sm:hidden">11-Step</span>
            </span>
          </div>

          <Link
            to="/image-estimator"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-accent-green/30 bg-accent-green/10 px-3.5 sm:px-4 py-2.5 text-sm font-semibold text-accent-green backdrop-blur-md transition-all hover:bg-accent-green/20 hover:border-accent-green/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Estimate from a Photo — Try our AI Photo Estimator</span>
            <span className="sm:hidden">Try AI Photo Estimator</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Premium sticky progress bar */}
      <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur-lg shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-4">
          <div className="flex items-center gap-1 overflow-x-auto py-2.5 sm:py-3 scrollbar-hide snap-x">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <button
                  key={s.id}
                  onClick={() => i <= step && setStep(i)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-200 snap-start ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-purple to-brand-purple-light text-white shadow-md shadow-brand-purple/20 scale-105'
                      : isDone
                      ? 'bg-brand-purple/10 text-brand-purple hover:bg-brand-purple/15'
                      : 'text-neutral-400 hover:bg-neutral-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden md:inline">{s.label}</span>
                  <span className="md:hidden">{i + 1}</span>
                </button>
              );
            })}
          </div>
          {/* Progress line with glow */}
          <div className="h-1 w-full bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-purple to-accent-green transition-all duration-500 ease-out animate-progress-glow rounded-full"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
        {/* Step content */}
        {result && step === STEPS.length - 1 ? (
          <EstimateResult result={result} onBack={() => { setResult(null); setStep(STEPS.length - 2); }} />
        ) : (
          <>
          <div key={step} className="animate-step-slide-in">
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
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm font-medium text-neutral-600">Measurement unit:</span>
                  <div className="inline-flex rounded-lg border border-neutral-200 overflow-hidden">
                    <button
                      onClick={() => {
                        if (input.measurement_unit === 'ft') {
                          // Convert ft values to m
                          setInput(prev => ({
                            ...prev,
                            measurement_unit: 'm',
                            building_length: parseFloat((prev.building_length * 0.3048).toFixed(2)),
                            building_width: parseFloat((prev.building_width * 0.3048).toFixed(2)),
                            floor_to_floor_height: parseFloat((prev.floor_to_floor_height * 0.3048).toFixed(2)),
                            wall_thickness: parseFloat((prev.wall_thickness * 0.3048).toFixed(4)),
                            internal_wall_length: parseFloat((prev.internal_wall_length * 0.3048).toFixed(2)),
                            internal_wall_thickness: parseFloat((prev.internal_wall_thickness * 0.3048).toFixed(4)),
                          }));
                        }
                      }}
                      className={`px-3 py-1.5 text-sm font-medium ${input.measurement_unit === 'm' ? 'bg-brand-purple text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
                    >Meters (m)</button>
                    <button
                      onClick={() => {
                        if (input.measurement_unit === 'm') {
                          // Convert m values to ft
                          setInput(prev => ({
                            ...prev,
                            measurement_unit: 'ft',
                            building_length: parseFloat((prev.building_length / 0.3048).toFixed(2)),
                            building_width: parseFloat((prev.building_width / 0.3048).toFixed(2)),
                            floor_to_floor_height: parseFloat((prev.floor_to_floor_height / 0.3048).toFixed(2)),
                            wall_thickness: parseFloat((prev.wall_thickness / 0.3048).toFixed(4)),
                            internal_wall_length: parseFloat((prev.internal_wall_length / 0.3048).toFixed(2)),
                            internal_wall_thickness: parseFloat((prev.internal_wall_thickness / 0.3048).toFixed(4)),
                          }));
                        }
                      }}
                      className={`px-3 py-1.5 text-sm font-medium ${input.measurement_unit === 'ft' ? 'bg-brand-purple text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
                    >Feet (ft)</button>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <Field label="Building length" unit={input.measurement_unit} value={input.building_length} onChange={v => update('building_length', parseFloat(v) || 0)} step="0.1" />
                  <Field label="Building width" unit={input.measurement_unit} value={input.building_width} onChange={v => update('building_width', parseFloat(v) || 0)} step="0.1" />
                  <Field label="Floor-to-floor height" unit={input.measurement_unit} value={input.floor_to_floor_height} onChange={v => update('floor_to_floor_height', parseFloat(v) || 0)} step="0.1" />
                  <Field label="External wall thickness" unit={input.measurement_unit} value={input.wall_thickness} onChange={v => update('wall_thickness', parseFloat(v) || 0)} step="0.025" />
                  <Field label="Internal wall total length" unit={input.measurement_unit} value={input.internal_wall_length} onChange={v => update('internal_wall_length', parseFloat(v) || 0)} step="0.5" />
                  <Field label="Internal wall thickness" unit={input.measurement_unit} value={input.internal_wall_thickness} onChange={v => update('internal_wall_thickness', parseFloat(v) || 0)} step="0.025" />
                </div>
                <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 p-3 sm:p-4 flex items-start gap-2">
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
                    <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3 items-end p-3 rounded-xl bg-neutral-50 border border-neutral-100">
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
                      <Field label={`Width (${input.measurement_unit})`} value={opening.width} onChange={v => {
                        const openings = [...input.openings];
                        openings[i] = { ...opening, width: parseFloat(v) || 0 };
                        update('openings', openings);
                      }} step="0.1" />
                      <Field label={`Height (${input.measurement_unit})`} value={opening.height} onChange={v => {
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
                  <Field label="Foundation depth" unit={input.measurement_unit} value={input.foundation_depth} onChange={v => update('foundation_depth', parseFloat(v) || 0)} step="0.1" />
                  <Field label="Foundation width" unit={input.measurement_unit} value={input.foundation_width} onChange={v => update('foundation_width', parseFloat(v) || 0)} step="0.025" />
                  <Field label="Footing thickness" unit={input.measurement_unit} value={input.footing_thickness} onChange={v => update('footing_thickness', parseFloat(v) || 0)} step="0.025" />
                  <Field label="Blinding thickness" unit={input.measurement_unit} value={input.blinding_thickness} onChange={v => update('blinding_thickness', parseFloat(v) || 0)} step="0.025" />
                  <Field label="Hardcore thickness" unit={input.measurement_unit} value={input.hardcore_thickness} onChange={v => update('hardcore_thickness', parseFloat(v) || 0)} step="0.025" />
                  <Field label="DPC length" unit={input.measurement_unit} value={input.dpc_length} onChange={v => update('dpc_length', parseFloat(v) || 0)} />
                </div>
              </SectionCard>
            )}

            {/* Step 4: Blocks & Mix */}
            {step === 4 && (
              <div className="space-y-4">
                <SectionCard title="Block Specification" icon={Settings}>
                  <div className="col-span-full -mt-2 mb-2 rounded-lg bg-blue-50 border border-blue-100 p-2.5">
                    <p className="text-xs text-blue-600">
                      <strong>Nigerian block sizes:</strong> 9-inch (hollow) — foundations &amp; external load-bearing walls ·
                      6-inch (hollow or solid) — internal partitions ·
                      5-inch (solid only) — non-load-bearing partitions
                    </p>
                  </div>
                  <div className="grid md:grid-cols-4 gap-4">
                    <SelectField label="Block size" value={input.block_size} onChange={v => {
                      const size = v as BlockSize;
                      const dims: Record<string, [number, number, number]> = {
                        '9inch': [18, 9, 9],
                        '6inch': [18, 9, 6],
                        '5inch': [18, 9, 5],
                      };
                      const d = dims[v] || [18, 9, 9];
                      setInput(prev => ({ ...prev, block_size: size, block_length: d[0], block_height: d[1], block_width: d[2] }));
                    }} options={BLOCK_SIZES} />
                    <Field label="Block length" unit="in" value={input.block_length} onChange={v => update('block_length', parseFloat(v) || 0)} />
                    <Field label="Block height" unit="in" value={input.block_height} onChange={v => update('block_height', parseFloat(v) || 0)} />
                    <Field label="Block width" unit="in" value={input.block_width} onChange={v => update('block_width', parseFloat(v) || 0)} />
                  </div>
                </SectionCard>
                <SectionCard title="Concrete Mix Ratio" icon={Settings}>
                  <div className="grid grid-cols-3 gap-4">
                    <Field label="Cement (parts)" value={input.concrete_mix_cement} onChange={v => update('concrete_mix_cement', parseFloat(v) || 1)} />
                    <Field label="Sand (parts)" value={input.concrete_mix_sand} onChange={v => update('concrete_mix_sand', parseFloat(v) || 1)} />
                    <Field label="Granite (parts)" value={input.concrete_mix_granite} onChange={v => update('concrete_mix_granite', parseFloat(v) || 1)} />
                  </div>
                  <p className="mt-2 text-xs text-neutral-400">Current ratio: {input.concrete_mix_cement}:{input.concrete_mix_sand}:{input.concrete_mix_granite}</p>
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
                    <Field label="Granite" unit="%" value={input.wastage.granite} onChange={v => update('wastage', { ...input.wastage, granite: parseFloat(v) || 0 })} />
                    <Field label="Reinforcement" unit="%" value={input.wastage.reinforcement} onChange={v => update('wastage', { ...input.wastage, reinforcement: parseFloat(v) || 0 })} />
                    <Field label="Timber" unit="%" value={input.wastage.timber} onChange={v => update('wastage', { ...input.wastage, timber: parseFloat(v) || 0 })} />
                    <Field label="Roofing sheets" unit="%" value={input.wastage.roofing_sheets} onChange={v => update('wastage', { ...input.wastage, roofing_sheets: parseFloat(v) || 0 })} />
                    <Field label="Hardcore" unit="%" value={input.wastage.hardcore} onChange={v => update('wastage', { ...input.wastage, hardcore: parseFloat(v) || 0 })} />
                  </div>
                </SectionCard>
              </div>
            )}

            {/* Step 5: Roof */}
            {step === 5 && (
              <SectionCard title="Roof Configuration" icon={Building2}>
                {/* Roof View — optional aerial imagery (Feature 2) */}
                <div className="mb-4">
                  <RoofViewPanel />
                </div>
                {/* Roof Geometry Editor — editable tracing (Feature 3) */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-neutral-600 mb-2">Roof Geometry (trace your roof outline)</p>
                  <RoofGeometryEditor
                    geometry={roofGeometry}
                    onChange={setRoofGeometry}
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <SelectField label="Roof type" value={input.roof_type} onChange={v => update('roof_type', v as RoofType)} options={ROOF_TYPES} />
                  <Field label="Roof pitch" unit="°" value={input.roof_pitch_degrees} onChange={v => update('roof_pitch_degrees', parseFloat(v) || 0)} />
                  <Field label="Overhang" unit={input.measurement_unit} value={input.roof_overhang} onChange={v => update('roof_overhang', parseFloat(v) || 0)} step="0.1" />
                  <SelectField label="Roofing material" value={input.roofing_material} onChange={v => update('roofing_material', v as RoofingMaterial)} options={ROOFING_MATERIALS} />
                </div>
              </SectionCard>
            )}

            {/* Step 6: Structural */}
            {step === 6 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-6">
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
                        <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 sm:gap-3 items-end p-3 rounded-xl bg-neutral-50 border border-neutral-100">
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
                          <Field label={`L (${input.measurement_unit})`} value={member.length} onChange={v => {
                            const members = [...input.structural_members];
                            members[i] = { ...member, length: parseFloat(v) || 0 };
                            update('structural_members', members);
                          }} step="0.1" />
                          <Field label={`W (${input.measurement_unit})`} value={member.width} onChange={v => {
                            const members = [...input.structural_members];
                            members[i] = { ...member, width: parseFloat(v) || 0 };
                            update('structural_members', members);
                          }} step="0.025" />
                          <Field label={`D (${input.measurement_unit})`} value={member.depth} onChange={v => {
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
                    <Field label="Sand per m³ (ref)" unit="₦" value={input.prices.sand_per_m3} onChange={v => update('prices', { ...input.prices, sand_per_m3: parseFloat(v) || 0 })} />
                    <Field label="Sand per trip (3.5m³)" unit="₦" value={input.prices.sand_per_trip} onChange={v => update('prices', { ...input.prices, sand_per_trip: parseFloat(v) || 0 })} />
                    <Field label="Granite per m³ (ref)" unit="₦" value={input.prices.granite_per_m3} onChange={v => update('prices', { ...input.prices, granite_per_m3: parseFloat(v) || 0 })} />
                    <Field label="Granite per trip (3.5m³)" unit="₦" value={input.prices.granite_per_trip} onChange={v => update('prices', { ...input.prices, granite_per_trip: parseFloat(v) || 0 })} />
                    <Field label="Reinforcement per tonne (bulk)" unit="₦" value={input.prices.reinforcement_per_tonne} onChange={v => update('prices', { ...input.prices, reinforcement_per_tonne: parseFloat(v) || 0 })} />
                    <div className="col-span-2">
                      <p className="text-xs text-neutral-400 mb-1">Rebar prices (per 12m standard length):</p>
                    </div>
                    <Field label="12mm rebar/length" unit="₦" value={input.prices.rebar_12mm_per_length} onChange={v => update('prices', { ...input.prices, rebar_12mm_per_length: parseFloat(v) || 0 })} />
                    <Field label="16mm rebar/length" unit="₦" value={input.prices.rebar_16mm_per_length} onChange={v => update('prices', { ...input.prices, rebar_16mm_per_length: parseFloat(v) || 0 })} />
                    <Field label="20mm rebar/length" unit="₦" value={input.prices.rebar_20mm_per_length} onChange={v => update('prices', { ...input.prices, rebar_20mm_per_length: parseFloat(v) || 0 })} />
                    <Field label="25mm rebar/length" unit="₦" value={input.prices.rebar_25mm_per_length} onChange={v => update('prices', { ...input.prices, rebar_25mm_per_length: parseFloat(v) || 0 })} />
                    <Field label="Binding wire per kg" unit="₦" value={input.prices.binding_wire_per_kg} onChange={v => update('prices', { ...input.prices, binding_wire_per_kg: parseFloat(v) || 0 })} />
                    <Field label="Timber per meter" unit="₦" value={input.prices.timber_per_m} onChange={v => update('prices', { ...input.prices, timber_per_m: parseFloat(v) || 0 })} />
                    <Field label="Roofing sheet per piece" unit="₦" value={input.prices.roofing_sheet_per_piece} onChange={v => update('prices', { ...input.prices, roofing_sheet_per_piece: parseFloat(v) || 0 })} />
                    <Field label="Ridge cap per meter" unit="₦" value={input.prices.ridge_cap_per_meter} onChange={v => update('prices', { ...input.prices, ridge_cap_per_meter: parseFloat(v) || 0 })} />
                    <Field label="Roofing screws per piece" unit="₦" value={input.prices.roofing_screws_per_piece} onChange={v => update('prices', { ...input.prices, roofing_screws_per_piece: parseFloat(v) || 0 })} />
                    <Field label="Fascia per meter" unit="₦" value={input.prices.fascia_per_meter} onChange={v => update('prices', { ...input.prices, fascia_per_meter: parseFloat(v) || 0 })} />
                    <Field label="DPC per meter" unit="₦" value={input.prices.dpc_per_meter} onChange={v => update('prices', { ...input.prices, dpc_per_meter: parseFloat(v) || 0 })} />
                    <Field label="Formwork per m²" unit="₦" value={input.prices.formwork_per_m2} onChange={v => update('prices', { ...input.prices, formwork_per_m2: parseFloat(v) || 0 })} />
                    <Field label="Hardcore per m³" unit="₦" value={input.prices.hardcore_per_m3} onChange={v => update('prices', { ...input.prices, hardcore_per_m3: parseFloat(v) || 0 })} />
                    <Field label="DPM per m²" unit="₦" value={input.prices.dpm_per_m2} onChange={v => update('prices', { ...input.prices, dpm_per_m2: parseFloat(v) || 0 })} />
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
              <div className="space-y-4">
                <SectionCard title="Task-Based Labour Rates (₦)" icon={Users}>
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
                    <Field label="Compaction per m³" unit="₦" value={input.labour.compaction_per_m3} onChange={v => update('labour', { ...input.labour, compaction_per_m3: parseFloat(v) || 0 })} />
                    <Field label="Backfilling per m³" unit="₦" value={input.labour.backfilling_per_m3} onChange={v => update('labour', { ...input.labour, backfilling_per_m3: parseFloat(v) || 0 })} />
                    <Field label="General labour per day" unit="₦" value={input.labour.general_labour_per_day} onChange={v => update('labour', { ...input.labour, general_labour_per_day: parseFloat(v) || 0 })} />
                    <Field label="Site prep days" unit="days" value={input.labour.general_labour_days} onChange={v => update('labour', { ...input.labour, general_labour_days: parseFloat(v) || 0 })} />
                  </div>
                </SectionCard>
                <SectionCard title="Role-Based Daily/Contract Rates (₦)" icon={Users}>
                  <div className="col-span-full -mt-2 mb-2 rounded-lg bg-blue-50 border border-blue-100 p-2.5">
                    <p className="text-xs text-blue-600">
                      <strong>Nigerian construction labour roles:</strong> Set daily or contract payment rates for each role.
                      These are added to the labour total alongside task-based rates.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Field label="Bricklayer per day" unit="₦/day" value={input.labour.bricklayer_per_day} onChange={v => update('labour', { ...input.labour, bricklayer_per_day: parseFloat(v) || 0 })} />
                    <Field label="Bricklayer days" unit="days" value={input.labour.bricklayer_days} onChange={v => update('labour', { ...input.labour, bricklayer_days: parseFloat(v) || 0 })} />
                    <div></div>
                    <Field label="Foreman per day" unit="₦/day" value={input.labour.foreman_per_day} onChange={v => update('labour', { ...input.labour, foreman_per_day: parseFloat(v) || 0 })} />
                    <Field label="Foreman days" unit="days" value={input.labour.foreman_days} onChange={v => update('labour', { ...input.labour, foreman_days: parseFloat(v) || 0 })} />
                    <div></div>
                    <Field label="Supervisor per day" unit="₦/day" value={input.labour.supervisor_per_day} onChange={v => update('labour', { ...input.labour, supervisor_per_day: parseFloat(v) || 0 })} />
                    <Field label="Supervisor days" unit="days" value={input.labour.supervisor_days} onChange={v => update('labour', { ...input.labour, supervisor_days: parseFloat(v) || 0 })} />
                    <div></div>
                    <Field label="Carpenter per day" unit="₦/day" value={input.labour.carpenter_per_day} onChange={v => update('labour', { ...input.labour, carpenter_per_day: parseFloat(v) || 0 })} />
                    <Field label="Carpenter days" unit="days" value={input.labour.carpenter_days} onChange={v => update('labour', { ...input.labour, carpenter_days: parseFloat(v) || 0 })} />
                    <div></div>
                    <Field label="Concrete labourer per day" unit="₦/day" value={input.labour.concrete_labourer_per_day} onChange={v => update('labour', { ...input.labour, concrete_labourer_per_day: parseFloat(v) || 0 })} />
                    <Field label="Concrete labourer days" unit="days" value={input.labour.concrete_labourer_days} onChange={v => update('labour', { ...input.labour, concrete_labourer_days: parseFloat(v) || 0 })} />
                    <div></div>
                    <div className="md:col-span-3 border-t border-neutral-100 pt-4 mt-2">
                      <p className="text-sm font-medium text-neutral-700 mb-3">Contractor Payment</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium text-neutral-600 mb-1 block">Payment type</label>
                          <select
                            value={input.labour.contractor_fee_type}
                            onChange={e => update('labour', { ...input.labour, contractor_fee_type: e.target.value as 'daily' | 'contract' })}
                            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20 transition-all"
                          >
                            <option value="contract">Lump sum (contract)</option>
                            <option value="daily">Daily rate</option>
                          </select>
                        </div>
                        {input.labour.contractor_fee_type === 'contract' ? (
                          <Field label="Contractor fee (lump sum)" unit="₦" value={input.labour.contractor_fee} onChange={v => update('labour', { ...input.labour, contractor_fee: parseFloat(v) || 0 })} />
                        ) : (
                          <>
                            <Field label="Contractor per day" unit="₦/day" value={input.labour.contractor_fee} onChange={v => update('labour', { ...input.labour, contractor_fee: parseFloat(v) || 0 })} />
                            <Field label="Contractor days" unit="days" value={input.labour.contractor_days} onChange={v => update('labour', { ...input.labour, contractor_days: parseFloat(v) || 0 })} />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg bg-neutral-50 border border-neutral-100 p-3">
                    <p className="text-xs text-neutral-500">
                      Role-based total: ₦{(input.labour.bricklayer_per_day * input.labour.bricklayer_days +
                      input.labour.foreman_per_day * input.labour.foreman_days +
                      input.labour.supervisor_per_day * input.labour.supervisor_days +
                      input.labour.carpenter_per_day * input.labour.carpenter_days +
                      input.labour.concrete_labourer_per_day * input.labour.concrete_labourer_days +
                      (input.labour.contractor_fee_type === 'contract' ? input.labour.contractor_fee : input.labour.contractor_fee * input.labour.contractor_days)
                      ).toLocaleString()}
                    </p>
                  </div>
                </SectionCard>
              </div>
            )}

            {/* Step 9: Drawing upload */}
            {step === 9 && (
              <SectionCard title="Upload Architectural Drawing (Optional)" icon={Upload}>
                <div className="border-2 border-dashed border-neutral-300 rounded-xl p-6 sm:p-8 text-center">
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

          </div>
            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 sm:mt-8 pt-4 border-t border-neutral-100">
              <button
                onClick={prev}
                disabled={step === 0}
                className="inline-flex items-center gap-1 rounded-xl px-3.5 sm:px-4 py-2.5 text-sm font-medium text-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-100 transition-colors active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <span className="text-xs text-neutral-400 font-medium">
                <span className="hidden sm:inline">Step </span>{step + 1} <span className="hidden sm:inline">of {STEPS.length - 1}</span>
                <span className="sm:hidden">/{STEPS.length - 1}</span>
              </span>
              {step < STEPS.length - 2 ? (
                <button
                  onClick={next}
                  disabled={!canProceed}
                  className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-brand-purple to-brand-purple-light px-4 sm:px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-brand-purple/20 disabled:opacity-40 hover:shadow-lg hover:shadow-brand-purple/25 transition-all active:scale-95"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : step === STEPS.length - 2 ? (
                <button
                  onClick={calculate}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-green to-green-600 px-5 sm:px-6 py-2.5 sm:py-3 text-sm font-bold text-white shadow-lg shadow-accent-green/20 hover:shadow-xl hover:shadow-accent-green/30 transition-all active:scale-95 animate-progress-glow"
                >
                  <Calculator className="w-4 h-4" />
                  <span className="hidden sm:inline">Generate Estimate</span>
                  <span className="sm:hidden">Calculate</span>
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
      <div className="mt-8">
      <RelatedTools links={[
        CALC_LINKS.paintCalculator,
        CALC_LINKS.costEstimator,
        CALC_LINKS.structuralCalc,
        CALC_LINKS.foundationCalc,
        CALC_LINKS.constructionSeq,
        CALC_LINKS.imageEstimator,
      ]} />
      </div>
    </div>
  </SubscriptionGate>
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
    <div className="space-y-4 sm:space-y-6 animate-step-slide-in">
      {/* Project Summary */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-card p-4 sm:p-6 animate-card-reveal">
        <div className="flex items-start justify-between flex-wrap gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900 truncate">{result.project_name}</h2>
            <p className="text-sm text-neutral-500 mt-1">{result.location} · {result.total_floor_area} m² total floor area</p>
          </div>
          <div className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${confidenceColors[result.confidence]} animate-badge-pop-in`}>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-neutral-200 bg-brand-navy p-4 sm:p-6 text-white animate-stat-count-in col-span-2 md:col-span-1 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(at 70% 30%, rgba(109, 40, 217, 0.4) 0px, transparent 60%)' }} />
          <div className="relative">
            <p className="text-xs text-white/60 mb-1">Estimated Build-to-Roof Cost</p>
            <p className="text-xl sm:text-2xl font-bold">{formatCurrency(result.grand_total)}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-card animate-stat-count-in" style={{ animationDelay: '0.1s' }}>
          <p className="text-xs text-neutral-500 mb-1">Materials</p>
          <p className="text-lg sm:text-xl font-bold text-neutral-900">{formatCurrency(result.materials_total)}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-card animate-stat-count-in" style={{ animationDelay: '0.2s' }}>
          <p className="text-xs text-neutral-500 mb-1">Labour</p>
          <p className="text-lg sm:text-xl font-bold text-neutral-900">{formatCurrency(result.labour_total)}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-card animate-stat-count-in col-span-2 md:col-span-1" style={{ animationDelay: '0.3s' }}>
          <p className="text-xs text-neutral-500 mb-1">Contingency</p>
          <p className="text-lg sm:text-xl font-bold text-neutral-900">{formatCurrency(result.contingency)}</p>
          <p className="text-xs text-neutral-400 mt-1">Wastage: {formatCurrency(result.wastage_allowance)}</p>
        </div>
      </div>

      {/* Premium Cost Breakdown Table */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-card overflow-hidden animate-card-reveal" style={{ animationDelay: '0.4s' }}>
        <div className="flex items-center justify-between p-6 pb-3">
          <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple/10">
              <DollarSign className="w-4 h-4 text-brand-purple" />
            </div>
            Cost Breakdown by Stage
          </h3>
          <span className="text-xs font-medium text-neutral-400">{result.stages.length} stages</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-neutral-100 bg-neutral-50 text-left">
                <th className="px-6 py-3 font-medium text-neutral-500">Stage</th>
                <th className="px-6 py-3 font-medium text-neutral-500 text-right">Materials</th>
                <th className="px-6 py-3 font-medium text-neutral-500 text-right">Labour</th>
                <th className="px-4 sm:px-6 py-3 font-medium text-neutral-500 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {result.stages.map((stage, i) => (
                <tr key={i} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                  <td className="px-4 sm:px-6 py-3 font-medium text-neutral-900">{stage.stage_label}</td>
                  <td className="px-4 sm:px-6 py-3 text-right text-neutral-600">{formatCurrency(stage.materials_total)}</td>
                  <td className="px-4 sm:px-6 py-3 text-right text-neutral-600">{formatCurrency(stage.labour_total)}</td>
                  <td className="px-4 sm:px-6 py-3 text-right font-semibold text-neutral-900">{formatCurrency(stage.stage_total)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-neutral-200 bg-neutral-50">
                <td className="px-4 sm:px-6 py-3 font-bold text-neutral-900">TOTAL</td>
                <td className="px-4 sm:px-6 py-3 text-right font-semibold text-neutral-900">{formatCurrency(result.materials_total)}</td>
                <td className="px-4 sm:px-6 py-3 text-right font-semibold text-neutral-900">{formatCurrency(result.labour_total)}</td>
                <td className="px-6 py-3 text-right font-bold text-brand-purple">{formatCurrency(result.materials_total + result.labour_total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium Shopping List */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-card overflow-hidden animate-card-reveal" style={{ animationDelay: '0.5s' }}>
        <div className="flex items-center justify-between p-4 sm:p-6 pb-3">
          <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple/10">
              <Package className="w-4 h-4 text-brand-purple" />
            </div>
            Consolidated Material Shopping List
          </h3>
          <span className="text-xs font-medium text-neutral-400">{result.shopping_list.length} items</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-neutral-100 bg-neutral-50 text-left">
                <th className="px-4 sm:px-6 py-3 font-medium text-neutral-500">Material</th>
                <th className="px-6 py-3 font-medium text-neutral-500 text-right">Quantity</th>
                <th className="px-6 py-3 font-medium text-neutral-500 text-right">Unit</th>
                <th className="px-6 py-3 font-medium text-neutral-500 text-right">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {result.shopping_list.map((item, i) => (
                <tr key={i} className="border-b border-neutral-50">
                  <td className="px-4 sm:px-6 py-3 font-medium text-neutral-900">{item.label}</td>
                  <td className="px-4 sm:px-6 py-3 text-right text-neutral-600">{formatNumber(item.total_quantity)}</td>
                  <td className="px-4 sm:px-6 py-3 text-right text-neutral-400">{item.unit}</td>
                  <td className="px-4 sm:px-6 py-3 text-right font-semibold text-neutral-900">{formatCurrency(item.total_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium Reinforcement Breakdown */}
      {result.reinforcement_breakdown && result.reinforcement_breakdown.items.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-card p-4 sm:p-6 animate-card-reveal" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple/10">
              <TrendingUp className="w-4 h-4 text-brand-purple" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">Reinforcement Breakdown</h3>
          </div>
          <p className="text-sm text-neutral-500 mb-4">Steel rods split by diameter — priced per 12m standard length</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-neutral-500">Bar Type</th>
                  <th className="px-4 py-2 text-right font-medium text-neutral-500">Diameter</th>
                  <th className="px-4 py-2 text-right font-medium text-neutral-500">Total Length</th>
                  <th className="px-4 py-2 text-right font-medium text-neutral-500">Std Lengths (12m)</th>
                  <th className="px-4 py-2 text-right font-medium text-neutral-500">Weight</th>
                  <th className="px-4 py-2 text-right font-medium text-neutral-500">Unit Price</th>
                  <th className="px-4 py-2 text-right font-medium text-neutral-500">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {result.reinforcement_breakdown.items.map((item, i) => (
                  <tr key={i} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium text-neutral-900">{item.label}</td>
                    <td className="px-4 py-3 text-right text-neutral-600">{item.diameter_mm}mm</td>
                    <td className="px-4 py-3 text-right text-neutral-600">{item.total_length_m.toFixed(1)} m</td>
                    <td className="px-4 py-3 text-right font-medium text-neutral-900">{item.standard_lengths} lengths</td>
                    <td className="px-4 py-3 text-right text-neutral-600">{item.weight_tonnes.toFixed(3)} t</td>
                    <td className="px-4 py-3 text-right text-neutral-600">₦{item.unit_price.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold text-neutral-900">₦{item.total_cost.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-neutral-50 font-semibold">
                  <td className="px-4 py-3" colSpan={3}>Total Steel</td>
                  <td className="px-4 py-3 text-right">{result.reinforcement_breakdown.total_length_m.toFixed(1)} m</td>
                  <td className="px-4 py-3 text-right">{result.reinforcement_breakdown.total_weight_tonnes.toFixed(3)} t</td>
                  <td className="px-4 py-3 text-right" colSpan={2}>₦{result.reinforcement_breakdown.total_cost.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-neutral-400">
            Binding wire: {result.reinforcement_breakdown.binding_wire_kg.toFixed(1)} kg (₦{result.reinforcement_breakdown.binding_wire_cost.toLocaleString()})
          </p>
        </div>
      )}

      {/* Detailed Quantities per Stage */}
      {result.stages.map((stage, i) => (
        <details key={i} className="rounded-2xl border border-neutral-200 bg-white shadow-card">
          <summary className="cursor-pointer p-4 sm:p-6 flex items-center justify-between">
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

      {/* Premium Assumptions & Limitations */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-card p-4 sm:p-6 animate-card-reveal" style={{ animationDelay: '0.7s' }}>
          <h3 className="font-semibold text-neutral-900 flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <Info className="w-4 h-4 text-blue-500" />
            </div>
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
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-card p-4 sm:p-6 animate-card-reveal" style={{ animationDelay: '0.8s' }}>
          <h3 className="font-semibold text-neutral-900 flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
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

      {/* Premium Price Info with Freshness Indicator */}
      <div className={`rounded-2xl border p-4 sm:p-6 animate-card-reveal ${result.price_stale ? 'border-amber-300 bg-gradient-to-r from-amber-50 to-amber-50/30' : 'border-neutral-200 bg-gradient-to-r from-neutral-50 to-neutral-50/30'}`} style={{ animationDelay: '0.9s' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${result.price_stale ? 'bg-amber-100' : 'bg-green-100'}`}>
              {result.price_stale ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : <BadgeCheck className="w-4 h-4 text-green-500" />}
            </div>
            <p className="text-sm text-neutral-500">
              <span className="font-medium text-neutral-700">Price Date:</span> {result.price_date} ·
              <span className="font-medium text-neutral-700 ml-2">Source:</span> {result.price_source}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            result.price_stale
              ? 'bg-amber-100 text-amber-800'
              : 'bg-green-100 text-green-800'
          }`}>
            {result.price_stale ? '⚠️ Stale' : '✓ Fresh'} ({result.price_age_days}d old)
          </span>
        </div>
        {result.price_stale && (
          <p className="mt-2 text-xs text-amber-700">
            Prices are older than 30 days. For accurate estimates, update current market prices before procurement.
          </p>
        )}
      </div>

      {/* Premium Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-xl px-3.5 sm:px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Edit Inputs</span>
          <span className="sm:hidden">Edit</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3.5 sm:px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print Estimate</span>
            <span className="sm:hidden">Print</span>
          </button>
        </div>
      </div>
    </div>
  );
}
