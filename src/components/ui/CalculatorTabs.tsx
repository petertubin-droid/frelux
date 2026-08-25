import { classNames } from '@/lib/utils';

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
    <div className="sticky top-[72px] z-30 border-b border-neutral-200/80 bg-white/95 backdrop-blur-md dark:border-white/5 dark:bg-brand-navy-mid/95">
      <div className="mx-auto max-w-5xl px-4">
        <div
          role="tablist"
          aria-label={ariaLabel}
          className="flex gap-1 overflow-x-auto py-2 sm:justify-center"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={classNames(
                'shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-all',
                activeTab === tab.id
                  ? 'bg-brand-purple text-white shadow-sm'
                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-200'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
