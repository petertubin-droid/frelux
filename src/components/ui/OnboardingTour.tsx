import { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { TOUR_STEPS, completeOnboarding } from '@/lib/onboarding';
import { classNames } from '@/lib/utils';
import { Button } from "@/components/ui/shadcn/button";

export function OnboardingTour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'below' as 'below' | 'above' | 'center' });
  const [targetVisible, setTargetVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const currentTour = TOUR_STEPS[step];

  // Scroll target into view when step changes, then position tooltip
  useEffect(() => {
    let scrollTimer: ReturnType<typeof setTimeout>;

    function scrollToTargetAndPosition() {
      const el = document.querySelector(currentTour.target) as HTMLElement | null;

      if (!el) {
        // Element not found — center the tooltip on screen
        setPosition({ top: window.innerHeight / 2 - 120, left: window.innerWidth / 2 - 175, placement: 'center' });
        setTargetVisible(true);
        return;
      }

      // Instant scroll to avoid tooltip position drift during smooth scroll animation
      el.scrollIntoView({ behavior: 'auto', block: 'center' });

      // Position the tooltip immediately after instant scroll
      scrollTimer = setTimeout(() => {
        const rect = el.getBoundingClientRect();
        const tooltipWidth = 350;
        const tooltipHeight = 200;
        const margin = 16;

        let placement: 'below' | 'above' | 'center' = 'below';
        let top = rect.bottom + margin;

        if (rect.bottom + tooltipHeight + margin > window.innerHeight) {
          placement = 'above';
          top = rect.top - tooltipHeight - margin;
        }

        if (top < 0) {
          placement = 'below';
          top = rect.bottom + margin;
        }

        // If still off-screen, clamp into viewport
        if (top + tooltipHeight > window.innerHeight) {
          top = window.innerHeight - tooltipHeight - margin;
        }
        if (top < margin) {
          top = margin;
        }

        let left = rect.left + rect.width / 2 - tooltipWidth / 2;
        left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin));

        setPosition({ top, left, placement });
        setTargetVisible(true);
      }, 80); // Short delay after instant scroll
    }

    setTargetVisible(false);
    scrollToTargetAndPosition();

    return () => {
      clearTimeout(scrollTimer);
    };
  }, [step, currentTour.target]);

  // Reposition on resize AND scroll — keep tooltip anchored to target
  useEffect(() => {
    function reposition() {
      const el = document.querySelector(currentTour.target) as HTMLElement | null;
      if (!el) {
        setPosition({ top: window.innerHeight / 2 - 120, left: window.innerWidth / 2 - 175, placement: 'center' });
        return;
      }
      const rect = el.getBoundingClientRect();
      const tooltipWidth = 350;
      const tooltipHeight = 200;
      const margin = 16;

      let placement: 'below' | 'above' | 'center' = 'below';
      let top = rect.bottom + margin;
      if (rect.bottom + tooltipHeight + margin > window.innerHeight) {
        placement = 'above';
        top = rect.top - tooltipHeight - margin;
      }
      if (top < 0) { placement = 'below'; top = rect.bottom + margin; }
      if (top + tooltipHeight > window.innerHeight) { top = window.innerHeight - tooltipHeight - margin; }
      if (top < margin) { top = margin; }
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin));
      setPosition({ top, left, placement });
    }

    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, { passive: true });
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition);
    };
  }, [step, currentTour.target]);

  function next() {
    if (step < TOUR_STEPS.length - 1) setStep(s => s + 1);
    else finish();
  }

  function prev() {
    if (step > 0) setStep(s => s - 1);
  }

  function finish() {
    completeOnboarding();
    onComplete();
  }

  function skip() {
    completeOnboarding();
    onComplete();
  }

  // Highlight the target element
  useEffect(() => {
    const el = document.querySelector(currentTour.target) as HTMLElement | null;
    if (el) {
      el.style.position = el.style.position || 'relative';
      el.style.zIndex = '60';
      el.classList.add('ring-4', 'ring-brand-purple', 'ring-offset-2', 'ring-offset-white', 'dark:ring-offset-background', 'rounded-xl', 'transition-all', 'duration-300');
    }
    return () => {
      if (el) {
        el.style.zIndex = '';
        el.classList.remove('ring-4', 'ring-brand-purple', 'ring-offset-2', 'ring-offset-white', 'dark:ring-offset-background', 'rounded-xl', 'transition-all', 'duration-300');
      }
    };
  }, [step, currentTour.target]);

  const isLast = step === TOUR_STEPS.length - 1;
  const progress = ((step + 1) / TOUR_STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-[90]" ref={overlayRef}>
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={skip} />

      {/* Tooltip */}
      <div
        className={classNames(
          'absolute w-[350px] max-w-[calc(100vw-2rem)] transition-opacity duration-300',
          targetVisible ? 'opacity-100 animate-fade-in-up' : 'opacity-0 pointer-events-none',
        )}
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
      >
        <div className="overflow-hidden rounded-2xl border border-brand-purple/20 bg-card shadow-2xl dark:bg-card">
          {/* Header with progress bar */}
          <div className="relative bg-gradient-to-r from-primary to-primary-light px-5 py-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentTour.icon}</span>
                <div>
                  <h3 className="text-base font-bold text-primary-foreground">{currentTour.title}</h3>
                  <p className="text-[11px] text-primary-foreground/70">Step {step + 1} of {TOUR_STEPS.length}</p>
                </div>
              </div>
              <Button variant="ghost" onClick={skip} className="rounded-lg p-1 text-primary-foreground/70 transition-colors hover:bg-white/10 hover:text-primary-foreground" aria-label="Skip tour">
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-card transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <p className="text-sm leading-relaxed text-muted-foreground dark:text-muted-foreground/80">{currentTour.description}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-border/50 px-5 py-3 dark:border-white/5">
            <Button variant="ghost"
              onClick={prev}
              disabled={step === 0}
              className={classNames(
                'flex items-center gap-1 text-sm font-medium transition-colors',
                step === 0 ? 'text-muted-foreground/80 dark:text-muted-foreground' : 'text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-muted-foreground/60',
              )}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button variant="default"
              onClick={next}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all hover:/90 press-scale"
            >
              {isLast ? (
                <>
                  <Check className="h-4 w-4" /> Got it!
                </>
              ) : (
                <>
                  {currentTour.cta || 'Next'} <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Arrow pointing to target */}
        {position.placement === 'below' && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2">
            <div className="h-4 w-4 rotate-45 border-l border-t border-brand-purple/20 bg-card dark:bg-card" />
          </div>
        )}
      </div>
    </div>
  );
}
