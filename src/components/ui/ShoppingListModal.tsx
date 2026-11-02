import { useState, useEffect } from "react";
import { X, Check, ShoppingBag, Share2, Printer } from "lucide-react";
import type { ShoppingListItem } from "@/lib/shopping-list";
import { shoppingListToText } from "@/lib/shopping-list";
import { shareTextOnWhatsApp } from "@/lib/share";
import { classNames } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";
import { printQuote } from "@/lib/estimation/quote-export";

interface ShoppingListModalProps {
  items: ShoppingListItem[];
  title: string;
  onClose: () => void;
}

export function ShoppingListModal({
  items: initialItems,
  title,
  onClose,
}: ShoppingListModalProps) {
  const [items, setItems] = useState<ShoppingListItem[]>(initialItems);

  // Load checked state from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem(`shopping_list_${title}`);
    if (saved) {
      const checkedIds = JSON.parse(saved) as number[];
      setItems((prev) =>
        prev.map((item, i) => ({ ...item, checked: checkedIds.includes(i) })),
      );
    }
  }, [title]);

  // Save checked state
  useEffect(() => {
    const checkedIds = items
      .map((item, i) => (item.checked ? i : -1))
      .filter((i) => i >= 0);
    sessionStorage.setItem(
      `shopping_list_${title}`,
      JSON.stringify(checkedIds),
    );
  }, [items, title]);

  function toggleItem(index: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item,
      ),
    );
  }

  function handleShare() {
    shareTextOnWhatsApp(shoppingListToText(items));
  }

  function handlePrint() {
    const completedCount = items.filter((i) => i.checked).length;
    printQuote(
      {
        title: title || "Shopping List",
        subtitle: `Generated ${new Date().toLocaleDateString()} · ${items.length} item(s)`,
        metaRows: [
          ["Shopping List", title || "Shopping List"],
          ["Total Items", String(items.length)],
          ["Completed", `${completedCount} of ${items.length} items`],
        ],
        lines: items.map((item) => ({
          label: `${item.checked ? "[Completed] " : ""}${item.name}`,
          quantity: String(item.quantity),
          unit: "",
          unit_price: "-",
          line_total: "-",
          detail: item.detail,
        })),
        totals: [],
        footer:
          "FRELUX Smart Construction Estimation. Take this checklist to your supplier or store.",
      },
      `${(title || "shopping-list").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`,
    );
  }

  const allChecked = items.length > 0 && items.every((i) => i.checked);
  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-2xl dark:border-border dark:bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 dark:border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-green/10 text-accent-green">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground dark:text-primary-foreground">
                {title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {checkedCount} of {items.length} items checked
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-card hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full bg-muted dark:bg-muted/50">
          <div
            className="h-full bg-accent-green transition-all duration-300"
            style={{
              width: `${items.length > 0 ? (checkedCount / items.length) * 100 : 0}%`,
            }}
          />
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-2">
            {items.map((item, index) => (
              <Button
                variant="ghost"
                key={index}
                type="button"
                onClick={() => toggleItem(index)}
                className={classNames(
                  "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all",
                  item.checked
                    ? "border-accent-green/20 bg-accent-green/5 dark:border-accent-green/10 dark:bg-accent-green/5"
                    : "border-border bg-card hover:border-border dark:border-border dark:bg-card dark:hover:border-border",
                )}
              >
                <div
                  className={classNames(
                    "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors",
                    item.checked
                      ? "border-accent-green bg-accent-green text-primary-foreground"
                      : "border-border bg-card dark:border-border dark:bg-card",
                  )}
                >
                  {item.checked && <Check className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className={classNames(
                      "text-sm font-medium",
                      item.checked
                        ? "text-muted-foreground line-through"
                        : "text-foreground dark:text-primary-foreground",
                    )}
                  >
                    {item.name}
                  </span>
                  {item.detail && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.detail}
                    </p>
                  )}
                </div>
                <span
                  className={classNames(
                    "flex-shrink-0 rounded-md px-2 py-0.5 text-xs font-bold",
                    item.checked
                      ? "bg-accent-green/10 text-accent-green"
                      : "bg-muted text-foreground dark:bg-muted dark:text-muted-foreground",
                  )}
                >
                  {item.quantity}
                </span>
              </Button>
            ))}
          </div>

          {allChecked && (
            <div className="mt-4 rounded-xl border border-accent-green/20 bg-accent-green/10 p-3 text-center">
              <p className="text-xs font-bold text-accent-green">
                All items checked off! You're ready to start.
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-3 border-t border-border px-6 py-4 dark:border-border">
          <Button
            variant="ghost"
            type="button"
            onClick={handleShare}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-accent-green px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-accent-green/90"
          >
            <Share2 className="h-4 w-4" /> Share on WhatsApp
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:border-brand-purple hover:text-brand-purple dark:border-border border-border dark:text-muted-foreground/80"
          >
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>
    </div>
  );
}
