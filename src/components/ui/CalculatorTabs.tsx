import { classNames } from '@/lib/utils';
import { Button } from "@/components/ui/shadcn/button";

export interface CalculatorTab {
  id: string;
  label: string;
  icon?: typeof import('lucide-react').Calculator;
}

interface CalculatorTabsProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  ariaLabel?: string;
}

export default function CalculatorTabs({ tabs, activeTab, onTabChange, ariaLabel = 'Calculator mode' }: CalculatorTabsProps) {
  return (
    <div className="sticky top-[72px] z-30 border-b border-border/80 bg-white/95 backdrop-blur-md dark:border-white/5 dark:bg-background-mid/95">
      <div className="mx-auto max-w-5xl px-4">
        <div
          role="tablist"
          aria-label={ariaLabel}
          className="flex gap-1.5 overflow-x-auto py-2.5 sm:justify-center"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                id={`tab-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={classNames(
                  'shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300',
                  isActive
                    ? 'calc-tab-active bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-card-foreground dark:text-muted-foreground dark:hover:bg-white/5 dark:hover:text-muted-foreground/60',
                )}
              >
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
