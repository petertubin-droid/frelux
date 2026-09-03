import LegalLayout from "@/components/legal/LegalLayout";
import { useSeo } from "@/lib/seo";
import { SITE_URL } from "@/lib/seo";

export default function About() {
  useSeo({
    title: "About: FRELUX PROJECT CALC",
    description:
      "Learn about FRELUX PROJECT CALC — a practical painting, construction, and color platform helping homeowners, decorators, and contractors in Nigeria and beyond plan projects with confidence.",
    canonicalPath: "/about",
    ogType: "website",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "About FRELUX PROJECT CALC",
      description:
        "FRELUX PROJECT CALC is a practical painting and construction platform helping homeowners, decorators, and contractors plan paint projects with confidence.",
      url: `${SITE_URL}/about`,
      mainEntity: {
        "@type": "Organization",
        name: "FRELUX PROJECT CALC",
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
      title="About FRELUX PROJECT CALC"
      updated="2026-09-03"
      intro={
        <p>
          FRELUX PROJECT CALC is a practical painting, construction, and color
          platform built to help homeowners, decorators, and contractors plan
          projects with confidence. Founded in 2025 and based in Nigeria, our
          tools are calibrated for the Nigerian market while remaining useful
          for users worldwide.
        </p>
      }
      sections={[
        {
          heading: "Our mission",
          body: (
            <p>
              We believe that planning a paint or construction project should
              not require guesswork. Whether you are refreshing a single room,
              repainting an entire house, tiling a floor, or installing a POP
              ceiling, knowing how much material you need and what it will cost
              should be simple, fast, and accessible to everyone. Our mission is
              to take the guesswork out of project planning with tools that are
              clear enough for first-time DIYers and practical enough for
              working professionals.
            </p>
          ),
        },
        {
          heading: "What we offer",
          body: (
            <p>
              FRELUX PROJECT CALC provides a suite of focused tools:
              <br />
              <br />
              <strong>Paint Calculator</strong> — Estimate the exact quantity of
              paint needed for any room, house, exterior, or fence. Factor in
              doors, windows, coats, surface conditions, and waste margin
              for an accurate material list.
              <br />
              <br />
              <strong>Cost Estimators</strong> — Go beyond quantity. Our
              estimators factor in labour, transport, markup, profit, and tax
              to give you a realistic project budget calibrated to Nigerian
              market rates.
              <br />
              <br />
              <strong>Screeding, POP Ceiling & Tile Calculators</strong> — The
              same precision applied to wall screeding, POP ceiling
              installation, and tiling projects.
              <br />
              <br />
              <strong>Color Library & Smart Color Assistant</strong> — Browse
              curated color combinations, compare options side by side, and get
              AI-powered color recommendations based on your room description
              or uploaded photo.
              <br />
              <br />
              <strong>Project Templates</strong> — Pre-configured project
              templates for common painting, tiling, and screeding scenarios.
              Start with a template and adjust the details to fit your space.
              <br />
              <br />
              <strong>Learn Hub</strong> — Educational guides on painting
              techniques, material selection, preparation, and construction
              best practices.
            </p>
          ),
        },
        {
          heading: "Who it's for",
          body: (
            <p>
              Whether you are a homeowner planning a weekend refresh, a decorator
              quoting a client project, a contractor estimating materials for a
              tender, or a DIYer learning the ropes, our tools are designed to be
              clear and practical. We focus on the Nigerian market for pricing
              and product availability, but the calculation methodology works for
              any project anywhere in the world.
            </p>
          ),
        },
        {
          heading: "How our calculators work",
          body: (
            <p>
              Our calculators use industry-standard formulas for surface area,
              paint coverage rates, and waste allowance. Paint coverage rates
              and container sizes are sourced from real product data in our
              database, which is regularly updated. Cost estimators use current
              market prices for materials and labour, configurable by our admin
              team. You can adjust surface conditions, number of coats, waste
              margins, and quality levels to match your specific project. Every
              estimate shows a detailed breakdown so you can see exactly how
              each number was calculated.
            </p>
          ),
        },
        {
          heading: "Why we built this",
          body: (
            <p>
              We started FRELUX PROJECT CALC after years of seeing homeowners and
              contractors struggle with material estimation — buying too much
              paint and wasting money, or buying too little and running out
              mid-project. Color selection was equally challenging, with
              homeowners relying on small swatches that looked completely
              different on a full wall. We built tools that solve these problems
              directly: accurate calculators backed by real product data, and a
              color library with AI assistance to help you choose with
              confidence.
            </p>
          ),
        },
        {
          heading: "Data and accuracy",
          body: (
            <p>
              Our product database, pricing, and calculation rules are
              maintained by our team and updated regularly based on market
              surveys and supplier data. Users can report calculation issues
              directly from the results page, helping us continuously improve
              accuracy. While we strive for precision, all estimates remain
              approximate and should be verified with your supplier or
              contractor before purchase.
            </p>
          ),
        },
        {
          heading: "Privacy and trust",
          body: (
            <p>
              Your privacy matters to us. Our public tools run entirely in your
              browser and do not require an account. When you use AI-powered
              features, your data is processed securely and not stored
              long-term. We do not sell your personal information. Read our
              Privacy Policy and Cookie Policy for full details on how we handle
              your data.
            </p>
          ),
        },
        {
          heading: "Contact us",
          body: (
            <p>
              We are always happy to hear from our users — whether you have a
              question, a suggestion, or feedback on a calculator. Reach us
              through our contact page or via WhatsApp, and we will respond as
              soon as practical.
            </p>
          ),
        },
      ]}
    />
  );
}
