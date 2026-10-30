import LegalLayout from "@/components/legal/LegalLayout";
import { useSeo } from "@/lib/seo";
import { SITE_URL } from "@/lib/seo";
import { useLanguage } from "@/lib/i18n";

export default function About() {
  const { t } = useLanguage();
  useSeo({
    title: "About: FRELUX",
    description:
      "Learn about FRELUX, a global construction intelligence platform with calculators, saved templates, a worldwide 3D site map and local weather, helping builders in 32 markets plan with confidence.",
    canonicalPath: "/about",
    ogType: "website",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "About FRELUX",
      description:
        "FRELUX is a construction estimation platform helping homeowners, decorators, and contractors plan projects with confidence across 32 markets.",
      url: `${SITE_URL}/about`,
      mainEntity: {
        "@type": "Organization",
        name: "FRELUX",
        url: SITE_URL,
        logo: `${SITE_URL}/logo-mark.png`,
        foundingDate: "2025",
        // Served markets reflect the configured international market
        // registry; availability of verified data varies per market and is
        // disclosed per tool, not claimed globally.
        areaServed: "International",
        knowsAbout: [
          "Paint calculation",
          "Construction cost estimation",
          "Wall screeding",
          "POP ceiling installation",
          "Tile calculation",
          "Paint color selection",
          "Construction materials pricing",
          "Construction site mapping",
          "Saved calculation templates",
          "Weather aware project planning",
        ],
      },
    },
  });

  return (
    <LegalLayout
      slug="about"
      title={t("About FRELUX")}
      updated="2026-10-30"
      intro={
        <p>
          FRELUX is a premium construction estimation platform built to help
          homeowners, decorators, and contractors anywhere in the world plan
          projects with confidence. Founded in 2025 and based in Nigeria, our
          tools are priced and calibrated against real market data, they speak
          multiple languages, and they plot work on a real 3D globe, so the same
          platform that serves a Lagos site serves a builder in London, Dubai,
          or São Paulo with equal precision.
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
              FRELUX provides a suite of focused tools:
              <br />
              <br />
              <strong>{t("Paint Calculator")}</strong>, Estimate the exact
              quantity of paint needed for any room, house, exterior, or fence.
              Factor in doors, windows, coats, surface conditions, and waste
              margin for an accurate material list.
              <br />
              <br />
              <strong>{t("Cost Estimators")}</strong>, Go beyond quantity. Our
              estimators factor in labour, transport, markup, profit, and tax to
              give you a realistic project budget calibrated to real market
              rates.
              <br />
              <br />
              <strong>{t("Screeding, POP Ceiling & Tile Calculators")}</strong>,
              The same precision applied to wall screeding, POP ceiling
              installation, and tiling projects.
              <br />
              <br />
              <strong>{t("Color Library & Smart Color Assistant")}</strong>,
              Browse curated color combinations, compare options side by side,
              and get AI-powered color recommendations based on your room
              description or uploaded photo.
              <br />
              <br />
              <strong>{t("Saved Templates")}</strong>, Save the inputs of any
              calculation as a private or public template. Reopening it
              recalculates against current prices instead of replaying old
              numbers, and published templates get their own crawlable page in
              every market we serve.
              <br />
              <br />
              <strong>{t("3D Site Map")}</strong>, See verified professionals,
              open projects, and material stock plotted where they actually are
              on a worldwide globe. Search any city to fly there, switch layers,
              check the distance from your own site, and open a record without
              losing your place.
              <br />
              <br />
              <strong>{t("Local Weather Window")}</strong>, A live forecast for
              the site you are planning, taken from your own location or your
              market's reference city, so you can judge whether the week suits
              painting, screeding, or roofing. When live data is unavailable we
              say so rather than presenting a guess as a forecast.
              <br />
              <br />
              <strong>{t("Learn Hub")}</strong>, Educational guides on painting
              techniques, material selection, preparation, and construction best
              practices.
            </p>
          ),
        },
        {
          heading: "Who it's for",
          body: (
            <p>
              Whether you are a homeowner planning a weekend refresh, a
              decorator quoting a client project, a contractor estimating
              materials for a tender, or a DIYer learning the ropes, our tools
              are designed to be clear and practical. The calculation
              methodology works for any project, and market-sensitive data
              (prices, product sizes, standards) is configured and verified
              market by market, starting with Nigeria and extending across the
              configured international markets. Each estimate discloses which
              market configuration it uses and whether its data is verified or
              user-supplied.
            </p>
          ),
        },
        {
          heading: "Planning where the work happens",
          body: (
            <p>
              Estimating happens on a real site, so the platform is spatial as
              well as numerical. The map opens on your own place when we know it
              and on the whole globe when we do not, and every pin on it comes
              from a record that carries a genuine coordinate: a professional's
              base, a project's site, or a seller's pickup and delivery area.
              Nothing is placed at a guessed location, and a layer with no data
              says it is empty instead of filling the world with decoration.
              Alongside the map, the weather window shows a live forecast for
              the location you are planning for, drawn from your own device
              location or your market's reference city. Both features are built
              on open data with no per-visit licence cost, and both tell you
              plainly when their information is missing or estimated.
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
              We started FRELUX after years of seeing homeowners and contractors
              struggle with material estimation, buying too much paint and
              wasting money, or buying too little and running out mid-project.
              Color selection was equally challenging, with homeowners relying
              on small swatches that looked completely different on a full wall.
              We built tools that solve these problems directly: accurate
              calculators backed by real product data, and a color library with
              AI assistance to help you choose with confidence.
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
          heading: "How FRELUX makes money",
          body: (
            <p>
              FRELUX is free to use because it is supported by advertising. Ads
              appear in clearly labeled slots around our tools and articles, and
              they are served by third-party networks. Two things we hold to: no
              calculation or estimate is ever influenced by an advertiser, and
              no article is sponsored or paid for by any supplier. If
              advertising ever fails to cover our costs, we would rather add an
              optional premium feature than compromise the tools.
            </p>
          ),
        },
        {
          heading: "Our editorial standards",
          body: (
            <p>
              Every guide in our Learn Hub is written to be useful on its own:
              practical steps, honest numbers, and the reasoning behind them. We
              do not publish filler, and we do not reuse supplier marketing
              copy. Prices and rates referenced in our guides are updated as our
              market data changes, and each article shows when it was last
              reviewed. When a topic requires local permits or regulations, we
              tell you to confirm the specifics with your own authority, because
              rules differ by country and region.
            </p>
          ),
        },
        {
          heading: "What we are not",
          body: (
            <p>
              FRELUX is a planning tool, not a contractor, supplier, or material
              vendor. We do not sell materials, execute projects, or take
              commissions on purchases. Our estimates are carefully built
              approximations: they tell you what to expect so you can budget,
              compare quotes, and spot a number that is wildly off. Before you
              buy or commit money, always confirm quantities and prices with
              your supplier or contractor. That final check is yours, and our
              job is to make sure you walk into it informed.
            </p>
          ),
        },
        {
          heading: "Who writes and reviews our guides",
          body: (
            <p>
              Every article in the Learn Hub is written and reviewed by the
              FRELUX Team before it is published. Writers work from real product
              data, manufacturer documentation, and standard trade practice, and
              each guide is re-checked when products, prices, or methods change.
              We do not accept sponsored articles or supplier marketing copy,
              and if we get something wrong, we would rather correct it quickly
              than quietly leave it up. Every article has a feedback option, and
              reports from readers are reviewed and acted on.
            </p>
          ),
        },
        {
          heading: "Our business details",
          body: (
            <p>
              FRELUX SMART CALC is the business behind this platform. You can
              reach us on WhatsApp at +234 906 361 2439, by email at
              frenzyanthony39@gmail.com, or through the contact page for
              questions, feedback, partnership proposals, or advertising
              enquiries. We read everything and respond as soon as practical.
            </p>
          ),
        },
        {
          heading: "Contact us",
          body: (
            <p>
              We are always happy to hear from our users, whether you have a
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
