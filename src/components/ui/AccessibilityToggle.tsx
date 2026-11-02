import { useState, useRef, useEffect } from "react";
import {
  Accessibility,
  Contrast,
  Type,
  Zap,
  Check,
  ChevronDown,
} from "lucide-react";
import { useAccessibility } from "@/lib/accessibility";
import { classNames } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";

export function AccessibilityToggle({
  compact = false,
  inline = false,
}: {
  compact?: boolean;
  inline?: boolean;
}) {
  const {
    highContrast,
    toggleHighContrast,
    largeText,
    toggleLargeText,
    reducedMotion,
    toggleReducedMotion,
  } = useAccessibility();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeCount = [highContrast, largeText, reducedMotion].filter(
    Boolean,
  ).length;

  // ── Inline mode: expandable section for narrow drawers ──
  if (inline) {
    return (
      <div ref={ref} className="w-full">
        <Button variant="ghost"
          type="button"
          onClick={() => setOpen(!open)}
          className={classNames(
            "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            activeCount > 0
              ? "text-brand-purple dark:text-brand-purple-lighter"
              : "text-muted-foreground hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:bg-white/5",
          )}
        >
          <span className="flex items-center gap-2">
            <Accessibility className="h-4 w-4" />
            Accessibility
            {activeCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </span>
          <ChevronDown
            className={classNames(
              "h-3.5 w-3.5 transition-transform",
              open && "rotate-180",
            )}
          />
        </Button>
        {open && (
          <div className="mt-1 space-y-1 rounded-lg border border-border/50 bg-muted/50 p-2 dark:border-white/5 dark:bg-white/5">
            <Button variant="ghost"
              type="button"
              onClick={toggleHighContrast}
              className={classNames(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                highContrast
                  ? "bg-primary/10 text-brand-purple dark:text-brand-purple-lighter"
                  : "text-muted-foreground hover:bg-muted dark:text-muted-foreground/80 dark:hover:bg-white/5",
              )}
            >
              <Contrast className="h-4 w-4" />
              <span className="flex-1 text-left">High contrast</span>
              {highContrast && <Check className="h-4 w-4" />}
            </Button>
            <Button variant="ghost"
              type="button"
              onClick={toggleLargeText}
              className={classNames(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                largeText
                  ? "bg-primary/10 text-brand-purple dark:text-brand-purple-lighter"
                  : "text-muted-foreground hover:bg-muted dark:text-muted-foreground/80 dark:hover:bg-white/5",
              )}
            >
              <Type className="h-4 w-4" />
              <span className="flex-1 text-left">Larger text</span>
              {largeText && <Check className="h-4 w-4" />}
            </Button>
            <Button variant="ghost"
              type="button"
              onClick={toggleReducedMotion}
              className={classNames(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                reducedMotion
                  ? "bg-primary/10 text-brand-purple dark:text-brand-purple-lighter"
                  : "text-muted-foreground hover:bg-muted dark:text-muted-foreground/80 dark:hover:bg-white/5",
              )}
            >
              <Zap className="h-4 w-4" />
              <span className="flex-1 text-left">Reduce motion</span>
              {reducedMotion && <Check className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ── Dropdown mode (desktop navbar) ──
  return (
    <div ref={ref} className="relative">
      <Button variant="ghost"
        type="button"
        onClick={() => setOpen(!open)}
        className={classNames(
          "relative inline-flex items-center gap-1.5 rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-card-foreground dark:text-muted-foreground dark:hover:bg-white/5 dark:hover:text-muted-foreground/60",
          compact && "p-1.5",
          activeCount > 0 && "text-brand-purple hover:text-brand-purple",
        )}
        aria-label="Accessibility settings"
      >
        <Accessibility className={compact ? "h-4 w-4" : "h-[18px] w-[18px]"} />
        {activeCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
            {activeCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[220px] rounded-xl border border-border/40 bg-card py-1.5 shadow-lg dark:border-white/10 dark:bg-card">
          <p className="px-4 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Accessibility
          </p>

          <Button variant="ghost"
            type="button"
            onClick={toggleHighContrast}
            className={classNames(
              "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors",
              highContrast
                ? "bg-primary/5 text-brand-purple dark:text-brand-purple-lighter"
                : "text-muted-foreground hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:bg-white/5",
            )}
          >
            <Contrast className="h-4 w-4" />
            <span className="flex-1 text-left">High contrast</span>
            {highContrast && <Check className="h-4 w-4" />}
          </Button>

          <Button variant="ghost"
            type="button"
            onClick={toggleLargeText}
            className={classNames(
              "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors",
              largeText
                ? "bg-primary/5 text-brand-purple dark:text-brand-purple-lighter"
                : "text-muted-foreground hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:bg-white/5",
            )}
          >
            <Type className="h-4 w-4" />
            <span className="flex-1 text-left">Larger text</span>
            {largeText && <Check className="h-4 w-4" />}
          </Button>

          <Button variant="ghost"
            type="button"
            onClick={toggleReducedMotion}
            className={classNames(
              "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors",
              reducedMotion
                ? "bg-primary/5 text-brand-purple dark:text-brand-purple-lighter"
                : "text-muted-foreground hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:bg-white/5",
            )}
          >
            <Zap className="h-4 w-4" />
            <span className="flex-1 text-left">Reduce motion</span>
            {reducedMotion && <Check className="h-4 w-4" />}
          </Button>

          <div className="mt-1 border-t border-border/50 px-4 py-2 dark:border-white/5">
            <p className="text-xs text-muted-foreground">
              Settings saved to your device.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
