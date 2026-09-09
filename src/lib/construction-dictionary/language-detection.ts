// =========================================================
// FRELUX AI MULTILINGUAL CONSTRUCTION DICTIONARY
// LANGUAGE DETECTION (spec §9)
//
// Priority:
//   1. Explicit user language selection
//   2. Current conversation language
//   3. Automatic language detection
//   4. Default language: English
//
// Detection is deterministic and script-first: writing
// systems are unambiguous, vocabulary markers are only used
// for latin-script languages. Detection never overrides an
// explicit choice.
// =========================================================

import { DEFAULT_LANGUAGE, DICTIONARY_LANGUAGES } from "./languages";

export interface LanguageResolution {
  detected_language: string;
  response_language: string;
  /** which priority rule produced the response language */
  resolved_by: "USER_SELECTION" | "CONVERSATION_LANGUAGE" | "AUTO_DETECTION" | "DEFAULT";
}

/** Resolve the response language following the priority
 *  chain. An explicit selection is authoritative; a missing
 *  or invalid selection falls back honestly, never silently
 *  to a wrong language. */
export function resolveResponseLanguage(input: {
  explicit_selection?: string | null;
  conversation_language?: string | null;
  message: string;
}): LanguageResolution {
  const auto = detectLanguage(input.message);

  if (input.explicit_selection && isRegistered(input.explicit_selection)) {
    return {
      detected_language: auto,
      response_language: input.explicit_selection,
      resolved_by: "USER_SELECTION",
    };
  }
  if (input.conversation_language && isRegistered(input.conversation_language)) {
    return {
      detected_language: auto,
      response_language: input.conversation_language,
      resolved_by: "CONVERSATION_LANGUAGE",
    };
  }
  if (auto !== DEFAULT_LANGUAGE) {
    return {
      detected_language: auto,
      response_language: auto,
      resolved_by: "AUTO_DETECTION",
    };
  }
  return {
    detected_language: auto,
    response_language: DEFAULT_LANGUAGE,
    resolved_by: "DEFAULT",
  };
}

function isRegistered(code: string): boolean {
  return DICTIONARY_LANGUAGES.some((l) => l.code === code);
}

/** Deterministic automatic language detection. */
export function detectLanguage(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return DEFAULT_LANGUAGE;

  // Script detection (unambiguous)
  if (/[\u0600-\u06FF]/.test(trimmed)) return "ar";
  if (/[\u0900-\u097F]/.test(trimmed)) return "hi";
  if (/[\u4E00-\u9FFF]/.test(trimmed)) return "zh";

  const lower = ` ${trimmed.toLowerCase()} `;

  // Nigerian Pidgin markers (checked before English because
  // Pidgin shares the latin script and vocabulary markers)
  const pidginMarkers = [
    " abeg ", " wetin ", " how many ", " i wan ", " i want make ", " make i ",
    " na ", " dey ", " dem dey ", " no be ", " sabi ", " oga ", " villa ",
    " how much be ", " which kind ", " you dey ", " we go ", " e go ",
  ];
  if (pidginMarkers.filter((m) => lower.includes(m)).length >= 2) return "pcm";

  // Vocabulary markers for latin-script languages
  const markers: Record<string, string[]> = {
    fr: [" combien ", " peinture ", " ciment ", " toit ", " mur ", " carrelage ", " besoin "],
    es: [" cuánto", " cuantas", " pintura ", " cemento ", " techo ", " pared ", " azulejos "],
    pt: [" quanto ", " tinta ", " cimento ", " telhado ", " parede ", " azulejo "],
    yo: [" e melo ", " epo ", " yara ", " ile ", " awon ", " mo fe ", " gbogbo "],
    ig: [" ole ", " esi ", " ulo ", " mme ", " m choro ", " otutu ", " nkume "],
    ha: [" nawa ", " gida ", " rufi ", " bene ", " kudi ", " yawa ", " nawa kudi "],
  };
  let best: { code: string; hits: number } = { code: DEFAULT_LANGUAGE, hits: 0 };
  for (const [code, words] of Object.entries(markers)) {
    const hits = words.filter((w) => lower.includes(w)).length;
    if (hits > best.hits) best = { code, hits };
  }
  if (best.hits >= 2) return best.code;

  return DEFAULT_LANGUAGE;
}
