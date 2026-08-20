import { useState, useEffect } from 'react';
import { X, Check, ShoppingBag, Share2, Printer } from 'lucide-react';
import type { ShoppingListItem } from '@/lib/shopping-list';
import { shoppingListToText } from '@/lib/shopping-list';
import { shareTextOnWhatsApp } from '@/lib/share';
import { classNames } from '@/lib/utils';

interface ShoppingListModalProps {
  items: ShoppingListItem[];
  title: string;
  onClose: () => void;
}

export function ShoppingListModal({ items: initialItems, title, onClose }: ShoppingListModalProps) {
  const [items, setItems] = useState<ShoppingListItem[]>(initialItems);

  // Load checked state from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem(`shopping_list_${title}`);
    if (saved) {
      const checkedIds = JSON.parse(saved) as number[];
      setItems((prev) => prev.map((item, i) => ({ ...item, checked: checkedIds.includes(i) })));
    }
  }, [title]);

  // Save checked state
  useEffect(() => {
    const checkedIds = items.map((item, i) => item.checked ? i : -1).filter((i) => i >= 0);
    sessionStorage.setItem(`shopping_list_${title}`, JSON.stringify(checkedIds));
  }, [items, title]);

  function toggleItem(index: number) {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, checked: !item.checked } : item));
  }

  function handleShare() {
    shareTextOnWhatsApp(shoppingListToText(items));
  }

  function handlePrint() {
    const printHtml = `
      <html><head><title>${title}</title>
      <style>
        body { font-family: sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
        h1 { color: #7C3AED; }
        ul { list-style: none; padding: 0; }
        li { padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
        .checked { text-decoration: line-through; color: #999; }
      </style></head>
      <body>
        <h1>📋 ${title}</h1>
        <p style="color:#666;margin-bottom:20px;">Generated ${new Date().toLocaleDateString()}</p>
        <ul>
          ${items.map((item, i) => `<li class="${item.checked ? 'checked' : ''}">${item.checked ? '✅' : '☐'} ${item.quantity}, ${item.name}${item.detail ? ` <em>(${item.detail})</em>` : ''}</li>`).join('')}
        </ul>
      </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(printHtml); w.document.close(); }
  }

  const checkedCount = items.filter((i) => i.checked).length;
  const progress = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 dark:bg-black/60">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-brand-navy-mid">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-brand-purple" />
            <h2 className="text-lg font-bold text-brand-navy dark:text-white">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress bar */}
        {items.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
              <span>{checkedCount} of {items.length} items</span>
              <span>{progress}% complete</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
              <div className="h-full rounded-full bg-brand-purple transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Items */}
        <div className="space-y-2">
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleItem(i)}
              className={classNames(
                'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all',
                item.checked
                  ? 'border-accent-green/30 bg-accent-green/5'
                  : 'border-neutral-200 hover:border-brand-purple/30 dark:border-neutral-700 dark:hover:border-brand-purple/30',
              )}
            >
              <span className={classNames(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all',
                item.checked ? 'border-accent-green bg-accent-green text-white' : 'border-neutral-300 dark:border-neutral-600',
              )}>
                {item.checked && <Check className="h-3.5 w-3.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={classNames('text-sm font-semibold', item.checked ? 'text-neutral-400 line-through dark:text-neutral-500' : 'text-brand-navy dark:text-white')}>
                  {item.quantity}, {item.name}
                </p>
                {item.detail && <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">{item.detail}</p>}
              </div>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={handleShare} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-accent-green px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-green/90">
            <Share2 className="h-4 w-4" /> Share on WhatsApp
          </button>
          <button type="button" onClick={handlePrint} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-bold text-neutral-600 transition-colors hover:border-brand-purple hover:text-brand-purple dark:border-neutral-700 dark:text-neutral-300">
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
      </div>
    </div>
  );
}
