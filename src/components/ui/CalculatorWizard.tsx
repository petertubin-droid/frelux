import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Check, BadgeCheck } from 'lucide-react';
import { classNames } from '@/lib/utils';

export interface WizardStep {
  title: string;
  subtitle?: string;
  icon?: typeof BadgeCheck;
  content: ReactNode;
  canProceed?: boolean;
}

interface CalculatorWizardProps {
  steps: WizardStep[];
  onComplete: () => void;
  onBack?: () => void;
  completeLabel?: string;
}

export function CalculatorWizard({ steps, onComplete, onBack, completeLabel = 'See Results' }: CalculatorWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const isLast = currentStep === steps.length - 1;
  const step = steps[currentStep];
  const canProceed = step.canProceed !== false;

  function next() {
    if (isLast) {
      onComplete();
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function prev() {
    if (currentStep === 0) {
      onBack?.();
      return;
    }
    setCurrentStep((s) => Math.max(s - 1, 0));
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress dots */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {steps.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentStep(i)}
            className={classNames(
              'h-2.5 rounded-full transition-all',
              i === currentStep ? 'w-8 bg-brand-purple' : i < currentStep ? 'w-2.5 bg-accent-green' : 'w-2.5 bg-neutral-300 dark:bg-neutral-600',
            )}
            aria-label={`Step ${i + 1}`}
          />
        ))}
      </div>

      {/* Step card */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-brand-navy-mid sm:p-8">
        {/* Header */}
        <div className="mb-5">
          {step.icon && (
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple">
              <step.icon className="h-5 w-5" />
            </div>
          )}
          <h2 className="text-lg font-bold text-brand-navy dark:text-white">{step.title}</h2>
          {step.subtitle && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{step.subtitle}</p>}
        </div>

        {/* Content */}
        <div>{step.content}</div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-5 dark:border-neutral-700">
          <button
            type="button"
            onClick={prev}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-neutral-500 transition-colors hover:text-brand-purple"
          >
            <ChevronLeft className="h-4 w-4" />
            {currentStep === 0 ? 'Exit' : 'Back'}
          </button>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            Step {currentStep + 1} of {steps.length}
          </span>
          <button
            type="button"
            onClick={next}
            disabled={!canProceed}
            className={classNames(
              'inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-bold text-white transition-all',
              canProceed
                ? 'bg-brand-purple hover:bg-brand-purple/90 press-scale'
                : 'cursor-not-allowed bg-neutral-300 dark:bg-neutral-700',
            )}
          >
            {isLast ? (
              <>
                <Check className="h-4 w-4" /> {completeLabel}
              </>
            ) : (
              <>
                Next <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
