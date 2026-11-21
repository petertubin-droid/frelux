import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Globe } from "lucide-react";
import Logo from "@/components/brand/Logo";
import { siteConfig } from "@/config/site";
import { useMarket } from "@/lib/international/market-context";
import { useLanguage } from "@/lib/i18n";
import { getMarketNavigationLabel } from "@/lib/globalization/construction-terminology";
import {
  listTemplateMarkets,
  marketTemplatesPath,
} from "@/lib/templates-market";

// The newsletter form talks to an edge function, so it is fetched only when a
// reader actually scrolls as far as the footer.
const NewsletterSignup = lazy(
  () => import("@/components/newsletter/NewsletterSignup"),
);

// ---------------------------------------------------------------------------
// Design contract (2026-11-21 rewrite)
//
// The footer follows the flat, quiet pattern large reference sites use:
//  - one flat surface with a single hairline rule, no gradient, no backdrop
//    image, no rounded corners, no neon edge;
//  - 13px link text on a 40px tap row, hover underline only, no colour-shift
//    decoration;
//  - TWO real link columns on phones, four from sm up, with headings always
//    visible: nothing is hidden behind a disclosure control, because a footer
//    is the last chance for a lost reader to find a page;
//  - one bottom bar with copyright, compliance line, legal links and the
//    active market.
//
// Every destination still appears exactly once (Footer.test.tsx enforces it).
// ---------------------------------------------------------------------------

const calculateLinks = [
  { label: "Painting Calculator", path: "/paint-calculator" },
  { label: "Screeding Calculator", path: "/screeding-calculator" },
  { label: "POP Ceiling Calculator", path: "/pop-ceiling-calculator" },
  { label: "Tile Calculator", path: "/tile-calculator" },
  { label: "Wallpaper Calculator", path: "/wallpaper-calculator" },
  { label: "Finishing Calculator", path: "/finish-estimator" },
];

const estimateLinks = [
  { label: "Build-to-Roof Estimator", path: "/build-to-roof-estimator" },
  { label: "AI Photo Estimator", path: "/image-estimator" },
  { label: "Smart Calculator", path: "/smart-calculator" },
  { label: "Structural Calculator", path: "/structural-calculator" },
  { label: "Foundation Calculator", path: "/foundation-calculator" },
];

const exploreLinks = [
  { label: "Color Library", path: "/colors" },
  { label: "Compare Colors", path: "/colors/compare" },
  { label: "Smart Color Assistant", path: "/ai-color-assistant" },
  { label: "Marketplace", path: "/marketplace" },
  { label: "Pro Connect", path: "/pro-connect" },
  { label: "Project Gallery", path: "/gallery" },
  { label: "Case Studies", path: "/case-studies" },
  { label: "Global Markets", path: "/global-markets" },
  { label: "Diaspora Escrow", path: "/escrow" },
];

const marketLinks = [
  { label: "Market Intelligence", path: "/market-intelligence" },
  { label: "Construction Stocks", path: "/market-intelligence/stocks" },
  { label: "Material Market Prices", path: "/market-intelligence/materials" },
  { label: "Industry Trends", path: "/market-intelligence/trends" },
  { label: "Market News", path: "/market-intelligence/news" },
  { label: "Company Profiles", path: "/market-intelligence/companies" },
];

const resourcesLinks = [
  { label: "Engineering & Accuracy", path: "/engineering-standards" },
  { label: "Learn Hub", path: "/learn" },
  ...marketLinks,
  { label: "Material Prices", path: "/prices" },
  { label: "Glossary", path: "/glossary" },
  { label: "Free Templates", path: "/printables" },
  { label: "User Guide", path: "/user-guide" },
  { label: "Pricing", path: "/pricing" },
  { label: "Developer API", path: "/developers" },
  { label: "Merchant API", path: "/developers/merchant-webhooks" },
];

const companyLinks = [
  { label: "Sign In", path: "/login" },
  { label: "My Projects", path: "/my-projects" },
  { label: "Contact", path: "/contact" },
  { label: "About", path: "/about" },
  { label: "Partners", path: "/partners" },
];

const legalLinks = [
  { label: "Privacy Policy", path: "/privacy-policy" },
  { label: "Terms of Service", path: "/terms" },
  { label: "Cookie Policy", path: "/cookie-policy" },
  { label: "Disclaimer", path: "/disclaimer" },
  { label: "AI Disclaimer", path: "/ai-disclaimer" },
];

// Market template hubs. These are the crawl paths to the per-country pages:
// without them the /market/... hubs exist only in the sitemap, so Google has
// no link signal saying which country each one serves. The prerenderer emits
// the same list from the same market data, so static and rendered agree.
const marketHubLinks = listTemplateMarkets().map((m) => ({
  label: `${m.country_name} estimates`,
  path: marketTemplatesPath(m.country_code),
}));

const LINK_ROW =
  "flex min-h-10 items-center text-[13px] leading-5 text-[#5f6368] transition-colors hover:text-[#202124] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-[#9aa0a6] dark:hover:text-[#e8eaed]";

const HEADING =
  "text-[13px] font-medium leading-5 text-[#202124] dark:text-[#e8eaed]";

export default function Footer() {
  const { t } = useLanguage();
  const { marketCode } = useMarket();
  const marketCalculateLinks = calculateLinks.map((link) => ({
    ...link,
    label: getMarketNavigationLabel(link.path, marketCode, link.label),
  }));

  const groupedColumns = [
    {
      title: "Calculators",
      links: [...marketCalculateLinks, ...estimateLinks],
    },
    { title: "Explore", links: [...exploreLinks, ...companyLinks] },
    { title: "Resources", links: resourcesLinks },
    { title: "Legal", links: legalLinks },
  ];

  return (
    <footer
      role="contentinfo"
      aria-label="Site footer"
      className="border-t border-black/10 bg-[#f8f9fa] dark:border-white/10 dark:bg-[#202124]"
      style={{ contentVisibility: "auto", containIntrinsicSize: "900px" }}
    >
      <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
        {/* Brand block and link columns. On phones the brand block comes
            first and full width, then two link columns underneath. */}
        <div className="grid gap-10 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:gap-12">
          <div>
            <Link
              to="/"
              aria-label="FRELUX home"
              className="inline-flex items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Logo size="md" />
            </Link>
            <p className="mt-3 max-w-sm text-[13px] leading-6 text-[#5f6368] dark:text-[#9aa0a6]">
              {t(
                "Construction intelligence and quantity takeoff for projects across markets, with localized data availability disclosed by location.",
              )}
            </p>

            <div className="mt-5">
              <Suspense fallback={null}>
                <NewsletterSignup source="footer" />
              </Suspense>
              <p className="mt-2 text-[12px] leading-5 text-[#5f6368] dark:text-[#9aa0a6]">
                {t(
                  "Industry intelligence and quarterly material rate reports.",
                )}
              </p>
            </div>

            <a
              href={`mailto:${siteConfig.email}`}
              className="mt-3 inline-flex min-h-10 items-center text-[13px] text-[#1a73e8] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-[#8ab4f8]"
            >
              {siteConfig.email}
            </a>
          </div>

          <nav
            aria-label={t("Footer links")}
            className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 sm:gap-x-8"
          >
            {groupedColumns.map((column) => (
              <div key={column.title}>
                <h2 className={HEADING}>{t(column.title)}</h2>
                <ul className="mt-1">
                  {column.links.map((link) => (
                    <li key={link.path}>
                      <Link to={link.path} className={LINK_ROW}>
                        {t(link.label)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Country hubs as one quiet wrapped band rather than a column that
            grows a row per market. */}
        <nav
          aria-label={t("Markets")}
          className="mt-10 border-t border-black/10 pt-6 dark:border-white/10"
        >
          <h2 className={HEADING}>{t("Estimates by country")}</h2>
          <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-0">
            {marketHubLinks.map((link) => (
              <li key={link.path}>
                <Link
                  to={link.path}
                  className="flex min-h-9 items-center text-[12px] leading-5 text-[#5f6368] hover:text-[#202124] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-[#9aa0a6] dark:hover:text-[#e8eaed]"
                >
                  {t(link.label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom bar: copyright and compliance on the left, the active market
            on the right, legal links on their own row so they never wrap into
            the copyright on a narrow phone. */}
        <div className="mt-8 border-t border-black/10 pt-6 dark:border-white/10">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] leading-5 text-[#5f6368] dark:text-[#9aa0a6]">
              © {new Date().getFullYear()} {siteConfig.name}.{" "}
              {t("All rights reserved.")}
            </p>
            <p className="inline-flex items-center gap-1.5 text-[12px] leading-5 text-[#5f6368] dark:text-[#9aa0a6]">
              <Globe aria-hidden="true" className="h-3.5 w-3.5" />
              <span>{t("Prices shown for")}</span>
              <span className="font-medium text-[#202124] dark:text-[#e8eaed]">
                {marketCode}
              </span>
            </p>
          </div>
          <p className="mt-2 text-[12px] leading-5 text-[#5f6368] dark:text-[#9aa0a6]">
            {t(
              "256-bit TLS, ISO and Eurocode takeoff logic, Google AdSense and AdChoices compliant.",
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}
