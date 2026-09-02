import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { Button } from "@/components/ui/shadcn/button";

interface HowCalculatedSectionProps {
  methodologyText: string;
  assumptions?: { label: string; value: string }[];
  priceSourceDate?: string;
  priceSource?: string;
}

export default function HowCalculatedSection({
  methodologyText,
  assumptions = [],
  priceSourceDate,
  priceSource,
}: HowCalculatedSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (!methodologyText && assumptions.length === 0) return null;

  return (
    <div className="calc-card mt-4 overflow-hidden rounded-xl border border-border bg-muted/50 dark:border-white/5 dark:bg-white/5">
      <Button variant="ghost"
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted dark:hover:bg-white/5"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-card-foreground dark:text-muted-foreground/80">
          <Info className="h-4 w-4 text-brand-purple" />
          How this estimate is calculated
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        />
      </Button>

      {expanded && (
        <div className="animate-content-reveal border-t border-border px-4 py-3 dark:border-white/5">
          {methodologyText && (
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground dark:text-muted-foreground">
              {methodologyText}
            </pre>
          )}

          {assumptions.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Active assumptions
              </p>
              {assumptions.map((a) => (
                <div key={a.label} className="flex justify-between text-xs">
                  <span className="text-muted-foreground dark:text-muted-foreground">{a.label}</span>
                  <span className="font-medium text-card-foreground dark:text-muted-foreground/80">{a.value}</span>
                </div>
              ))}
            </div>
          )}

          {(priceSourceDate || priceSource) && (
            <div className="mt-3 space-y-1 border-t border-border pt-2 dark:border-white/5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Price information
              </p>
              {priceSource && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground dark:text-muted-foreground">Source</span>
                  <span className="font-medium text-card-foreground dark:text-muted-foreground/80">{priceSource}</span>
                </div>
              )}
              {priceSourceDate && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground dark:text-muted-foreground">Effective date</span>
                  <span className="font-medium text-card-foreground dark:text-muted-foreground/80">{priceSourceDate}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
