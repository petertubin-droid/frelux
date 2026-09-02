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
              i === currentStep ? 'w-8 bg-primary' : i < currentStep ? 'w-2.5 bg-accent-green' : 'w-2.5 bg-muted dark:bg-muted-foreground',
            )}
            aria-label={`Step ${i + 1}`}
          />
        ))}
      </div>

      {/* Step card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm dark:border-border border-border dark:bg-card sm:p-8">
        {/* Header */}
        <div className="mb-5">
          {step.icon && (
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-brand-purple">
              <step.icon className="h-5 w-5" />
            </div>
          )}
          <h2 className="text-lg font-bold text-foreground dark:text-primary-foreground">{step.title}</h2>
          {step.subtitle && <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">{step.subtitle}</p>}
        </div>

        {/* Content */}
        <div>{step.content}</div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-5 dark:border-border border-border">
          <button
            type="button"
            onClick={prev}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-brand-purple"
          >
            <ChevronLeft className="h-4 w-4" />
            {currentStep === 0 ? 'Exit' : 'Back'}
          </button>
          <span className="text-xs text-muted-foreground dark:text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </span>
          <button
            type="button"
            onClick={next}
            disabled={!canProceed}
            className={classNames(
              'inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all',
              canProceed
                ? 'bg-primary hover:bg-primary/90 press-scale'
                : 'cursor-not-allowed bg-muted dark:bg-card-foreground/80',
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
