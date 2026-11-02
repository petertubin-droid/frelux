// =========================================================
// FRELUX PHASE 7, SERVER ENGINE BUNDLE ENTRY
//
// Bundled by esbuild (npm run build:api-engines) into
// supabase/functions/frelix-api/_engines.bundle.js and imported
// by the FRELUX API gateway edge function.
//
// This entry RE-EXPORTS the canonical engine registry and the
// Phase-7 key/auth modules, it invents NO new math and adds NO
// alternate execution path. The gateway can only execute what
// is registered here, exactly as the in-app AI surfaces do.
// =========================================================

// Canonical deterministic engine registry (the single sanctioned
// execution path for all AI surfaces, Phase 2+ foundation).
export {
  listEngines,
  getEngineDescriptor,
  executeEngine,
  EngineNotRegisteredError,
} from "@/lib/ai-foundation/engines-registry";

// Strict §3 key contract + pure authorization decisions.
export {
  generateFreluxApiKey,
  validateApiKeyFormat,
  isValidApiKeyFormat,
  hashApiKey,
  maskApiKey,
  apiKeyDisplayPrefix,
  extractBearerToken,
} from "@/lib/frelix-api/key-format";

export {
  evaluateKeyStatus,
  evaluateRateLimit,
  evaluateQuota,
  capabilityAllowed,
  regionAllowed,
  apiError,
  API_ERROR_DOCUMENTATION,
  type ApiKeyRecord,
  type AuthResult,
} from "@/lib/frelix-api/auth";
