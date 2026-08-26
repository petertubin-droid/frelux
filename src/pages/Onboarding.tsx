import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Home, Paintbrush, Building2, Ruler, MapPin, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { fetchLocations } from '@/lib/pro-connect';
import { classNames } from '@/lib/utils';

const PROJECT_GOALS = [
  { id: 'painting', label: 'Painting & Finishing', icon: Paintbrush, desc: 'Wall paint, screeding, pop ceiling' },
  { id: 'building', label: 'Building & Construction', icon: Building2, desc: 'Blocks, concrete, roofing, tiles' },
  { id: 'estimating', label: 'Cost Estimating', icon: Ruler, desc: 'Budget planning & material quantities' },
  { id: 'hiring', label: 'Hiring Professionals', icon: Search, desc: 'Find verified contractors' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [goals, setGoals] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/onboarding');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchLocations().then((locs) => {
      setStates([...new Set(locs.map((l) => l.state))].sort());
    });
  }, []);

  function toggleGoal(id: string) {
    setGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  async function finish() {
    setSaving(true);
    if (user) {
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_goals: goals,
          onboarding_state: selectedState || null,
        })
        .eq('id', user.id);
    }
    setSaving(false);
    navigate('/');
  }

  if (authLoading) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {/* Progress bar */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={classNames(
              'h-1.5 rounded-full transition-all',
              s <= step ? 'w-8 bg-brand-purple' : 'w-4 bg-neutral-200 dark:bg-white/10'
            )}
          />
        ))}
      </div>

      {/* Step 1: Welcome */}
      {step === 1 && (
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-purple/10">
            <Home className="h-10 w-10 text-brand-purple" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Welcome to FRELUX
          </h1>
          <p className="mt-3 text-neutral-500 dark:text-neutral-400">
            Plan your construction project with precision. Calculate materials, estimate costs, and connect with verified professionals — all in one place.
          </p>
          <button
            onClick={() => setStep(2)}
            className="mt-8 w-full rounded-xl bg-brand-purple py-3 text-sm font-semibold text-white"
          >
            Get Started <ArrowRight aria-hidden="true" className="ml-1 inline h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 2: Project goals */}
      {step === 2 && (
        <div>
          <h2 className="mb-1 text-xl font-bold text-neutral-900 dark:text-white">
            What are you planning?
          </h2>
          <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
            Select all that apply. We'll tailor your experience.
          </p>

          <div className="space-y-3">
            {PROJECT_GOALS.map((goal) => {
              const Icon = goal.icon;
              const selected = goals.includes(goal.id);
              return (
                <button
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  className={classNames(
                    'flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all',
                    selected
                      ? 'border-brand-purple bg-brand-purple/5'
                      : 'border-neutral-200 hover:border-neutral-300 dark:border-white/10 dark:hover:border-white/20'
                  )}
                >
                  <div className={classNames(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                    selected ? 'bg-brand-purple/10 text-brand-purple' : 'bg-neutral-100 text-neutral-400 dark:bg-white/5'
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className={classNames(
                      'text-sm font-semibold',
                      selected ? 'text-brand-purple' : 'text-neutral-700 dark:text-neutral-200'
                    )}>
                      {goal.label}
                    </p>
                    <p className="text-xs text-neutral-400">{goal.desc}</p>
                  </div>
                  {selected && (
                    <Check aria-hidden="true" className="h-5 w-5 text-brand-purple" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-500 dark:border-white/10 dark:text-neutral-400"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={goals.length === 0}
              className="flex-1 rounded-xl bg-brand-purple py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              Continue <ArrowRight aria-hidden="true" className="ml-1 inline h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Location */}
      {step === 3 && (
        <div>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-purple/10">
              <MapPin className="h-8 w-8 text-brand-purple" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
              Your Location
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Help us show relevant professionals and material prices in your area.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
              State
            </label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm dark:border-white/10 dark:bg-brand-navy"
            >
              <option value="">Select your state</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-500 dark:border-white/10 dark:text-neutral-400"
            >
              Back
            </button>
            <button
              onClick={finish}
              disabled={saving}
              className="flex-1 rounded-xl bg-brand-purple py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Done'} <Check aria-hidden="true" className="ml-1 inline h-4 w-4" />
            </button>
          </div>

          <button
            onClick={finish}
            className="mt-3 w-full text-center text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            Skip for now
          </button>
        </div>
      )}
    </div>
  );
}
