import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useLanguage, LANGUAGES, type Language } from "@/lib/i18n";
import { classNames } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";

export function LanguageSwitcher({
  compact = false,
  inline = false,
}: {
  compact?: boolean;
  inline?: boolean;
}) {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const current = LANGUAGES.find((l) => l.value === language) ?? LANGUAGES[0];

  // ── Inline mode: expandable section for narrow drawers ──
  if (inline) {
    return (
      <div ref={ref} className="w-full">
        <Button variant="ghost"
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:bg-white/5"
          aria-label="Change language"
        >
          <span className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Language
            <span className="text-base">{current.flag}</span>
          </span>
          <ChevronDown
            className={classNames(
              "h-3.5 w-3.5 transition-transform",
              open && "rotate-180",
            )}
          />
        </Button>
        {open && (
          <div className="mt-1 space-y-0.5 rounded-lg border border-border/50 bg-muted/50 p-2 dark:border-white/5 dark:bg-white/5">
            {LANGUAGES.map((lang) => (
              <Button variant="ghost"
                key={lang.value}
                type="button"
                onClick={() => {
                  setLanguage(lang.value as Language);
                  setOpen(false);
                }}
                className={classNames(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                  language === lang.value
                    ? "bg-primary/10 font-semibold text-brand-purple dark:text-brand-purple-lighter"
                    : "text-muted-foreground hover:bg-muted dark:text-muted-foreground/80 dark:hover:bg-white/5",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base">{lang.flag}</span>
                  <span>{lang.nativeLabel}</span>
                </span>
                {language === lang.value && <Check className="h-4 w-4" />}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Dropdown mode (desktop navbar) ──
  return (
    <div ref={ref} className="relative">
      <Button variant="ghost"
        type="button"
        onClick={() => setOpen(!open)}
        className={classNames(
          "inline-flex items-center gap-1.5 rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-card-foreground dark:text-muted-foreground dark:hover:bg-white/5 dark:hover:text-muted-foreground/60",
          compact && "p-1.5",
        )}
        aria-label="Change language"
      >
        <Globe className={compact ? "h-4 w-4" : "h-[18px] w-[18px]"} />
        {!compact && (
          <span className="text-xs font-medium">{current.flag}</span>
        )}
        {!compact && (
          <ChevronDown
            className={classNames(
              "h-3 w-3 transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border border-border/40 bg-card py-1.5 shadow-lg dark:border-white/10 dark:bg-card">
          <p className="px-4 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Language
          </p>
          {LANGUAGES.map((lang) => (
            <Button variant="ghost"
              key={lang.value}
              type="button"
              onClick={() => {
                setLanguage(lang.value as Language);
                setOpen(false);
              }}
              className={classNames(
                "flex w-full items-center justify-between px-4 py-2 text-sm transition-colors",
                language === lang.value
                  ? "bg-primary/5 font-semibold text-brand-purple dark:text-brand-purple-lighter"
                  : "text-muted-foreground hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:bg-white/5",
              )}
            >
              <span className="flex items-center gap-2">
                <span className="text-base">{lang.flag}</span>
                <span>{lang.nativeLabel}</span>
              </span>
              {language === lang.value && <Check className="h-4 w-4" />}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
