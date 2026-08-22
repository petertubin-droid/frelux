import { useState, useEffect } from 'react';
import { Lightbulb, Wand2, ChevronDown } from 'lucide-react';
import { calculateSmartWaste, type SurfaceCondition, type ApplicationMethod } from '@/lib/smart-waste';
import type { ProjectType } from '@/types';
import { classNames } from '@/lib/utils';

interface SmartWasteSelectorProps {
  projectType: ProjectType;
  coats: number;
  onWasteChange: (wasteMargin: number) => void;
  currentWaste: number;
}

export function SmartWasteSelector({ projectType, coats, onWasteChange, currentWaste }: SmartWasteSelectorProps) {
  const [expanded, setExpanded] = useState(false);
  const [surface, setSurface] = useState<SurfaceCondition>('smooth');
  const [method, setMethod] = useState<ApplicationMethod>('roller');
  const [isRepair, setIsRepair] = useState(false);
  const [result, setResult] = useState<{ wasteMargin: number; reason: string } | null>(null);

  function compute() {
    const res = calculateSmartWaste({ projectType, surfaceCondition: surface, applicationMethod: method, coats, isRepair });
    setResult({ wasteMargin: res.wasteMargin, reason: res.reason });
    onWasteChange(res.wasteMargin);
  }

  // Auto-compute on input change
  useEffect(() => {
    if (expanded) compute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surface, method, isRepair, projectType, coats, expanded]);

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
      >
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-brand-purple" />
          <span className="text-sm font-semibold text-brand-navy dark:text-white">Smart waste calculator</span>
          {result && !expanded && (
            <span className="rounded-full bg-brand-purple/10 px-2 py-0.5 text-xs font-bold text-brand-purple">
              {result.wasteMargin}%
            </span>
          )}
        </div>
        <ChevronDown className={classNames('h-4 w-4 text-neutral-400 transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="border-t border-neutral-100 p-3 dark:border-white/5">
          {/* Surface condition */}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-neutral-500">Surface condition</label>
            <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(['smooth', 'textured', 'rough'] as SurfaceCondition[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSurface(s)}
                  className={classNames(
                    'rounded-lg border py-2 text-xs font-medium capitalize transition-all',
                    surface === s
                      ? 'border-brand-purple bg-brand-purple/5 text-brand-purple'
                      : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Application method */}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-neutral-500">Application method</label>
            <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(['brush', 'roller', 'spray'] as ApplicationMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={classNames(
                    'rounded-lg border py-2 text-xs font-medium capitalize transition-all',
                    method === m
                      ? 'border-brand-purple bg-brand-purple/5 text-brand-purple'
                      : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700',
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Repair work */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Repair / patch work?</span>
            <button
              type="button"
              onClick={() => setIsRepair(!isRepair)}
              className={classNames(
                'relative h-5 w-9 rounded-full transition-colors',
                isRepair ? 'bg-accent-green' : 'bg-neutral-300',
              )}
            >
              <span className={classNames('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform', isRepair ? 'translate-x-4' : 'translate-x-0.5')} />
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className="mt-3 rounded-lg bg-brand-purple/5 p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-bold text-brand-purple">
                  <Lightbulb className="h-4 w-4" />
                  Recommended: {result.wasteMargin}% waste
                </span>
                <span className="text-xs text-neutral-400">Current: {currentWaste}%</span>
              </div>
              <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{result.reason}</p>
              <button
                type="button"
                onClick={() => onWasteChange(result.wasteMargin)}
                className="mt-2 w-full rounded-lg bg-brand-purple py-2 text-xs font-bold text-white transition-colors hover:bg-brand-purple/90"
              >
                Apply {result.wasteMargin}% to calculation
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
