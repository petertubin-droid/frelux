import LegalLayout from "@/components/legal/LegalLayout";
import { useSeo } from "@/lib/seo";
import { SITE_URL } from "@/lib/seo";

export default function About() {
  useSeo({
    title: "About: FRELUX PAINT CALC",
    description:
      "FRELUX PAINT CALC is a practical painting and color platform helping homeowners, decorators, and contractors plan paint projects with confidence.",
    canonicalPath: "/about",
    ogType: "website",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "About FRELUX PAINT CALC",
      description:
        "FRELUX PAINT CALC is a practical painting and color platform helping homeowners, decorators, and contractors plan paint projects with confidence.",
      url: `${SITE_URL}/about`,
      mainEntity: {
        "@type": "Organization",
        name: "FRELUX PAINT CALC",
        url: SITE_URL,
        logo: `${SITE_URL}/logo-mark.png`,
        foundingDate: "2025",
        areaServed: "Nigeria",
        knowsAbout: [
          "Paint calculation",
          "Construction cost estimation",
          "Wall screeding",
          "POP ceiling installation",
          "Tile calculation",
          "Paint color selection",
          "Construction materials pricing",
        ],
      },
    },
  });

  return (
    <LegalLayout
      slug="about"
      title="About FRELUX PAINT CALC"
      updated="2026-07-26"
      intro={
        <p>
          FRELUX PAINT CALC is a practical painting and color platform built to
          help homeowners, decorators, and contractors plan paint projects with
          confidence.
        </p>
      }
      sections={[
        {
          heading: "What we do",
          body: (
            <p>
              We provide focused tools to estimate paint quantity, estimate
              practical project costs, and explore curated color combinations
              for real rooms. Our aim is to take the guesswork out of paint
              planning.
            </p>
          ),
        },
        {
          heading: "Who it’s for",
          body: (
            <p>
              Whether you’re refreshing a single room or planning a full
              exterior, the tools are designed to be clear enough for first-time
              DIYers and practical enough for working professionals.
            </p>
          ),
        },
        {
          heading: "What’s next",
          body: (
            <p>
              This is Phase 1 of the platform. Later phases will add live
              pricing, AI color recommendations, image analysis, and account
              features. This section will be expanded as the product grows.
            </p>
          ),
        },
      ]}
    />
  );
}
