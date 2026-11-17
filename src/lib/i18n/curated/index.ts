/**
 * Every curated dictionary, statically bundled.
 *
 * The app never imports this: it fetches one language at a time through
 * CURATED_LOADERS so twelve unused dictionaries stay off the entry chunk.
 * The coverage gate and the translation tests need all of them at once and
 * run outside the browser bundle, so they import here.
 */
import es from "./es.json";
import fr from "./fr.json";
import de from "./de.json";
import pt from "./pt.json";
import ru from "./ru.json";
import id from "./id.json";
import sw from "./sw.json";
import ar from "./ar.json";
import hi from "./hi.json";
import zh from "./zh.json";
import ja from "./ja.json";
import nl from "./nl.json";

export const CURATED_BY_LANGUAGE: Record<string, Record<string, string>> = {
  en: {},
  es,
  fr,
  de,
  pt,
  ru,
  id,
  sw,
  ar,
  hi,
  zh,
  ja,
  nl,
};

/** The curated strings for one language, or an empty dictionary. */
export function curatedFor(language: string): Record<string, string> {
  return CURATED_BY_LANGUAGE[language] ?? {};
}
