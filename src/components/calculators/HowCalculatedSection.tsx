/**
 * HowCalculatedSection — shows the active assumptions and methodology
 * for a calculator. The text comes from the admin-configured
 * estimation_calc_rules table (how_calculated_text rule).
 *
 * Also renders the active admin-configured values (coverage rates,
 * waste margins, etc.) so users can see exactly what assumptions
 * are driving their estimate.
 */

import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';

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
    <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 dark:border-white/5 dark:bg-white/5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          <Info className="h-4 w-4 text-brand-purple" />
          How this estimate is calculated
        </span>
        <ChevronDown
          className={`h-4 w-4 text-neutral-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-neutral-200 px-4 py-3 dark:border-white/5">
          {methodologyText && (
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              {methodologyText}
            </pre>
          )}

          {assumptions.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                Active assumptions
              </p>
              {assumptions.map((a) => (
                <div key={a.label} className="flex justify-between text-xs">
                  <span className="text-neutral-500 dark:text-neutral-400">{a.label}</span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">{a.value}</span>
                </div>
              ))}
            </div>
          )}

          {(priceSourceDate || priceSource) && (
            <div className="mt-3 space-y-1 border-t border-neutral-200 pt-2 dark:border-white/5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                Price information
              </p>
              {priceSource && (
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500 dark:text-neutral-400">Source</span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">{priceSource}</span>
                </div>
              )}
              {priceSourceDate && (
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500 dark:text-neutral-400">Effective date</span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">{priceSourceDate}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
