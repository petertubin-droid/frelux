import { Save, FileDown, Share2, MessageCircle, RotateCcw } from 'lucide-react';
import { classNames } from '@/lib/utils';

export default function StickyActionBar({
  onSave,
  onExport,
  onShare,
  onAskAi,
  onRecalculate,
  saveLabel = 'Save',
}: {
  onSave?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onAskAi?: () => void;
  onRecalculate?: () => void;
  saveLabel?: string;
}) {
  const buttons = [
    onSave && { label: saveLabel, icon: Save, onClick: onSave, primary: true },
    onExport && { label: 'Export', icon: FileDown, onClick: onExport, primary: false },
    onShare && { label: 'Share', icon: Share2, onClick: onShare, primary: false },
    onAskAi && { label: 'Ask AI', icon: MessageCircle, onClick: onAskAi, primary: false },
    onRecalculate && { label: 'Recalculate', icon: RotateCcw, onClick: onRecalculate, primary: false },
  ].filter(Boolean) as { label: string; icon: typeof Save; onClick: () => void; primary: boolean }[];

  if (buttons.length === 0) return null;

  return (
    <div className="sticky bottom-0 z-30 mt-6 border-t border-neutral-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 px-4 py-3">
        {buttons.map((btn) => (
          <button type="button"
            key={btn.label}
            onClick={btn.onClick}
            className={classNames(
              'press-scale inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all sm:px-4',
              btn.primary
                ? 'bg-brand-purple text-white hover:bg-brand-purple/90'
                : 'border border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50',
            )}
          >
            <btn.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{btn.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
