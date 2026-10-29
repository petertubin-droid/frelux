/**
 * Reviewed content translations.
 *
 * Only rows the editor published are readable (RLS enforces it server-side).
 * A locale page with a published translation is a real, indexable page in its
 * own language; without one it stays a noindex machine-translated view of the
 * English page. That distinction is what `isLocalePathIndexable` encodes.
 */
import { getSupabase } from "@/lib/supabase-lazy";
import { useCallback, useEffect, useState } from "react";
import { registerIndexableLocalePath } from "@/lib/translation-index";

export type TranslatedContent = {
  content_type: "article" | "page";
  content_key: string;
  locale: string;
  title: string;
  description: string | null;
  body_md: string | null;
  published_at: string | null;
};

type ContentType = "article" | "page";

export async function fetchPublishedTranslation(
  locale: string,
  contentType: ContentType,
  key: string,
): Promise<TranslatedContent | null> {
  if (!locale || locale === "en") return null;
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc("get_published_translations", {
      p_locale: locale,
      p_content_type: contentType,
      p_keys: [key],
    });
    if (error || !data || data.length === 0) return null;
    return data[0] as TranslatedContent;
  } catch {
    return null;
  }
}

/**
 * Translation for a single piece of content in the active locale.
 * Registers the current path as indexable while a published translation is
 * present, so the SEO layer emits `index` plus the alternate set instead of
 * the blanket locale noindex.
 */
export function useContentTranslation(
  locale: string,
  contentType: ContentType,
  key: string | undefined,
) {
  const [translation, setTranslation] = useState<TranslatedContent | null>(
    null,
  );
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!key || !locale || locale === "en") {
      setTranslation(null);
      setChecked(true);
      return;
    }
    setChecked(false);
    fetchPublishedTranslation(locale, contentType, key).then((row) => {
      if (cancelled) return;
      setTranslation(row);
      setChecked(true);
      if (row && typeof window !== "undefined") {
        registerIndexableLocalePath(locale, window.location.pathname);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [locale, contentType, key]);

  const reset = useCallback(() => {
    setTranslation(null);
    setChecked(true);
  }, []);

  return { translation, checked, reset };
}
