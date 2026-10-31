/**
 * Types for the generated FAQ prerender payload. The .mjs beside this file is
 * written by scripts/generate-faq-prerender.ts on every build; this declaration
 * keeps the payload typed wherever it is imported (prerender and the guard test).
 */
export interface FaqPrerenderRoute {
  path: string;
  title: string;
  description: string;
  content: string;
  structuredData: Record<string, unknown>[];
}

export declare const faqPrerenderRoutes: FaqPrerenderRoute[];
