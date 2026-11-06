import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { ChevronLeft, ChevronRight, Check, BadgeCheck } from "lucide-react";
import { classNames } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";
import MissingFieldsNotice from "@/components/ui/MissingFieldsNotice";
import {
  findMissingFields,
  focusMissingField,
  type MissingField,
} from "@/lib/forms/missing-fields";
import { scrollToResults } from "@/lib/ux/scroll-to-results";

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
  /** Where the result starts, so the last step can land on it. */
  resultsRef?: RefObject<HTMLElement>;
}

export function CalculatorWizard({
  steps,
  onComplete,
  onBack,
  completeLabel = "See Results",
  resultsRef,
}: CalculatorWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [missing, setMissing] = useState<MissingField[]>([]);
  const fieldsRef = useRef<HTMLDivElement>(null);
  const isLast = currentStep === steps.length - 1;
  const step = steps[currentStep];
  const canProceed = step.canProceed !== false;

  /**
   * Next and See Results check the step's own fields first. A step that is half
   * filled used to advance and leave the reader to guess what the final answer
   * was missing; now it names the field and points at it.
   */
  const next = useCallback(() => {
    const found = findMissingFields(fieldsRef.current);
    if (found.length > 0) {
      setMissing(found);
      focusMissingField(found[0]);
      return;
    }
    setMissing([]);

    if (isLast) {
      onComplete();
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => scrollToResults(resultsRef?.current));
        });
      } else {
        scrollToResults(resultsRef?.current);
      }
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  }, [isLast, onComplete, resultsRef, steps.length]);

  const prev = useCallback(() => {
    setMissing([]);
    if (currentStep === 0) {
      onBack?.();
      return;
    }
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, [currentStep, onBack]);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress dots */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {steps.map((_, i) => (
          <Button
            variant="ghost"
            key={i}
            type="button"
            onClick={() => setCurrentStep(i)}
            className={classNames(
              "h-2.5 rounded-full transition-all",
              i === currentStep
                ? "w-8 bg-primary"
                : i < currentStep
                  ? "w-2.5 bg-accent-green"
                  : "w-2.5 bg-muted dark:bg-muted-foreground",
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
          <h2 className="text-lg font-bold text-foreground dark:text-primary-foreground">
            {step.title}
          </h2>
          {step.subtitle && (
            <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
              {step.subtitle}
            </p>
          )}
        </div>

        {/* Content */}
        <div ref={fieldsRef}>{step.content}</div>

        <div className="mt-4">
          <MissingFieldsNotice fields={missing} />
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-5 dark:border-border border-border">
          <Button
            variant="ghost"
            type="button"
            onClick={prev}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-brand-purple"
          >
            <ChevronLeft className="h-4 w-4" />
            {currentStep === 0 ? "Exit" : "Back"}
          </Button>
          <span className="text-xs text-muted-foreground dark:text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </span>
          <Button
            variant="ghost"
            type="button"
            onClick={next}
            disabled={!canProceed}
            className={classNames(
              "inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all",
              canProceed
                ? "bg-primary hover:bg-primary/90 press-scale"
                : "cursor-not-allowed bg-muted dark:bg-card-foreground/80",
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
          </Button>
        </div>
      </div>
    </div>
  );
}
