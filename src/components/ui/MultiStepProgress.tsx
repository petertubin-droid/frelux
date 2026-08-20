import { Check } from 'lucide-react';
import { classNames } from '@/lib/utils';

export interface StepInfo {
  label: string;
  shortLabel?: string;
}

export default function MultiStepProgress({
  steps,
  current,
  className,
}: {
  steps: StepInfo[];
  current: number;
  className?: string;
}) {
  return (
    <div className={classNames('w-full', className)}>
      <div className="flex items-center gap-1 sm:gap-2">
        {steps.map((step, i) => {
          const isComplete = i < current;
          const isCurrent = i === current;
          const isLast = i === steps.length - 1;
          return (
            <div key={i} className="flex flex-1 items-center gap-1 sm:gap-2">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div
                  className={classNames(
                    'flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 sm:text-sm',
                    isComplete && 'bg-brand-purple text-white',
                    isCurrent && 'bg-brand-purple text-white ring-4 ring-brand-purple/20 animate-success-pop',
                    !isComplete && !isCurrent && 'bg-neutral-200 dark:bg-white/10 text-neutral-400 dark:bg-white/10 dark:text-neutral-500',
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={classNames(
                    'hidden text-[11px] font-medium sm:block sm:text-xs',
                    isCurrent ? 'text-brand-purple' : isComplete ? 'text-neutral-700 dark:text-neutral-200' : 'text-neutral-400',
                  )}
                >
                  {step.label}
                </span>
                <span
                  className={classNames(
                    'block text-[10px] font-medium sm:hidden',
                    isCurrent ? 'text-brand-purple' : 'text-neutral-400',
                  )}
                >
                  {step.shortLabel ?? step.label}
                </span>
              </div>
              {!isLast && (
                <div className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10">
                  <div
                    className="absolute inset-y-0 left-0 bg-brand-purple transition-all duration-500 ease-out"
                    style={{ width: isComplete ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
