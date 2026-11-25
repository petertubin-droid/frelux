// =========================================================
// Editorial identity: who publishes FRELUX, who writes, who reviews.
//
// This module exists because AdSense rejected the site for "low value content"
// and E-E-A-T, and the honest reason was not that the content is thin (there
// are guides, case studies and a standards library) but that none of it said
// who wrote it, what they are qualified to write it, or how it is checked.
//
// Every value here is either a real, checkable fact about the company or a
// pointer to a page that explains a process. Nothing invents a person: named
// reviewers are supplied by the owner in NAMED_REVIEWERS, and until they are,
// the desk is the author and the review policy says so plainly. Google
// penalises unverifiable credentials harder than it penalises a team byline.
// =========================================================
import { SITE_URL } from "@/lib/seo";

/** The legal entity that publishes the site. */
export const PUBLISHER = {
  name: "FRELUX Technologies Ltd",
  alternateName: "FRELUX SMART CALC",
  registrationNumber: "RC-7492815",
  jurisdiction: "Nigeria",
  addressLocality: "Lagos",
  addressCountry: "NG",
  url: SITE_URL,
  logo: `${SITE_URL}/logo-mark.png`,
  email: "freluxtools@gmail.com",
  telephone: "+2349063612439",
} as const;

/**
 * The standing author of FRELUX guides and methodology.
 *
 * A team byline is honest, but it is weaker than a named human, so this is a
 * placeholder for the reviewer roster rather than a substitute for it.
 */
export const EDITORIAL_DESK = {
  name: "FRELUX Quantity Surveying & Engineering Desk",
  role: "Author and reviewer of record",
  description:
    "The desk that writes and checks FRELUX guides and calculator methodology. It works from product data, manufacturer documentation, published engineering standards and market pricebooks, and it consults practising Nigerian registered Quantity Surveyors (NIQS) and civil/structural engineers when a method or a rate changes.",
  knowsAbout: [
    "Quantity surveying",
    "Construction cost estimation",
    "Material takeoff",
    "Nigerian building practice",
    "British and European construction standards",
    "Paint and finishes quantities",
  ],
} as const;

/** A named human reviewer. Supplied by the owner, never invented here. */
export interface NamedReviewer {
  /** Full name as it should appear in a byline. */
  name: string;
  /** Verifiable credential, e.g. "Registered Quantity Surveyor (NIQS)". */
  credential: string;
  role: string;
  /** Public profile that lets a reader verify the credential. */
  sameAs: string;
  /** What this person is qualified to review. */
  expertise: readonly string[];
}

/**
 * Empty until the owner supplies real people.
 *
 * Filling one entry turns on Person schema, bylines and a verifiable credential
 * on every guide. Leaving it empty is not a failure state: the site says the
 * desk is the author and describes its review process, which is true.
 */
export const NAMED_REVIEWERS: readonly NamedReviewer[] = [];

/** The steps a piece of content goes through before and after publication. */
export const REVIEW_POLICY: readonly { step: string; detail: string }[] = [
  {
    step: "Written from primary sources",
    detail:
      "Guides are written from FRELUX product data, manufacturer documentation and published standards, not from supplier marketing copy. Sponsored articles are not accepted.",
  },
  {
    step: "Checked against the standards library",
    detail:
      "Every calculator states the standards its method follows, and the same references are listed publicly in the engineering standards library so a reader can check them independently.",
  },
  {
    step: "Reviewed before publication",
    detail:
      "A guide or a methodology change is reviewed by the desk before it goes live. Where a rate, a method or a standard changes, the affected pages are re-checked rather than left to age.",
  },
  {
    step: "Corrected in public",
    detail:
      "Every page carries a feedback route. Reader reports are reviewed and acted on, and a correction is preferred over quietly leaving an error up.",
  },
];

/** What FRELUX does not claim, stated where a reviewer will read it. */
export const EDITORIAL_LIMITS: readonly string[] = [
  "Estimates are planning figures, not a professional certification, a tender submission or a bill of quantities for contract. A qualified professional must sign off before money is committed.",
  "Market prices move. A rate is only as current as the date shown beside it, and availability of verified data differs by market.",
  "AI-assisted drafting may be used, but published figures come from the deterministic engines and their stated standards, never from a model's guess.",
];

/** Absolute URL of the page that states these principles. */
export const EDITORIAL_PATH = "/editorial";
export const EDITORIAL_URL = `${SITE_URL}${EDITORIAL_PATH}`;

/** Organization node for JSON-LD. */
export function publisherSchema() {
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: PUBLISHER.name,
    alternateName: PUBLISHER.alternateName,
    url: PUBLISHER.url,
    logo: PUBLISHER.logo,
    email: PUBLISHER.email,
    telephone: PUBLISHER.telephone,
    address: {
      "@type": "PostalAddress",
      addressLocality: PUBLISHER.addressLocality,
      addressCountry: PUBLISHER.addressCountry,
    },
    identifier: {
      "@type": "PropertyValue",
      name: "Company registration",
      value: PUBLISHER.registrationNumber,
    },
    publishingPrinciples: EDITORIAL_URL,
  };
}

/** Author node for JSON-LD: a person when one is named, the desk otherwise. */
export function authorSchema(reviewer?: NamedReviewer) {
  if (!reviewer) {
    return {
      "@type": "Organization",
      "@id": `${SITE_URL}/#editorial-desk`,
      name: EDITORIAL_DESK.name,
      url: EDITORIAL_URL,
      description: EDITORIAL_DESK.description,
      knowsAbout: [...EDITORIAL_DESK.knowsAbout],
    };
  }
  return {
    "@type": "Person",
    name: reviewer.name,
    jobTitle: reviewer.role,
    description: reviewer.credential,
    sameAs: [reviewer.sameAs],
    worksFor: { "@id": `${SITE_URL}/#organization` },
    knowsAbout: [...reviewer.expertise],
  };
}
