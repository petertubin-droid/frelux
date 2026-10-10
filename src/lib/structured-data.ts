// Structured data schemas for SEO, generates JSON-LD for various page types
// Used by the useSeo hook and injected into <head> as <script type="application/ld+json">

const SITE_URL =
  import.meta.env.VITE_SITE_URL ?? "https://freluxtools.netlify.app";
const SITE_NAME = "FRELUX";

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

// Organization / WebApplication schema, used on homepage
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "Calculate paint requirements, estimate painting costs, and discover colors that transform your space.",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

// Breadcrumb schema
export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

// FAQ schema
export function faqSchema(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

// Colour reference schema for colour pages.
// A paint colour is a reference entity (name, hex, RGB, HSL), not a
// merchant product with a price, stock or reviews. Typing it as
// Product triggered Search Console "Product snippets" warnings
// (missing aggregateRating / review / offers), so it is a DefinedTerm
// within a colour DefinedTermSet instead. No ratings are ever invented.
export function productSchema(opts: {
  name: string;
  description: string;
  slug: string;
  image?: string;
  category?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: opts.name,
    description: opts.description,
    url: `${SITE_URL}/colors/${opts.slug}`,
    ...(opts.image ? { image: opts.image } : {}),
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: opts.category
        ? `${SITE_NAME} ${opts.category} colours`
        : `${SITE_NAME} paint colours`,
      url: `${SITE_URL}/colors`,
    },
  };
}

// Calculator / How-To schema
export function howToSchema(opts: {
  name: string;
  description: string;
  steps: { name: string; text: string }[];
  slug: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: opts.name,
    description: opts.description,
    step: opts.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
    tool: {
      "@type": "HowToTool",
      name: SITE_NAME,
    },
  };
}

// Local Business schema
export function localBusinessSchema(opts: {
  name?: string;
  whatsapp?: string;
  email?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: opts.name ?? SITE_NAME,
    url: SITE_URL,
    ...(opts.email ? { email: opts.email } : {}),
    ...(opts.whatsapp ? { telephone: opts.whatsapp } : {}),
    areaServed: "Worldwide",
  };
}

// WebPage schema with breadcrumbs
export function webPageSchema(opts: {
  name: string;
  description: string;
  path: string;
  breadcrumbs?: BreadcrumbItem[];
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: opts.name,
    description: opts.description,
    url: `${SITE_URL}${opts.path}`,
  };
  if (opts.breadcrumbs && opts.breadcrumbs.length > 0) {
    schema.breadcrumb = breadcrumbSchema(opts.breadcrumbs);
  }
  return schema;
}
