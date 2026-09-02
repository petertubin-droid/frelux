import { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import type { CalculatorType } from '@/types/database';
import { Button } from "@/components/ui/shadcn/button";

interface SaveTemplateModalProps {
  open: boolean;
  onClose: () => void;
  calculatorType: CalculatorType;
  inputData: Record<string, unknown>;
  onSave: (name: string, description: string | undefined) => Promise<void>;
  defaultName?: string;
}

export default function SaveTemplateModal({
  open,
  onClose,
  onSave,
  defaultName,
}: SaveTemplateModalProps) {
  const [name, setName] = useState(defaultName ?? '');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a template name');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl dark:border-white/10 dark:bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground dark:text-primary-foreground">
            Save as Template
          </h2>
          <Button variant="ghost" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-card-foreground dark:hover:bg-white/5 dark:hover:text-primary-foreground">
            <X aria-hidden="true" className="h-5 w-5" />
          </Button>
        </div>

        <p className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground">
          Save your current calculator inputs to reuse later. Results are recalculated fresh each time.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-card-foreground dark:text-muted-foreground/80">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 10×12 Living Room"
              autoFocus
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple dark:border-white/10 dark:bg-white/5 dark:text-primary-foreground dark:placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-card-foreground dark:text-muted-foreground/80">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Living room with 2 coats, ceiling included"
              rows={2}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple dark:border-white/10 dark:bg-white/5 dark:text-primary-foreground dark:placeholder:text-muted-foreground"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 dark:border-white/10 dark:text-muted-foreground/80 dark:hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button variant="default"
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors hover:/90 disabled:opacity-50"
            >
              {saving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
