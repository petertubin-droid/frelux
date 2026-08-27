/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Home,
  Calculator,
  Palette,
  DollarSign,
  Layers,
  Grid3x3,
  FolderOpen,
  FileText,
  Bot,
  Book,
  ArrowRight,
  Clock,
  Zap,
} from "lucide-react";
import { getRecentTools } from "@/lib/smart-defaults";
import { classNames } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  keywords?: string;
  category: string;
}

const ALL_COMMANDS: CommandItem[] = [
  // Calculators
  {
    id: "paint-calc",
    label: "Paint Calculator",
    description: "Calculate paint quantities",
    icon: Calculator,
    path: "/paint-calculator",
    keywords: "paint wall room fence estimate",
    category: "Calculators",
  },
  {
    id: "screeding-calc",
    label: "Screeding Calculator",
    description: "Calculate screeding materials",
    icon: Layers,
    path: "/screeding-calculator",
    keywords: "screeding floor cement",
    category: "Calculators",
  },
  {
    id: "pop-calc",
    label: "POP Ceiling Calculator",
    description: "Calculate POP ceiling materials",
    icon: Grid3x3,
    path: "/pop-ceiling-calculator",
    keywords: "pop ceiling gypsum board",
    category: "Calculators",
  },
  {
    id: "tile-calc",
    label: "Tile Calculator",
    description: "Calculate tile quantities",
    icon: Grid3x3,
    path: "/tile-calculator",
    keywords: "tile floor wall ceramic",
    category: "Calculators",
  },
  {
    id: "finish-calc",
    label: "Finish Estimator",
    description: "Estimate finishing options",
    icon: Calculator,
    path: "/finish-estimator",
    keywords: "finish estimator",
    category: "Calculators",
  },

  // Estimators
  {
    id: "cost-est",
    label: "Cost Estimator",
    description: "Estimate total painting cost",
    icon: DollarSign,
    path: "/paint-calculator?mode=cost",
    keywords: "cost price budget money",
    category: "Estimators",
  },
  {
    id: "screeding-cost",
    label: "Screeding Cost Estimator",
    description: "Estimate screeding cost",
    icon: DollarSign,
    path: "/screeding-calculator?mode=cost",
    keywords: "screeding cost price",
    category: "Estimators",
  },
  {
    id: "pop-cost",
    label: "POP Ceiling Cost Estimator",
    description: "Estimate POP ceiling cost",
    icon: DollarSign,
    path: "/pop-ceiling-calculator?mode=cost",
    keywords: "pop ceiling cost price",
    category: "Estimators",
  },
  {
    id: "tile-cost",
    label: "Tile Cost Estimator",
    description: "Estimate tile cost",
    icon: DollarSign,
    path: "/tile-calculator?mode=cost",
    keywords: "tile cost price",
    category: "Estimators",
  },

  // Colors
  {
    id: "colors",
    label: "Browse Colors",
    description: "Explore paint color library",
    icon: Palette,
    path: "/colors",
    keywords: "color paint browse palette",
    category: "Colors",
  },
  {
    id: "compare-colors",
    label: "Compare Colors",
    description: "Compare paint colors side by side",
    icon: Palette,
    path: "/colors/compare",
    keywords: "compare color",
    category: "Colors",
  },
  {
    id: "ai-color",
    label: "AI Color Assistant",
    description: "Get AI-powered color recommendations",
    icon: Bot,
    path: "/ai-color-assistant",
    keywords: "ai artificial intelligence color recommend",
    category: "Colors",
  },

  // Projects
  {
    id: "my-projects",
    label: "My Projects",
    description: "View saved calculations",
    icon: FolderOpen,
    path: "/my-projects",
    keywords: "saved projects calculations",
    category: "Projects",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Your personal dashboard",
    icon: Home,
    path: "/dashboard",
    keywords: "dashboard home overview",
    category: "Projects",
  },
  {
    id: "templates",
    label: "Templates",
    description: "Browse project templates",
    icon: FileText,
    path: "/templates",
    keywords: "templates presets",
    category: "Projects",
  },

  // Learn
  {
    id: "learn",
    label: "Learn",
    description: "Paint guides and tutorials",
    icon: Book,
    path: "/learn",
    keywords: "learn guides tutorials help",
    category: "Learn",
  },

  // Home
  {
    id: "home",
    label: "Home",
    description: "Back to homepage",
    icon: Home,
    path: "/",
    keywords: "home start",
    category: "Navigation",
  },
];

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      const previouslyFocused = document.activeElement as HTMLElement | null;
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      return () => previouslyFocused?.focus();
    }
  }, [open]);

  const recent = useMemo(() => getRecentTools(), []);

  const filtered = useMemo(() => {
    if (!query) {
      // Show recent first when no query
      const recentItems = recent
        .map((r) => ALL_COMMANDS.find((c) => c.path === r.path))
        .filter(Boolean)
        .slice(0, 3) as CommandItem[];
      const rest = ALL_COMMANDS.filter((c) => !recentItems.includes(c));
      return { recent: recentItems, all: rest };
    }

    const q = query.toLowerCase();
    const results = ALL_COMMANDS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keywords?.includes(q) ||
        item.category.toLowerCase().includes(q),
    );
    return { recent: [], all: results };
  }, [query, recent]);

  const flatResults = useMemo(
    () => [...filtered.recent, ...filtered.all],
    [filtered],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = flatResults[selectedIndex];
        if (item) {
          navigate(item.path);
          onClose();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, selectedIndex, flatResults, navigate, onClose]);

  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement;
      selected?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Command palette" className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-white/10 dark:bg-brand-navy-mid animate-fade-in-up">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 dark:border-white/5">
          <Search aria-hidden="true" className="h-5 w-5 text-neutral-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search calculators, colors, tools..."
            className="flex-1 bg-transparent text-sm text-neutral-700 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
          />
          <kbd className="hidden rounded-md border border-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 sm:inline-block dark:border-white/10">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.recent.length > 0 && (
            <div className="mb-2">
              <p className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                <Clock aria-hidden="true" className="h-3 w-3" /> Recent
              </p>
              {filtered.recent.map((item, i) => (
                <CommandRow
                  key={`r-${item.id}`}
                  item={item}
                  index={i}
                  selectedIndex={selectedIndex}
                  onSelect={() => {
                    navigate(item.path);
                    onClose();
                  }}
                />
              ))}
            </div>
          )}

          {filtered.all.length > 0 ? (
            <div>
              {filtered.recent.length > 0 && (
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  All
                </p>
              )}
              {filtered.all.map((item, i) => (
                <CommandRow
                  key={item.id}
                  item={item}
                  index={i + filtered.recent.length}
                  selectedIndex={selectedIndex}
                  onSelect={() => {
                    navigate(item.path);
                    onClose();
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-neutral-500">
                No results for "{query}"
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2 dark:border-white/5">
          <div className="flex items-center gap-3 text-[11px] text-neutral-500">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-neutral-200 px-1 text-[10px] dark:border-white/10">
                ↑↓
              </kbd>{" "}
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-neutral-200 px-1 text-[10px] dark:border-white/10">
                ↵
              </kbd>{" "}
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-neutral-200 px-1 text-[10px] dark:border-white/10">
                esc
              </kbd>{" "}
              close
            </span>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-medium text-brand-purple">
            <Zap aria-hidden="true" className="h-3 w-3" /> Quick navigation
          </span>
        </div>
      </div>
    </div>
  );
}

function CommandRow({
  item,
  index,
  selectedIndex,
  onSelect,
}: {
  item: CommandItem;
  index: number;
  selectedIndex: number;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => {}}
      className={classNames(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
        index === selectedIndex
          ? "bg-brand-purple/8 dark:bg-brand-purple/15"
          : "hover:bg-neutral-50 dark:hover:bg-white/5",
      )}
    >
      <span
        className={classNames(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          index === selectedIndex
            ? "bg-brand-purple text-white"
            : "bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-500",
        )}
      >
        <item.icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          {item.label}
        </p>
        <p className="truncate text-xs text-neutral-500">{item.description}</p>
      </div>
      {index === selectedIndex && (
        <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-purple" />
      )}
    </button>
  );
}

/** Hook to register keyboard shortcut for Cmd/Ctrl+K */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen };
}
