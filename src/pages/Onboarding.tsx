import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Home, Paintbrush, Building2, Ruler, MapPin, Search, Briefcase, User, ShieldCheck } from 'lucide-react';
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
  const [accountType, setAccountType] = useState<'client' | 'pro_worker' | null>(null);
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
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, g]
    );
  }

  async function finish() {
    setSaving(true);
    if (user) {
      const updates: Record<string, unknown> = {
        onboarding_completed: true,
        onboarding_goals: goals,
        onboarding_state: selectedState || null,
      };

      // If user chose Pro Worker, set account_type
      if (accountType === 'pro_worker') {
        updates.account_type = 'pro_worker';
      }

      await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
    }
    setSaving(false);

    // Route pro workers to the registration flow
    if (accountType === 'pro_worker') {
      navigate('/pro-connect/register');
    } else {
      navigate('/');
    }
  }

  if (authLoading) return null;

  const totalSteps = accountType === 'pro_worker' ? 4 : 3;

  return (
    <div className="mx-auto max-w-md py-8 sm:py-12">
      {/* Progress bar */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
          <div
            key={s}
            className={classNames(
              'h-1.5 rounded-full transition-all',
              s <= step ? 'w-8 bg-brand-purple' : 'w-4 bg-neutral-200 dark:bg-white/10'
            )}
          />
        ))}
      </div>

      {/* Step 1: Account Type Selection */}
      {step === 1 && (
        <div>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-purple/10">
              <Home className="h-10 w-10 text-brand-purple" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              Welcome to FRELUX
            </h1>
            <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">
              Plan your construction project with precision. Calculate materials, estimate costs, and connect with verified professionals — all in one place.
            </p>
          </div>

          <h2 className="mb-4 text-lg font-bold text-neutral-900 dark:text-white">
            How will you use FRELUX?
          </h2>

          <div className="space-y-3">
            {/* Client option */}
            <button
              onClick={() => { setAccountType('client'); setStep(2); }}
              className={classNames(
                'flex w-full items-center gap-4 rounded-xl border-2 p-5 text-left transition-all',
                accountType === 'client'
                  ? 'border-brand-purple bg-brand-purple/5'
                  : 'border-neutral-200 hover:border-neutral-300 dark:border-white/10 dark:hover:border-white/20'
              )}
            >
              <div className={classNames(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
                'bg-brand-purple/10 text-brand-purple'
              )}>
                <User className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-neutral-900 dark:text-white">I'm a Client</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-0.5">
                  Find professionals, estimate costs, and plan projects
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-neutral-400" />
            </button>

            {/* Pro Worker option */}
            <button
              onClick={() => { setAccountType('pro_worker'); setStep(2); }}
              className={classNames(
                'flex w-full items-center gap-4 rounded-xl border-2 p-5 text-left transition-all',
                accountType === 'pro_worker'
                  ? 'border-brand-purple bg-brand-purple/5'
                  : 'border-neutral-200 hover:border-neutral-300 dark:border-white/10 dark:hover:border-white/20'
              )}
            >
              <div className={classNames(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
                'bg-brand-purple/10 text-brand-purple'
              )}>
                <Briefcase className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-neutral-900 dark:text-white">I'm a Pro Worker</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-0.5">
                  Offer services, get verified, and connect with clients
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-neutral-400" />
            </button>
          </div>

          {accountType === 'pro_worker' && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-brand-purple/5 p-3 text-xs text-neutral-600 dark:text-neutral-300">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-purple" />
              <p>
                Pro Workers go through a verification process: mobile OTP, NIN KYC, and identity verification.
                Verified pros get badges and higher visibility in search results.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Project goals (for both types) */}
      {step === 2 && (
        <div>
          <h2 className="mb-1 text-xl font-bold text-neutral-900 dark:text-white">
            {accountType === 'pro_worker' ? 'What services do you offer?' : 'What are you planning?'}
          </h2>
          <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-500">
            {accountType === 'pro_worker'
              ? 'Select all that apply. You can refine these later in your profile.'
              : 'Select all that apply. We\'ll tailor your experience.'}
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
                    <p className="text-xs text-neutral-500">{goal.desc}</p>
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
              className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-500 dark:border-white/10 dark:text-neutral-500"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 rounded-xl bg-brand-purple py-3 text-sm font-semibold text-white"
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
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
              {accountType === 'pro_worker'
                ? 'Where do you operate? This helps clients find you.'
                : 'Help us show relevant professionals and material prices in your area.'}
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
              className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-500 dark:border-white/10 dark:text-neutral-500"
            >
              Back
            </button>
            {accountType === 'pro_worker' ? (
              <button
                onClick={() => setStep(4)}
                className="flex-1 rounded-xl bg-brand-purple py-3 text-sm font-semibold text-white"
              >
                Continue <ArrowRight aria-hidden="true" className="ml-1 inline h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={saving}
                className="flex-1 rounded-xl bg-brand-purple py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Done'} <Check aria-hidden="true" className="ml-1 inline h-4 w-4" />
              </button>
            )}
          </div>

          {accountType !== 'pro_worker' && (
            <button
              onClick={finish}
              className="mt-3 w-full text-center text-xs text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              Skip for now
            </button>
          )}
        </div>
      )}

      {/* Step 4: Pro Worker verification intro */}
      {step === 4 && accountType === 'pro_worker' && (
        <div>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-purple/10">
              <ShieldCheck className="h-8 w-8 text-brand-purple" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
              Verification Process
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
              FRELUX uses a tiered verification system to build trust. Complete these steps to increase your visibility.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-neutral-200 p-4 dark:border-white/10">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">1</div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">Contact Verification</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-0.5">Verify your email and mobile number via OTP. Unlocks basic directory listing.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-neutral-200 p-4 dark:border-white/10">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">2</div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">Identity Verification</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-0.5">Submit your NIN and government-issued ID. Admin reviews and approves. Unlocks Worker Channels.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-neutral-200 p-4 dark:border-white/10">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">3</div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">FRELUX Pro Level</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-0.5">Earn through sustained excellence: reviews, portfolio, and profile age. Awarded by FRELUX admins.</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setStep(3)}
              className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-500 dark:border-white/10 dark:text-neutral-500"
            >
              Back
            </button>
            <button
              onClick={finish}
              disabled={saving}
              className="flex-1 rounded-xl bg-brand-purple py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Continue to Profile Setup'} <ArrowRight aria-hidden="true" className="ml-1 inline h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
