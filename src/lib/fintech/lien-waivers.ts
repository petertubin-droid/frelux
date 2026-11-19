/**
 * Lien-waiver draft generator + regulated-provider catalog — FRELUX
 * engine-1A "Fintech, escrow, lien waivers & AML" milestone (2026-11-19).
 *
 * Honest scope:
 *  - It generates a STRUCTURED DRAFT with the statutorily required
 *    elements and the exact citation for each supported jurisdiction.
 *    It does not reproduce statutory form text verbatim and it does not
 *    claim legal effect: the citation and the attorney-review disclosure
 *    travel with every draft.
 *  - Unsupported jurisdictions/types are refused, never approximated.
 *  - Regulated providers (escrow agents, KYC/AML screening) are listed
 *    with their licence requirement and an explicit NOT CONNECTED state.
 *    FRELUX holds no escrow licence and performs no AML screening.
 */

export type LienWaiverType =
  | "conditional_progress"
  | "unconditional_progress"
  | "conditional_final"
  | "unconditional_final";

export const WAIVER_TYPE_LABELS: Record<LienWaiverType, string> = {
  conditional_progress: "Conditional Waiver and Release on Progress Payment",
  unconditional_progress: "Unconditional Waiver and Release on Progress Payment",
  conditional_final: "Conditional Waiver and Release on Final Payment",
  unconditional_final: "Unconditional Waiver and Release on Final Payment",
};

export interface JurisdictionWaiverRule {
  code: string;
  name: string;
  currency: string;
  statute: string;
  statutoryFormNote: string;
  effectiveNote: string;
  types: LienWaiverType[];
  requiredElements: string[];
  notarization: string;
  verifiedDate: string;
  source: string;
}

/**
 * Verified 2026-11-19 against official/primary sources where available:
 *  - FL: leg.state.fl.us, Chapter 713.20 (statutory forms prescribed by
 *    s. 713.20(5); form effective 1996-10-01).
 *  - TX: Tex. Prop. Code 53.284 (a waiver is unenforceable unless it
 *    substantially complies with a 53.284 form).
 *  - CA: Civ. Code 8132/8134 (progress) and 8136/8138 (final) prescribe
 *    the four statutory waiver forms.
 * Only jurisdictions whose statutory forms could be verified are listed.
 */
export const LIEN_WAIVER_JURISDICTIONS: Record<string, JurisdictionWaiverRule> = {
  "US-FL": {
    code: "US-FL",
    name: "Florida",
    currency: "USD",
    statute: "Fla. Stat. s. 713.20(5)",
    statutoryFormNote:
      "Statutory waiver and release forms are prescribed by s. 713.20(5); use of the statutory form is required in the circumstances the statute describes.",
    effectiveNote:
      "Statutory form effective 1996-10-01 (per the form's own statutory note); s. 713.20 amended since - confirm the current form text before execution.",
    types: [
      "conditional_progress",
      "unconditional_progress",
      "conditional_final",
      "unconditional_final",
    ],
    requiredElements: [
      "Claimant (lienor) legal name",
      "Owner name",
      "Job/project description and location",
      "Amount paid or to be paid",
      "Through-date the waiver covers",
      "Property description",
      "Claimant signature and date",
    ],
    notarization:
      "The statutory forms do not require notarization; check the contract and lender requirements before execution.",
    verifiedDate: "2026-11-19",
    source: "https://www.leg.state.fl.us/Statutes/index.cfm?App_mode=Display_Statute&URL=0700-0799/0713/Sections/0713.20.html",
  },
  "US-TX": {
    code: "US-TX",
    name: "Texas",
    currency: "USD",
    statute: "Tex. Prop. Code s. 53.284",
    statutoryFormNote:
      "A waiver or release of lien is unenforceable unless it substantially complies with a form prescribed by s. 53.284; four statutory forms exist (conditional/unconditional, progress/final).",
    effectiveNote:
      "s. 53.284 as currently published; substantial-compliance case law evolves - have counsel confirm the operative form before execution.",
    types: [
      "conditional_progress",
      "unconditional_progress",
      "conditional_final",
      "unconditional_final",
    ],
    requiredElements: [
      "Claimant legal name",
      "Owner (and original contractor where applicable) name",
      "Project description and location",
      "Amount of the progress or final payment",
      "Through-date the waiver covers",
      "Statutory notice language referencing s. 53.284",
      "Claimant signature, title and date",
    ],
    notarization:
      "Notarization is generally not required for Texas lien waivers; some lenders still request it - confirm before execution.",
    verifiedDate: "2026-11-19",
    source: "https://statutes.capitol.texas.gov/Docs/PR/htm/PR.53.htm",
  },
  "US-CA": {
    code: "US-CA",
    name: "California",
    currency: "USD",
    statute: "Cal. Civ. Code ss. 8132, 8134, 8136, 8138",
    statutoryFormNote:
      "Four statutory forms: conditional progress (8132), unconditional progress (8134), conditional final (8136), unconditional final (8138). The statutes prescribe the form content.",
    effectiveNote:
      "Current Civil Code sections as published; the statutory forms were renumbered in 2010 (former Civil Code 3262) - confirm the current text before execution.",
    types: [
      "conditional_progress",
      "unconditional_progress",
      "conditional_final",
      "unconditional_final",
    ],
    requiredElements: [
      "Claimant legal name",
      "Owner name",
      "Project description and location",
      "Amount of the payment",
      "Through-date the waiver covers",
      "Statutory notice language for the specific form section",
      "Claimant signature and date",
    ],
    notarization:
      "The statutory forms do not require notarization; verify any additional contractual requirement.",
    verifiedDate: "2026-11-19",
    source: "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CIV&division=4.&title=2.&part=4.&chapter=3.&article=3.",
  },
};

export interface LienWaiverInput {
  jurisdiction: string;
  waiver_type: LienWaiverType;
  claimant_name?: string;
  owner_name?: string;
  project_description?: string;
  amount?: number;
  currency?: string;
  through_date?: string; // ISO date
  payment_received?: boolean;
  exceptions_note?: string;
  signer_name?: string;
}

export interface LienWaiverDraft {
  ok: boolean;
  errors: string[];
  warnings: string[];
  draft?: {
    title: string;
    jurisdiction: JurisdictionWaiverRule;
    fields: Record<string, string>;
    required_elements: string[];
    notarization_note: string;
    disclosures: string[];
  };
}

const DISCLOSURES = [
  "This is a DRAFT, not legal advice. Lien waivers affect legal rights; have a licensed attorney review the final document before execution.",
  "The statutory form must be used in the form the cited statute prescribes (or substantially comply with it, where the statute allows). FRELUX does not reproduce statutory text verbatim.",
  "FRELUX does not verify signatures, notarization, payment receipt, or enforceability.",
];

function isIsoDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
}

export function buildLienWaiverDraft(input: LienWaiverInput): LienWaiverDraft {
  const errors: string[] = [];
  const warnings: string[] = [];

  const rule = LIEN_WAIVER_JURISDICTIONS[input.jurisdiction];
  if (!rule) {
    return {
      ok: false,
      errors: [
        `No verified lien-waiver statute is registered for "${input.jurisdiction}". Supported: ${Object.keys(LIEN_WAIVER_JURISDICTIONS).join(", ")}.`,
      ],
      warnings: [],
    };
  }
  if (!rule.types.includes(input.waiver_type)) {
    errors.push(
      `"${input.waiver_type}" is not a form the registered statute provides for ${rule.code}.`,
    );
  }

  const claimant = (input.claimant_name ?? "").trim();
  const owner = (input.owner_name ?? "").trim();
  const project = (input.project_description ?? "").trim();
  if (!claimant) errors.push("claimant_name is required.");
  if (!owner) errors.push("owner_name is required.");
  if (!project) errors.push("project_description is required.");

  if (typeof input.amount !== "number" || !Number.isFinite(input.amount) || input.amount <= 0) {
    errors.push("amount must be a positive number.");
  }
  if (input.currency && input.currency !== rule.currency) {
    errors.push(
      `currency "${input.currency}" does not match the jurisdiction currency ${rule.currency}.`,
    );
  }
  if (!input.through_date || !isIsoDate(input.through_date)) {
    errors.push("through_date is required as an ISO date (YYYY-MM-DD).");
  }

  const isConditional = input.waiver_type.startsWith("conditional");
  if (isConditional && typeof input.payment_received !== "boolean") {
    errors.push("payment_received is required for conditional waivers.");
  }
  if (!isConditional && input.payment_received === false) {
    warnings.push(
      "Unconditional waivers release lien rights whether or not payment has been received. Confirm this is intended.",
    );
  }
  if (isConditional && input.payment_received === false) {
    warnings.push(
      "Conditional waiver: rights are released only when the stated payment is actually received.",
    );
  }

  if (errors.length > 0) return { ok: false, errors, warnings };

  return {
    ok: true,
    errors: [],
    warnings,
    draft: {
      title: WAIVER_TYPE_LABELS[input.waiver_type],
      jurisdiction: rule,
      fields: {
        claimant_name: claimant,
        owner_name: owner,
        project_description: project,
        amount: String(input.amount),
        currency: rule.currency,
        through_date: input.through_date!,
        payment_received: isConditional
          ? input.payment_received
            ? "yes"
            : "no"
          : "not applicable (unconditional)",
        exceptions_note: (input.exceptions_note ?? "").trim(),
        signer_name: (input.signer_name ?? "").trim(),
      },
      required_elements: rule.requiredElements,
      notarization_note: rule.notarization,
      disclosures: [
        ...DISCLOSURES,
        `Statute: ${rule.statute}. ${rule.statutoryFormNote}`,
        rule.effectiveNote,
      ],
    },
  };
}

// ------------------------------------------------------------------
// Regulated-provider catalog (escrow agents, KYC/AML screening).
// FRELUX holds no escrow licence and performs no AML screening; every
// entry is explicitly NOT CONNECTED until a contracted provider is
// configured with its licence details.
// ------------------------------------------------------------------

export interface RegulatedProviderEntry {
  id: string;
  category: "escrow" | "kyc_aml";
  description: string;
  license_requirement: string;
  status: "not_connected";
  disclosure: string;
}

export const REGULATED_PROVIDER_CATALOG: RegulatedProviderEntry[] = [
  {
    id: "escrow-agent",
    category: "escrow",
    description:
      "Licensed escrow agent / title company holding construction funds in trust.",
    license_requirement:
      "State-licensed escrow agent or title insurer in the project jurisdiction; licensing is per-state (and per-country outside the US).",
    status: "not_connected",
    disclosure:
      "No escrow agent is connected. FRELUX milestone tracking and the existing diaspora escrow client are not a licensed escrow service.",
  },
  {
    id: "kyc-aml-screening",
    category: "kyc_aml",
    description: "Identity verification and sanctions/PEP screening provider.",
    license_requirement:
      "Provider must be a regulated KYC/AML vendor with audit rights; the platform remains responsible for its own AML programme under applicable law.",
    status: "not_connected",
    disclosure:
      "No screening provider is connected. FRELUX performs no identity verification, sanctions screening, or AML monitoring.",
  },
];
