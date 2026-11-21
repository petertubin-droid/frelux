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
// Design contract (2026-11-21, premium pass)
//
// The footer is a deep, quiet surface rather than a decorated panel:
//  - one near-black surface (#0B0B14) in both themes, so the page ends on a
//    deliberate edge instead of fading into gray. The only decorative element
//    is a single 1px brand hairline at the very top;
//  - no backdrop image, no neon edge, no rounded corners, no glass;
//  - 13.5px links on 40px tap rows, headings as 11px tracked small caps, and
//    generous vertical rhythm (48px between sections on phones);
//  - TWO real link columns on phones, four from sm up, headings always
//    visible: nothing is hidden behind a disclosure control, because a footer
//    is the last chance for a lost reader to find a page;
//  - legal links live in the bottom bar, where readers look for them, so no
//    destination renders twice.
//
// Every destination appears exactly once (Footer.test.tsx enforces it).
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

const HEADING =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45";

const LINK_ROW =
  "flex min-h-10 items-center text-[13.5px] leading-5 text-white/65 transition-colors duration-150 hover:text-white hover:underline hover:decoration-white/40 hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B14]";

const QUIET = "text-[12px] leading-5 text-white/45";

const SMALL_LINK =
  "flex min-h-9 items-center text-[12.5px] leading-5 text-white/55 transition-colors hover:text-white hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B14]";

export default function Footer() {
  const { t } = useLanguage();
  const { marketCode } = useMarket();
  const marketCalculateLinks = calculateLinks.map((link) => ({
    ...link,
    label: getMarketNavigationLabel(link.path, marketCode, link.label),
  }));

  // Four columns, no legal column: legal links live in the bottom bar where a
  // reader looks for them, so nothing renders twice.
  const groupedColumns = [
    {
      title: "Calculators",
      links: [...marketCalculateLinks, ...estimateLinks],
    },
    { title: "Explore", links: exploreLinks },
    { title: "Resources", links: resourcesLinks },
    { title: "Company", links: companyLinks },
  ];

  return (
    <footer
      role="contentinfo"
      aria-label="Site footer"
      className="relative bg-[#0B0B14] text-white dark:bg-[#08080F]"
      style={{ contentVisibility: "auto", containIntrinsicSize: "1100px" }}
    >
      {/* Brand accent hairline: one 1px rule, the only decorative element. */}
      <div
        aria-hidden="true"
        className="h-px w-full bg-gradient-to-r from-brand-purple/70 via-brand-accent/60 to-transparent"
      />

      <div className="mx-auto w-full max-w-7xl px-5 pb-8 pt-12 sm:px-8 sm:pb-10 sm:pt-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
          {/* Brand block */}
          <div>
            <Link
              to="/"
              aria-label="FRELUX home"
              className="inline-flex items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0B0B14]"
            >
              <Logo size="md" light decorative />
            </Link>

            <p className="mt-4 max-w-sm text-[13.5px] leading-6 text-white/60">
              {t(
                "Construction intelligence and quantity takeoff for projects across markets, with localized data availability disclosed by location.",
              )}
            </p>

            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                {t("Weekly price updates")}
              </p>
              <div className="mt-3">
                <Suspense fallback={null}>
                  <NewsletterSignup source="footer" />
                </Suspense>
              </div>
              <p className="mt-2 text-[12px] leading-5 text-white/45">
                {t("One email every Monday. Unsubscribe any time.")}
              </p>
            </div>

            <a
              href={`mailto:${siteConfig.email}`}
              className="mt-4 inline-flex min-h-10 items-center text-[13px] text-white/75 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B14]"
            >
              {siteConfig.email}
            </a>
          </div>

          {/* Link columns */}
          <nav
            aria-label={t("Footer links")}
            className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 sm:gap-x-8"
          >
            {groupedColumns.map((column) => (
              <div key={column.title}>
                <h2 className={HEADING}>{t(column.title)}</h2>
                <ul className="mt-3">
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

        {/* Country hubs */}
        <nav
          aria-label={t("Markets")}
          className="mt-12 border-t border-white/10 pt-8"
        >
          <h2 className={HEADING}>{t("Estimates by country")}</h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-0">
            {marketHubLinks.map((link) => (
              <li key={link.path}>
                <Link to={link.path} className={SMALL_LINK}>
                  {t(link.label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-white/10 pt-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <p className="text-[12.5px] leading-5 text-white/55">
                © {new Date().getFullYear()} {siteConfig.name}.{" "}
                {t("All rights reserved.")}
              </p>
              <p className={`mt-1.5 ${QUIET}`}>
                {t(
                  "Estimates are guidance only, not a guarantee of final cost or quantity.",
                )}
              </p>
            </div>

            <nav
              aria-label={t("Legal")}
              className="flex flex-wrap gap-x-6 gap-y-0"
            >
              {legalLinks.map((link) => (
                <Link key={link.path} to={link.path} className={SMALL_LINK}>
                  {t(link.label)}
                </Link>
              ))}
            </nav>
          </div>

          <div className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className={QUIET}>
              {t(
                "256-bit TLS, ISO and Eurocode takeoff logic, Google AdSense and AdChoices compliant.",
              )}
            </p>
            <p className="inline-flex items-center gap-1.5 text-[12px] leading-5 text-white/45">
              <Globe aria-hidden="true" className="h-3.5 w-3.5" />
              <span>{t("Prices shown for")}</span>
              <span className="font-medium text-white/80">{marketCode}</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
