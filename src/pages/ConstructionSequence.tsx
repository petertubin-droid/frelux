import { useState } from 'react';
import { useSeo } from '@/lib/seo';
import { generateSequencePlan, type SequenceStep } from '@/lib/engineering/sequence-planner';
import {
  ListChecks, ShieldCheck, AlertTriangle, ChevronRight, ChevronDown,
  CheckCircle2, HardHat, Wrench, Package, FileCheck, Building2,
} from 'lucide-react';

export default function ConstructionSequence() {
  useSeo({
    title: 'Construction Sequence Planner | FRELUX',
    description: 'Step-by-step build order for Nigerian construction. Quality checks, materials, safety notes, and common mistakes for every stage.',
    keywords: 'construction sequence, build order, construction steps, quality checks Nigeria',
  });

  const plan = generateSequencePlan();
  const [openStep, setOpenStep] = useState<number | null>(1);

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-brand-navy text-white">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-2">
            <ListChecks className="w-8 h-8 text-accent-green" />
            <h1 className="text-2xl md:text-3xl font-bold">Construction Sequence Planner</h1>
          </div>
          <p className="text-white/70 text-sm md:text-base">
            The correct build order from site clearing to weathertight. Every step includes quality checks, materials, safety notes, and common mistakes.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Stage overview */}
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-card p-6">
          <h3 className="font-semibold text-neutral-900 mb-3">Construction Stages</h3>
          <div className="flex flex-wrap gap-2">
            {plan.stages.map((s, i) => (
              <div key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-purple/10 px-3 py-1.5 text-xs font-medium text-brand-purple">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-purple text-white text-xs">{i + 1}</span>
                {s}
                {i < plan.stages.length - 1 && <ChevronRight className="w-3 h-3 text-brand-purple/40" />}
              </div>
            ))}
          </div>
        </div>

        {/* Quality gates */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5" /> Quality Gates
          </h3>
          <p className="text-xs text-blue-600 mb-4">These are critical checkpoints where construction must be verified before proceeding to the next stage.</p>
          <div className="space-y-3">
            {plan.quality_gates.map((gate, i) => (
              <div key={i} className="rounded-lg border border-blue-100 bg-white p-3">
                <p className="text-sm font-medium text-blue-900 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-blue-500" />
                  After Step {gate.after_step}: {gate.gate_name}
                </p>
                <ul className="mt-2 space-y-1">
                  {gate.checks.map((c, j) => (
                    <li key={j} className="text-xs text-blue-700 flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" /> {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Parallel activities */}
        {plan.parallel_activities.length > 0 && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
            <h3 className="font-semibold text-green-900 flex items-center gap-2 mb-3">
              <Wrench className="w-5 h-5" /> Time-Saving Overlaps
            </h3>
            <div className="space-y-2">
              {plan.parallel_activities.map((p, i) => (
                <div key={i} className="rounded-lg border border-green-100 bg-white p-3">
                  <p className="text-xs font-medium text-green-700">Steps {p.steps.join(' & ')} can overlap:</p>
                  <p className="text-xs text-green-600 mt-1">{p.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-2">
          {plan.steps.map((step) => (
            <StepCard key={step.step_number} step={step} isOpen={openStep === step.step_number} onToggle={() => setOpenStep(openStep === step.step_number ? null : step.step_number)} />
          ))}
        </div>

        {/* Disclaimer */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">Engineering Disclaimer</p>
              <p className="text-xs text-amber-700 mt-1">
                This sequence is based on standard Nigerian construction practice for typical residential and
                commercial buildings. Complex projects may require modified sequences. Always follow your
                engineer's and architect's drawings and specifications. Verify all structural work with a
                qualified structural engineer before proceeding.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCard({ step, isOpen, onToggle }: { step: SequenceStep; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-card overflow-hidden">
      <button onClick={onToggle} className="flex w-full items-center justify-between p-4 text-left">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-navy text-white text-sm font-bold shrink-0">
            {step.step_number}
          </span>
          <div>
            <p className="text-sm font-semibold text-neutral-900">{step.title}</p>
            <p className="text-xs text-neutral-500">{step.stage} · {step.estimated_duration_days}</p>
          </div>
        </div>
        {isOpen ? <ChevronDown className="w-5 h-5 text-neutral-400" /> : <ChevronRight className="w-5 h-5 text-neutral-400" />}
      </button>

      {isOpen && (
        <div className="border-t border-neutral-100 p-4 space-y-4">
          <p className="text-sm text-neutral-600">{step.description}</p>

          {/* Prerequisites */}
          {step.prerequisites.length > 0 && (
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-1">Prerequisites:</p>
              <div className="flex gap-2">
                {step.prerequisites.map(p => (
                  <span key={p} className="text-xs rounded bg-neutral-100 px-2 py-0.5 text-neutral-600">Step {p}</span>
                ))}
              </div>
            </div>
          )}

          {/* Activities */}
          <Section icon={HardHat} title="Activities" items={step.activities} color="brand-purple" />
          {/* Materials */}
          <Section icon={Package} title="Materials Required" items={step.materials_required} color="neutral" />
          {/* Quality checks */}
          <Section icon={CheckCircle2} title="Quality Checks" items={step.quality_checks} color="green" />
          {/* Safety notes */}
          <Section icon={ShieldCheck} title="Safety Notes" items={step.safety_notes} color="blue" />
          {/* Common mistakes */}
          {step.common_mistakes.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-medium text-amber-700 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Common Mistakes to Avoid
              </p>
              <ul className="space-y-1">
                {step.common_mistakes.map((m, i) => <li key={i} className="text-xs text-amber-600">• {m}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, items, color }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
  color: 'brand-purple' | 'neutral' | 'green' | 'blue';
}) {
  const colorMap = {
    'brand-purple': 'text-brand-purple',
    'neutral': 'text-neutral-500',
    'green': 'text-green-600',
    'blue': 'text-blue-600',
  };
  return (
    <div>
      <p className={`text-xs font-medium ${colorMap[color]} mb-2 flex items-center gap-1.5`}>
        <Icon className="w-3.5 h-3.5" /> {title}
      </p>
      <ul className="space-y-1 ml-5">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-neutral-600 flex items-start gap-2">
            <span className="text-neutral-300 mt-0.5">•</span> {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
