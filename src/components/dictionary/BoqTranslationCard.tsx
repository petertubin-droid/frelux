// =========================================================
// FRELUX ENGINE #6 M3 — BOQ TECHNICAL LABEL TRANSLATION
//
// Dictionary-backed translated preview of the BOQ schedule
// of items in the user's UI language. Read-only preview:
//   * the stored quote, the saved revision and the bank
//     export are NEVER altered by machine translation
//   * every line shows the translation disclosure
//   * safety/regulatory text is refused outright
//   * RTL languages render in the correct direction
// =========================================================

import { useEffect, useMemo, useState } from "react";
import type { BoqLineItem } from "@/lib/estimation/boq-engine";
import {
  translateTechnicalLabel,
  type LabelTranslationResult,
  type SafetyRefusal,
} from "@/lib/construction-dictionary/technical-labels";
import {
  getTranslationPool,
  type TranslationPoolSource,
} from "@/lib/construction-dictionary/translation-pool";
import type { ConstructionTerm } from "@/lib/construction-dictionary/types";

const RTL_LANGUAGES = new Set(["ar"]);

export interface BoqTranslationCardProps {
  items: BoqLineItem[];
  /** UI language the schedule should preview in */
  language: string;
}

type LineResult = LabelTranslationResult | SafetyRefusal;

function isRefusal(r: LineResult): r is SafetyRefusal {
  return "refused" in r && r.refused === true;
}

function LineResultView({ result }: { result: LineResult }) {
  if (isRefusal(result)) {
    return (
      <p className="text-xs text-amber-600 dark:text-amber-400">
        Not machine-translated: safety and regulatory instructions stay in the
        source language.
      </p>
    );
  }
  return (
    <div className="grid gap-1">
      <p className="text-sm font-medium">{result.translated}</p>
      <p className="text-xs text-muted-foreground">{result.disclosure}</p>
      {result.untranslated_tokens.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Kept in English: {result.untranslated_tokens.join(", ")}
        </p>
      )}
    </div>
  );
}

export default function BoqTranslationCard({
  items,
  language,
}: BoqTranslationCardProps) {
  const [terms, setTerms] = useState<ConstructionTerm[]>([]);
  const [source, setSource] = useState<TranslationPoolSource | null>(null);

  useEffect(() => {
    if (language === "en" || items.length === 0) return;
    let cancelled = false;
    getTranslationPool(language).then((pool) => {
      if (cancelled) return;
      setTerms(pool.terms);
      setSource(pool.source);
    });
    return () => {
      cancelled = true;
    };
  }, [language, items.length]);

  const lineResults = useMemo<LineResult[]>(
    () => items.map((it) => translateTechnicalLabel(it.description, language, terms)),
    [items, language, terms],
  );

  if (language === "en" || items.length === 0) return null;

  const dir = RTL_LANGUAGES.has(language) ? "rtl" : "ltr";

  return (
    <section
      className="mt-4 rounded-lg border border-border bg-card p-4"
      aria-label="Dictionary translation preview"
    >
      <h3 className="text-sm font-semibold">
        Schedule preview in your language
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Machine-assisted dictionary translation, shown for review only. Terms
        are provisional until human-verified. The saved quote and the bank
        export always stay in the source language.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Dictionary source:{" "}
        {source === "database"
          ? "live reviewed dictionary"
          : "curated offline seed terms (database unavailable)"}
      </p>
      <div className="mt-3 grid gap-3" dir={dir}>
        {lineResults.map((result, i) => (
          <div
            key={i}
            className="grid gap-1 rounded border border-border/60 bg-background/40 p-2"
          >
            <p
              className="text-xs font-medium text-muted-foreground"
              dir="ltr"
            >
              {items[i].description}
            </p>
            <LineResultView result={result} />
          </div>
        ))}
      </div>
    </section>
  );
}
