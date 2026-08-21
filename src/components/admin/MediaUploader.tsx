import { useState } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { MediaPicker } from '@/components/admin/MediaPicker';

interface MediaUploaderProps {
  value: string | null | undefined;
  onChange: (url: string) => void;
  label?: string;
  folder?: string;
  className?: string;
}

export function MediaUploader({ value, onChange, label, folder = 'branding', className }: MediaUploaderProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className={className}>
      {label && <span className="mb-1.5 block text-sm font-semibold text-neutral-700 dark:text-neutral-200">{label}</span>}
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-white/5">
          {value ? (
            <img src={value} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-300">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-purple px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-purple-dark"
          >
            <Upload className="h-3.5 w-3.5" />
            {value ? 'Change Image' : 'Upload / Select'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500 hover:text-red-500"
            >
              <X className="h-3 w-3" /> Remove
            </button>
          )}
        </div>
      </div>
      {value && (
        <input
          type="text"
          value={value}
          readOnly
          className="mt-2 w-full rounded-lg border border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-white/5 px-3 py-1.5 text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500"
        />
      )}
      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(url) => onChange(url)}
        defaultFolder={folder}
      />
    </div>
  );
}
