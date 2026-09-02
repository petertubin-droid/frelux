import { useState, type ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import { classNames } from '@/lib/utils';
import { Button } from "@/components/ui/shadcn/button";

export default function HelpTip({
  text,
  children,
  side = 'top',
}: {
  text: string;
  children?: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  const [open, setOpen] = useState(false);

  const positionClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  };

  return (
    <span className="relative inline-flex items-center">
      {children}
      <Button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="ml-1 inline-flex shrink-0 items-center text-muted-foreground transition-colors hover:text-brand-purple"
        aria-label="More information"
      >
        <HelpCircle className="h-4 w-4" />
      </Button>
      {open && (
        <span
          role="tooltip"
          className={classNames(
            'absolute z-50 w-56 rounded-lg bg-background px-3 py-2 text-xs font-normal leading-relaxed text-primary-foreground shadow-xl animate-tooltip-in',
            positionClasses[side],
          )}
        >
          {text}
        </span>
      )}
    </span>
  );
}
