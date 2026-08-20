import { useState, useEffect } from 'react';
import { X, ArrowLeftRight } from 'lucide-react';
import { getRecentTools } from '@/lib/smart-defaults';

interface CompareEntry {
  id: string;
  label: string;
  data: Record<string, string | number>;
  savedAt: string;
}

const STORAGE_KEY = 'frelux_compare_results';
const MAX_ENTRIES = 4;

/** Save a calculation result for comparison */
export function saveForComparison(id: string, label: string, data: Record<string, string | number>): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const entries: CompareEntry[] = raw ? JSON.parse(raw) : [];
    const filtered = entries.filter(e => e.id !== id);
    filtered.unshift({ id, label, data, savedAt: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ENTRIES)));
  } catch { /* ignore */ }
}

/** Get all saved comparison entries */
export function getComparisonEntries(): CompareEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Clear all comparison entries */
export function clearComparison(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

/** Remove a single entry */
export function removeFromComparison(id: string): void {
  const entries = getComparisonEntries().filter(e => e.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch { /* ignore */ }
}

export function CompareResults({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [entries, setEntries] = useState<CompareEntry[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      const all = getComparisonEntries();
      setEntries(all);
      setSelected(all.slice(0, 2).map(e => e.id));
    }
  }, [open]);

  if (!open) return null;

  const selectedEntries = entries.filter(e => selected.includes(e.id));
  const allKeys = Array.from(new Set(selectedEntries.flatMap(e => Object.keys(e.data))));

  function toggle(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (prev.length >= 2) return [prev[prev.length - 1], id];
      return [...prev, id];
    });
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[8vh] px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-white/10 dark:bg-brand-navy-mid animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-white/5">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-brand-purple" />
            <h2 className="text-lg font-bold text-brand-navy dark:text-white">Compare Results</h2>
          </div>
          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              <button onClick={() => { clearComparison(); setEntries([]); setSelected([]); }} className="text-xs font-medium text-neutral-400 hover:text-red-500">
                Clear all
              </button>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/5" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="py-16 text-center">
            <ArrowLeftRight className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
            <p className="text-sm font-semibold text-neutral-500">No saved results to compare</p>
            <p className="mt-1 text-xs text-neutral-400">Complete a calculation and save it for comparison to see side-by-side results here.</p>
          </div>
        ) : (
          <>
            {/* Selection chips */}
            <div className="border-b border-neutral-100 px-5 py-3 dark:border-white/5">
              <p className="mb-2 text-xs font-medium text-neutral-400">Select 2 to compare ({selected.length}/2 selected):</p>
              <div className="flex flex-wrap gap-2">
                {entries.map(e => (
                  <button
                    key={e.id}
                    onClick={() => toggle(e.id)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      selected.includes(e.id)
                        ? 'border-brand-purple bg-brand-purple/10 text-brand-purple dark:text-brand-purple-lighter'
                        : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-white/10'
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Comparison table */}
            {selectedEntries.length >= 2 ? (
              <div className="overflow-x-auto p-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-white/5">
                      <th className="pb-2 pr-4 text-left text-xs font-bold uppercase tracking-wider text-neutral-400">Metric</th>
                      {selectedEntries.map(e => (
                        <th key={e.id} className="pb-2 px-3 text-left text-sm font-bold text-brand-navy dark:text-white">{e.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allKeys.map(key => (
                      <tr key={key} className="border-b border-neutral-50 dark:border-white/5">
                        <td className="py-2.5 pr-4 text-xs font-medium text-neutral-400">{key}</td>
                        {selectedEntries.map(e => {
                          const val = e.data[key] ?? '—';
                          // Highlight differences
                          const values = selectedEntries.map(se => se.data[key]);
                          const isDifferent = values.some(v => v !== values[0]);
                          return (
                            <td key={e.id} className={`py-2.5 px-3 font-semibold ${isDifferent ? 'text-brand-purple dark:text-brand-purple-lighter' : 'text-neutral-700 dark:text-neutral-200'}`}>
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm text-neutral-400">Select at least 2 results to compare</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
