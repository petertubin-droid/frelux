// =========================================================
// FRELUX PHASE 8, ARCHIE DOMAIN REGISTRY
//
// ARCHIE's core domain is Architecture; its learning capacity
// is EXTENSIBLE with NO artificial fixed domain ceiling. The
// registry is data: new legitimate domains are added by admins
// (and only admins). Risk class decides the verification bar :
// structural/foundation/safety/deterministic math knowledge
// can NEVER be auto-promoted.
// =========================================================

import type { ArchieDomain, ArchieRiskClass } from "./types";
import { GLOBAL_EXPANSION_DOMAINS } from "./global-domains";
import { isMathCapability } from "@/lib/learning/learning-engine";

/** The seeded registry, mirrors migration 20260908140000. */
export const ARCHIE_SEED_DOMAINS: readonly ArchieDomain[] = [
  {
    key: "architecture",
    label: "Architecture",
    is_core: true,
    risk_class: "STANDARD",
    active: true,
    description:
      "ARCHIE core domain, building design, spaces, forms, plans and architectural practice.",
  },
  {
    key: "construction",
    label: "Construction",
    is_core: false,
    risk_class: "STANDARD",
    active: true,
  },
  {
    key: "electrical",
    label: "Electrical Engineering",
    is_core: false,
    risk_class: "ENGINEERING_REVIEW",
    active: true,
  },
  {
    key: "plumbing",
    label: "Plumbing",
    is_core: false,
    risk_class: "ENGINEERING_REVIEW",
    active: true,
  },
  {
    key: "structural",
    label: "Structural / Civil Engineering",
    is_core: false,
    risk_class: "DETERMINISTIC",
    active: true,
  },
  {
    key: "foundation",
    label: "Foundation Engineering",
    is_core: false,
    risk_class: "DETERMINISTIC",
    active: true,
  },
  {
    key: "safety",
    label: "Construction Safety",
    is_core: false,
    risk_class: "ENGINEERING_REVIEW",
    active: true,
  },
  {
    key: "quantity_surveying",
    label: "Quantity Surveying",
    is_core: false,
    risk_class: "STANDARD",
    active: true,
  },
  {
    key: "project_planning",
    label: "Project Planning",
    is_core: false,
    risk_class: "STANDARD",
    active: true,
  },
  {
    key: "property",
    label: "Property Intelligence",
    is_core: false,
    risk_class: "STANDARD",
    active: true,
  },
  {
    key: "procurement",
    label: "Procurement",
    is_core: false,
    risk_class: "STANDARD",
    active: true,
  },
  {
    key: "costing",
    label: "Costing",
    is_core: false,
    risk_class: "STANDARD",
    active: true,
  },
  {
    key: "painting_finishes",
    label: "Painting & Finishes",
    is_core: false,
    risk_class: "STANDARD",
    active: true,
  },
  {
    key: "roofing",
    label: "Roofing",
    is_core: false,
    risk_class: "ENGINEERING_REVIEW",
    active: true,
  },
  {
    key: "hvac",
    label: "HVAC",
    is_core: false,
    risk_class: "ENGINEERING_REVIEW",
    active: true,
  },
  {
    key: "landscaping",
    label: "Landscaping",
    is_core: false,
    risk_class: "STANDARD",
    active: true,
  },
  {
    key: "regional_practices",
    label: "Regional Practices",
    is_core: false,
    risk_class: "STANDARD",
    active: true,
  },
  {
    key: "writing",
    label: "Writing",
    is_core: false,
    risk_class: "STANDARD",
    active: true,
  },
  {
    key: "software_engineering",
    label: "Coding / Software Engineering",
    is_core: false,
    risk_class: "STANDARD",
    active: true,
  },
  {
    key: "business",
    label: "Business",
    is_core: false,
    risk_class: "STANDARD",
    active: true,
  },
  {
    key: "science",
    label: "Science",
    is_core: false,
    risk_class: "STANDARD",
    active: true,
  },
  {
    key: "technology",
    label: "Technology",
    is_core: false,
    risk_class: "STANDARD",
    active: true,
  },
  {
    key: "crypto_intelligence",
    label: "Crypto & Digital Asset Intelligence",
    is_core: false,
    risk_class: "STANDARD",
    active: true,
    description:
      "OWNER-ONLY: legitimate crypto/digital-asset research, market data, analysis and clearly-labeled predictions. ARCHIE never executes financial actions.",
  },
  // -----------------------------------------------------
  // PHASE 9: global general intelligence domains. Same
  // registry, same governance, NO ceiling. Risk classes
  // inherit the verification bars; none are core.
  // -----------------------------------------------------
  {
    key: "climate_environment",
    label: "Climate & Environment",
    is_core: false,
    risk_class: "STANDARD",
    active: true,
    description:
      "Environmental and climate intelligence: climate zones, seasonal patterns, sustainability context.",
  },
  {
    key: "weather_intelligence",
    label: "Weather & Environmental Conditions",
    is_core: false,
    risk_class: "STANDARD",
    active: true,
    description:
      "Weather/forecast intelligence for project timing and weather-sensitive work advisories.",
  },
  {
    key: "regional_market",
    label: "Regional Market & Price Intelligence",
    is_core: false,
    risk_class: "STANDARD",
    active: true,
    description:
      "Observed regional market data (prices, labour, availability). Observations NEVER override FRELUX configured prices.",
  },
  {
    key: "language_intelligence",
    label: "Language & Terminology",
    is_core: false,
    risk_class: "STANDARD",
    active: true,
    description:
      "Multilingual intelligence and regional/construction terminology (LEARN, VERIFY, VERSION, USE).",
  },
  {
    key: "regulations_standards",
    label: "Regulations & Standards",
    is_core: false,
    risk_class: "ENGINEERING_REVIEW",
    active: true,
    description:
      "Building regulations and standards context where reliable information exists; highest care, never invented.",
  },
  {
    key: "planning_productivity",
    label: "Planning & Productivity",
    is_core: false,
    risk_class: "STANDARD",
    active: true,
    description:
      "Daily routines, task planning, productivity and personal organization.",
  },
  {
    key: "health_fitness",
    label: "Health, Fitness & Wellness (general information)",
    is_core: false,
    risk_class: "STANDARD",
    active: true,
    description:
      "General wellness information only; never presented as medical diagnosis or treatment.",
  },
  {
    key: "engineering_foundations",
    label: "Engineering Foundations (Base44-taught)",
    is_core: false,
    risk_class: "STANDARD",
    active: true,
    description:
      "Foundational engineering knowledge package from authorized Base44/FRELUX sources with full provenance; extensible to any legitimate technology.",
  },
];

/** In-memory registry for pure-logic use; the DB table is the
 *  source of truth in production (loaded by archie-client). */
export class ArchieDomainRegistry {
  private domains = new Map<string, ArchieDomain>();

  constructor(seed: readonly ArchieDomain[] = ARCHIE_SEED_DOMAINS) {
    for (const d of seed) this.domains.set(d.key, { ...d });
  }

  /** NO artificial ceiling: any legitimate domain can be added. */
  addDomain(domain: ArchieDomain): void {
    if (this.exists(domain.key)) {
      throw new Error(`ARCHIE domain "${domain.key}" already exists`);
    }
    this.domains.set(domain.key, { ...domain });
  }

  exists(key: string): boolean {
    return this.domains.has(key);
  }

  get(key: string): ArchieDomain | undefined {
    return this.domains.get(key);
  }

  /** Core domain is architecture, always present, never removable. */
  getCore(): ArchieDomain {
    const core = [...this.domains.values()].find((d) => d.is_core);
    if (!core) {
      throw new Error(
        "ARCHIE core domain (architecture) missing from registry",
      );
    }
    return core;
  }

  list(): ArchieDomain[] {
    return [...this.domains.values()].filter((d) => d.active);
  }

  /** The verification bar for a domain. */
  riskClass(key: string): ArchieRiskClass {
    return this.domains.get(key)?.risk_class ?? "STANDARD";
  }

  /** Highest bar wins: a high-risk domain OR a math capability
   *  both force engineering review. */
  requiresEngineeringReview(domainKey: string, capability?: string): boolean {
    const rc = this.riskClass(domainKey);
    if (rc === "DETERMINISTIC" || rc === "ENGINEERING_REVIEW") return true;
    if (capability && isMathCapability(capability)) return true;
    return false;
  }
}

/** Singleton registry used by pure pipeline logic.
 *  Seeded with the FRELUX registry AND the global expansion
 *  domains — ARCHIE's knowledge horizon is global (§12). */
export const archieDomains = new ArchieDomainRegistry([
  ...ARCHIE_SEED_DOMAINS,
  ...GLOBAL_EXPANSION_DOMAINS,
]);

/** Domains that must never be removed or de-activated. */
export const PROTECTED_DOMAIN_KEYS: ReadonlySet<string> = new Set([
  "architecture",
  "structural",
  "foundation",
  "safety",
]);
