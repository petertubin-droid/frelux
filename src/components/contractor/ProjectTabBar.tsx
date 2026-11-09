import type { LucideIcon } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/shadcn/button";

export interface ProjectTab {
  key: string;
  label: string;
  icon: LucideIcon;
}

export interface ProjectTabBarProps<T extends ProjectTab> {
  tabs: readonly T[];
  activeTab: string;
  onChange: (key: T["key"]) => void;
  label: string;
  panelId: string;
}

/**
 * The project section bar.
 *
 * These are in-page sections, not links, so the bar exposes tab semantics:
 * a screen reader announces "tab, selected, 3 of 12" instead of reading a
 * current-page link. Arrow keys, Home and End move between sections the way
 * every native tablist does, and only the active tab sits in the tab order so
 * a keyboard user does not have to step through twelve buttons to leave.
 */
export function ProjectTabBar<T extends ProjectTab>({
  tabs,
  activeTab,
  onChange,
  label,
  panelId,
}: ProjectTabBarProps<T>) {
  const refs = useRef(new Map<string, HTMLButtonElement>());

  const focusAt = (index: number) => {
    const wrapped = (index + tabs.length) % tabs.length;
    const tab = tabs[wrapped];
    onChange(tab.key);
    refs.current.get(tab.key)?.focus();
  };

  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.key === activeTab),
  );

  return (
    <nav aria-label={label} className="flex gap-1 overflow-x-auto py-2">
      <div role="tablist" aria-label={label} className="flex gap-1">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = tab.key === activeTab;
          return (
            <Button
              key={tab.key}
              ref={(node) => {
                if (node) refs.current.set(tab.key, node);
                else refs.current.delete(tab.key);
              }}
              variant="ghost"
              role="tab"
              id={`project-tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.key)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  focusAt(index + 1);
                } else if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  focusAt(index - 1);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  focusAt(0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  focusAt(tabs.length - 1);
                }
              }}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {tab.label}
            </Button>
          );
        })}
      </div>
      <span className="sr-only" aria-live="polite">
        {tabs[activeIndex]?.label}
      </span>
    </nav>
  );
}
