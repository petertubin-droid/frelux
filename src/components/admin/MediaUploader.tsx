import { useState } from "react";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { Button } from "@/components/ui/shadcn/button";

interface MediaUploaderProps {
  value: string | null | undefined;
  onChange: (url: string) => void;
  label?: string;
  folder?: string;
  className?: string;
}

export function MediaUploader({
  value,
  onChange,
  label,
  folder = "branding",
  className,
}: MediaUploaderProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className={className}>
      {label && (
        <span className="mb-1.5 block text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
          {label}
        </span>
      )}
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border dark:border-white/5 bg-muted/50 dark:bg-white/5">
          {value ? (
            <img
              src={value}
              alt="Preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/80">
              <ImageIcon aria-hidden="true" className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            variant="default"
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Upload aria-hidden="true" className="h-3.5 w-3.5" />
            {value ? "Change Image" : "Upload / Select"}
          </Button>
          {value && (
            <Button
              variant="ghost"
              type="button"
              onClick={() => onChange("")}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground dark:text-muted-foreground hover:text-red-500"
            >
              <X className="h-3 w-3" /> Remove
            </Button>
          )}
        </div>
      </div>
      {value && (
        <input
          type="text"
          value={value}
          readOnly
          className="mt-2 w-full rounded-lg border border-border dark:border-white/5 bg-muted/50 dark:bg-white/5 px-3 py-1.5 text-xs text-muted-foreground dark:text-muted-foreground"
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
