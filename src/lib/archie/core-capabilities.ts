// =========================================================
// FRELUX PHASE 8 FINAL, ARCHIE ↔ FRELUX CORE REGISTRY
//
// ARCHIE is not an isolated chatbot: it is wired to the real
// FRELUX application core. This registry binds every major
// capability to its REAL implementation module and its REAL
// exported entry functions, no simulated, placeholder or
// duplicate bindings. core-orchestrator verifies every
// binding by dynamically importing the actual module and
// confirming the exported functions exist, so a disconnected
// or renamed core function fails the health check loudly.
// =========================================================

export type CoreSystemKey =
  | "AI_CORE"
  | "DETERMINISTIC_ENGINES"
  | "CALCULATORS"
  | "PROJECTS_PROPERTIES"
  | "CONTRACTOR_INTELLIGENCE"
  | "MATERIALS_ESTIMATES"
  | "QUOTATIONS_PDF"
  | "PLAN_VISION"
  | "MARKET_INTELLIGENCE"
  | "WEB_INTELLIGENCE"
  | "KNOWLEDGE_LEARNING"
  | "USER_FILES_STORAGE"
  | "FRELUX_API"
  | "SOURCE_CODE_INTELLIGENCE"
  | "DIAGNOSTICS_HEALTH";

export interface CoreSystemBinding {
  key: CoreSystemKey;
  label: string;
  /** The prompt's capability family. */
  family: string;
  /** REAL module specifier, dynamically imported for every
   *  health check and for actual invocation. */
  module: string;
  /** REAL exported function names in that module. The health
   *  check verifies each exists and is callable. */
  exports: string[];
  /** true → deterministic: ARCHIE relays output, never
   *  replaces the math. */
  deterministic: boolean;
  /** Read/analysis vs owner-gated write operations. */
  autonomy: "ARCHIE_AUTONOMOUS" | "OWNER_GATED" | "AUTONOMOUS_READS_GATED_WRITES";
  /** Where the binding lives in the core (for diagnostics). */
  note: string;
}

export const FRELUX_CORE_SYSTEMS: readonly CoreSystemBinding[] = [
  {
    key: "AI_CORE",
    label: "FRELUX AI Core",
    family: "AI generation & consultation",
    module: "@/lib/ai",
    exports: ["requestColorConsultation", "requestColorConsultationWithCredits"],
    deterministic: false,
    autonomy: "ARCHIE_AUTONOMOUS",
    note: "Credit-gated AI consultation core (Phase 4-5 AI foundation paths).",
  },
  {
    key: "DETERMINISTIC_ENGINES",
    label: "Calculation Engines Registry",
    family: "Deterministic calculators",
    module: "@/lib/ai-foundation/engines-registry",
    exports: ["listEngines", "registerEngine"],
    deterministic: true,
    autonomy: "ARCHIE_AUTONOMOUS",
    note: "Phase 2 engine registry, every deterministic calculator ARCHIE selects must be registered here.",
  },
  {
    key: "CALCULATORS",
    label: "Paint & Finish Calculators",
    family: "Deterministic calculators",
    module: "@/lib/calc",
    exports: ["DEFAULT_COVERAGE_M2_PER_LITER", "DEFAULT_CONTAINER_SIZES_LITERS"],
    deterministic: true,
    autonomy: "ARCHIE_AUTONOMOUS",
    note: "Deterministic paint/finish math constants + computation.",
  },
  {
    key: "PROJECTS_PROPERTIES",
    label: "Projects & Properties",
    family: "Projects, properties and intelligence",
    module: "@/lib/local-projects",
    exports: ["saveLocalProject", "getLocalProjects", "getLocalProjectsByType"],
    deterministic: false,
    autonomy: "AUTONOMOUS_READS_GATED_WRITES",
    note: "User's own project data, reads autonomous, writes stay user-owned.",
  },
  {
    key: "CONTRACTOR_INTELLIGENCE",
    label: "Contractor Intelligence",
    family: "Contractor & project intelligence",
    module: "@/lib/contractor",
    exports: ["createContractorProject", "fetchContractorProjects", "fetchContractorProject"],
    deterministic: false,
    autonomy: "AUTONOMOUS_READS_GATED_WRITES",
    note: "Contractor projects (Pro Connect), RLS-shaped, user-scoped.",
  },
  {
    key: "MATERIALS_ESTIMATES",
    label: "Materials, Estimates & Shopping Lists",
    family: "Materials, estimates, shopping lists",
    module: "@/lib/shopping-list",
    exports: ["generatePaintShoppingList", "generateCostEstimateShoppingList", "shoppingListToText"],
    deterministic: true,
    autonomy: "ARCHIE_AUTONOMOUS",
    note: "Deterministic shopping-list generation from calculation results.",
  },
  {
    key: "QUOTATIONS_PDF",
    label: "Quotations & Documents",
    family: "Quotations, documents, timelines",
    module: "@/lib/pdf",
    exports: ["generateQuotationPDF", "generateShoppingListPDF"],
    deterministic: true,
    autonomy: "ARCHIE_AUTONOMOUS",
    note: "Branded PDF generation for quotations and shopping lists.",
  },
  {
    key: "PLAN_VISION",
    label: "AI Image/Document Intelligence",
    family: "Image & document intelligence",
    module: "@/lib/plan-vision/extraction",
    exports: ["requestPlanExtraction", "sanitizeExtractionResponse", "shouldReextract"],
    deterministic: false,
    autonomy: "ARCHIE_AUTONOMOUS",
    note: "Plan-vision extraction: images/drawings → structured quantities, sanitized.",
  },
  {
    key: "MARKET_INTELLIGENCE",
    label: "Market & Price Intelligence",
    family: "Market and price intelligence",
    module: "@/lib/market-intelligence/queries",
    exports: ["fetchProviders", "fetchSources"],
    deterministic: false,
    autonomy: "AUTONOMOUS_READS_GATED_WRITES",
    note: "Provider/source registry for price intelligence (admin-gated writes).",
  },
  {
    key: "WEB_INTELLIGENCE",
    label: "External Web Intelligence",
    family: "External web intelligence",
    module: "@/lib/archie/web-intelligence",
    exports: ["isEligibleWebSource", "wrapAsUntrustedData", "canAdvanceWebIntel"],
    deterministic: false,
    autonomy: "ARCHIE_AUTONOMOUS",
    note: "Eligible-source checks + untrusted-data wrapping, external content never trusted blindly.",
  },
  {
    key: "KNOWLEDGE_LEARNING",
    label: "Knowledge & Learning Systems",
    family: "Knowledge and learning",
    module: "@/lib/learning/learning-engine",
    exports: ["checkPromotion", "evaluateScopePromotion", "regionMatches"],
    deterministic: false,
    autonomy: "OWNER_GATED",
    note: "Phase 6.5 knowledge governance: scope promotion needs human approval, ARCHIE reads, never promotes alone.",
  },
  {
    key: "USER_FILES_STORAGE",
    label: "User-Approved Files & Media",
    family: "User-approved files and project data",
    module: "@/lib/storage",
    exports: ["uploadProductImage"],
    deterministic: false,
    autonomy: "AUTONOMOUS_READS_GATED_WRITES",
    note: "Storage layer, user-approved uploads only; ARCHIE never ingests unselected files.",
  },
  {
    key: "FRELUX_API",
    label: "FRELUX API",
    family: "FRELUX API platform",
    module: "@/lib/frelix-api/portal-client",
    exports: ["listApiKeys", "createApiKey", "revokeApiKey", "rotateApiKey"],
    deterministic: false,
    autonomy: "OWNER_GATED",
    note: "API subscriber platform. Key management is privileged: ARCHIE may inspect usage, never mint or revoke keys.",
  },
  {
    key: "SOURCE_CODE_INTELLIGENCE",
    label: "Application Architecture & Source",
    family: "Website/application architecture and authorized source code",
    module: "@/lib/archie/code-intelligence",
    exports: ["AUTHORIZED_CODE_ROOTS"],
    deterministic: false,
    autonomy: "AUTONOMOUS_READS_GATED_WRITES",
    note: "Read-only inspection of AUTHORIZED roots; production changes go through the owner gate.",
  },
  {
    key: "DIAGNOSTICS_HEALTH",
    label: "Testing, Diagnostics & System Health",
    family: "Testing, diagnostics and system health",
    module: "@/lib/error-analysis",
    exports: ["buildErrorContext", "analyzeErrorWithAI", "generateErrorFix"],
    deterministic: false,
    autonomy: "ARCHIE_AUTONOMOUS",
    note: "Error analysis + fix generation; read-only diagnostics (monitoredQuery wrappers in supabase-monitor).",
  },
];

export function findCoreSystem(key: CoreSystemKey): CoreSystemBinding {
  const s = FRELUX_CORE_SYSTEMS.find((c) => c.key === key);
  if (!s) throw new Error(`Unknown core system "${key}"`);
  return s;
}
