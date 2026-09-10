// =========================================================
// ARCHIE COGNITIVE ENGINE — MULTIMODAL PERCEPTION
// supabase/functions/_shared/archie-ai/cognitive/perception.ts
//
// Normalizes every supported input modality — text, code,
// documents, structured data, websites, system info — into
// Percepts, the single input currency of the cognitive loop.
// Unsupported modalities (images, audio) are reported
// honestly and NEVER faked. Secrets are redacted on ingest.
// =========================================================

import { redactSecrets } from "./security-integrity.ts";
import type { Percept, PerceptionModality } from "./types.ts";

let perceptCounter = 0;

function newPercept(
  modality: PerceptionModality,
  content: unknown,
  origin: string,
  metadata: Record<string, unknown>,
): Percept {
  perceptCounter += 1;
  return {
    id: `percept-${Date.now().toString(36)}-${perceptCounter}`,
    modality,
    content,
    origin,
    observedAt: new Date().toISOString(),
    metadata,
  };
}

/** Code heuristics — structural, not keyword-only. */
function looksLikeCode(text: string): { isCode: boolean; language: string } {
  const signals: Array<{ re: RegExp; lang: string }> = [
    {
      re: /\b(?:function|const|let|var|return|import|export)\b/,
      lang: "javascript",
    },
    { re: /\b(?:def|class|import)\b.*:\s*$/m, lang: "python" },
    {
      re: /\b(?:SELECT|INSERT|UPDATE|DELETE)\b\s+(?:\*|FROM|INTO|SET)/i,
      lang: "sql",
    },
    { re: /\b(?:interface|type)\s+\w+\s*[={]/, lang: "typescript" },
    { re: /<[a-z]+[^>]*>[\s\S]*<\/[a-z]+>/i, lang: "html" },
    { re: /\b(?:package|func)\s+\w+/, lang: "go" },
    { re: /\b(?:pub\s+fn|use\s+\w+::)/, lang: "rust" },
  ];
  const structural =
    (text.match(/[{};]/g)?.length ?? 0) >= 3 ||
    /^(?:[ \t]*[{}[\]();,]|#!)/m.test(text);
  for (const { re, lang } of signals) {
    if (re.test(text)) {
      return { isCode: true, language: lang };
    }
  }
  return { isCode: structural, language: structural ? "unknown-code" : "text" };
}

/** Parse structured data (JSON or CSV) honestly. */
function parseStructured(raw: string): {
  parsed: unknown;
  format: "json" | "csv" | null;
} {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return { parsed: JSON.parse(trimmed), format: "json" };
    } catch {
      return { parsed: null, format: null };
    }
  }
  if (trimmed.includes(",") && trimmed.includes("\n")) {
    const lines = trimmed.split("\n").filter((l) => l.trim());
    if (lines.length >= 2) {
      const header = lines[0].split(",").map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const cells = line.split(",").map((c) => c.trim());
        const row: Record<string, string> = {};
        header.forEach((h, i) => {
          row[h] = cells[i] ?? "";
        });
        return row;
      });
      return { parsed: { header, rows }, format: "csv" };
    }
  }
  return { parsed: null, format: null };
}

export class PerceptionEngine {
  private ingested = 0;
  private redactions = 0;

  /** Ingest raw input of any supported modality. Text is the
   *  general case; code, structured data and URLs are
   *  detected and normalized. Always returns at least one
   *  percept; never returns a fake percept. */
  ingest(
    input: string,
    origin = "conversation",
  ): {
    percepts: Percept[];
    secretsRedacted: number;
  } {
    const { redacted, foundCount } = redactSecrets(input);
    this.redactions += foundCount;
    const percepts: Percept[] = [];
    this.ingested += 1;

    const urls = redacted.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
    const structured = parseStructured(redacted);
    const codeCheck = structured.format
      ? { isCode: false, language: "text" }
      : looksLikeCode(redacted);

    if (codeCheck.isCode) {
      percepts.push(
        newPercept("code", redacted, origin, {
          language: codeCheck.language,
          bytes: redacted.length,
        }),
      );
    } else if (structured.format) {
      percepts.push(
        newPercept("structured-data", structured.parsed, origin, {
          format: structured.format,
        }),
      );
    } else {
      percepts.push(
        newPercept("text", redacted, origin, {
          words: redacted.split(/\s+/).filter(Boolean).length,
          urls: urls.length,
        }),
      );
    }

    for (const url of urls.slice(0, 5)) {
      percepts.push(
        newPercept("website", url, origin, {
          note: "url detected — fetch happens only through the authorized web-research pipeline",
        }),
      );
    }
    return { percepts, secretsRedacted: foundCount };
  }

  /** Honest modality report — the heart of never-faking. */
  static supportReport(): {
    supported: PerceptionModality[];
    unsupported: Array<{ modality: string; note: string }>;
  } {
    return {
      supported: [
        "text",
        "code",
        "document",
        "structured-data",
        "website",
        "system-info",
      ],
      unsupported: [
        {
          modality: "image",
          note: "visual perception is not implemented yet — reported honestly, never faked",
        },
        {
          modality: "audio",
          note: "auditory perception is not implemented yet — reported honestly, never faked",
        },
      ],
    };
  }

  stats(): { ingested: number; secretsRedacted: number } {
    return { ingested: this.ingested, secretsRedacted: this.redactions };
  }
}
