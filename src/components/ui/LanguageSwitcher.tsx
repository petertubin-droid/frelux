import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useLanguage, LANGUAGES, type Language } from "@/lib/i18n";
import { classNames } from "@/lib/utils";

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
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5"
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
        </button>
        {open && (
          <div className="mt-1 space-y-0.5 rounded-lg border border-neutral-100 bg-neutral-50/50 p-2 dark:border-white/5 dark:bg-white/5">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                type="button"
                onClick={() => {
                  setLanguage(lang.value as Language);
                  setOpen(false);
                }}
                className={classNames(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                  language === lang.value
                    ? "bg-brand-purple/10 font-semibold text-brand-purple dark:text-brand-purple-lighter"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/5",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base">{lang.flag}</span>
                  <span>{lang.nativeLabel}</span>
                </span>
                {language === lang.value && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Dropdown mode (desktop navbar) ──
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={classNames(
          "inline-flex items-center gap-1.5 rounded-lg p-2 text-neutral-500 transition-all hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-200",
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
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border border-neutral-200/40 bg-white py-1.5 shadow-lg dark:border-white/10 dark:bg-brand-navy-mid">
          <p className="px-4 py-1 text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Language
          </p>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              type="button"
              onClick={() => {
                setLanguage(lang.value as Language);
                setOpen(false);
              }}
              className={classNames(
                "flex w-full items-center justify-between px-4 py-2 text-sm transition-colors",
                language === lang.value
                  ? "bg-brand-purple/5 font-semibold text-brand-purple dark:text-brand-purple-lighter"
                  : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5",
              )}
            >
              <span className="flex items-center gap-2">
                <span className="text-base">{lang.flag}</span>
                <span>{lang.nativeLabel}</span>
              </span>
              {language === lang.value && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
