import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  _DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/shadcn/dialog';

/**
 * AdminModal — replaces the 31+ custom modal overlays across admin pages.
 * Uses shadcn Dialog (Radix UI) for accessibility: focus trapping,
 * escape-to-close, proper ARIA roles, screen reader support.
 *
 * Preserves FRELUX's visual style: white panel, rounded-xl, shadow-xl,
 * neutral-900/40 backdrop, close button.
 */
export function AdminModal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-2xl',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={`${maxWidth} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between pr-8">
          <DialogTitle className="text-lg font-bold text-brand-navy dark:text-white">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="sr-only">
              {description}
            </DialogDescription>
          )}
        </div>
        <div className="mt-5 space-y-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AdminModal;
