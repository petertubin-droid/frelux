import { Link } from "react-router-dom";
import { Cookie, Mail } from "lucide-react";
import Logo from "@/components/brand/Logo";
import NewsletterSignup from "@/components/newsletter/NewsletterSignup";
import { siteConfig } from "@/config/site";
import { withdrawConsent } from "@/lib/cookie-consent";
import BrandBackdrop from "@/components/ui/BrandBackdrop";
import { Button } from "@/components/ui/shadcn/button";

const calculateLinks = [
  { label: "Painting Calculator", path: "/paint-calculator" },
  { label: "Screeding Calculator", path: "/screeding-calculator" },
  { label: "POP Ceiling Calculator", path: "/pop-ceiling-calculator" },
  { label: "Tile Calculator", path: "/tile-calculator" },
  { label: "Finishing Calculator", path: "/finish-estimator" },
];

const estimateLinks = [
  { label: "Build-to-Roof Estimator", path: "/build-to-roof-estimator" },
  { label: "AI Photo Estimator", path: "/image-estimator" },
  { label: "Smart Calculator", path: "/smart-calculator" },
  { label: "Structural Calculator", path: "/structural-calculator" },
  { label: "Foundation Calculator", path: "/foundation-calculator" },
];

// Colors, services and showcase merged into one column; duplicate links
// (Pricing, Project Gallery) removed so each destination appears once.
const exploreLinks = [
  { label: "Color Library", path: "/colors" },
  { label: "Compare Colors", path: "/colors/compare" },
  { label: "Smart Color Assistant", path: "/ai-color-assistant" },
  { label: "Marketplace", path: "/marketplace" },
  { label: "Pro Connect", path: "/pro-connect" },
  { label: "Project Gallery", path: "/gallery" },
  { label: "Case Studies", path: "/case-studies" },
];

const resourcesLinks = [
  { label: "Learn Hub", path: "/learn" },
  { label: "Material Prices", path: "/prices" },
  { label: "Glossary", path: "/glossary" },
  { label: "Free Templates", path: "/printables" },
  { label: "User Guide", path: "/user-guide" },
  { label: "Pricing", path: "/pricing" },
  { label: "Developer API", path: "/developers" },
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

export default function Footer() {
  return (
    <footer
      role="contentinfo"
      aria-label="Site footer"
      className="neon-edge-soft relative overflow-hidden border-t border-border/60 bg-muted/50 dark:border-white/5 dark:bg-background"
      style={{ contentVisibility: "auto", containIntrinsicSize: "320px" }}
    >
      {/* Subtle top gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />

      {/* Brand architectural backdrop (same layers as the entry screen) */}
      <BrandBackdrop variant="footer" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-3 lg:grid-cols-6 lg:gap-x-8">
          <div className="col-span-2 lg:col-span-2">
            <Logo />
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Plan materials, estimate costs and manage construction projects
              worldwide: from a single room to an entire building.
            </p>
            <div className="mt-4">
              <NewsletterSignup source="footer" />
            </div>
            <a
              href={`mailto:${siteConfig.email}`}
              aria-label="Email us"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-semibold text-brand-purple transition-colors hover:bg-primary/15 dark:bg-primary/15 dark:text-primary-foreground/90 dark:hover:bg-primary/25"
            >
              <Mail className="h-4 w-4" />
              {siteConfig.email}
            </a>
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground dark:text-muted-foreground">
              <span className="font-medium text-foreground dark:text-primary-foreground/90">39 markets</span>
              <span aria-hidden="true">·</span>
              <span>Local currency pricing</span>
              <span aria-hidden="true">·</span>
              <span>Email support, replies within one business day</span>
            </p>
          </div>

          <FooterColumn title="Calculate" links={calculateLinks} />
          <FooterColumn title="Estimate" links={estimateLinks} />
          <FooterColumn title="Explore" links={exploreLinks} />
          <FooterColumn title="Resources" links={resourcesLinks} />
          <FooterColumn title="Company" links={companyLinks} />
          <FooterColumn title="Legal" links={legalLinks} />
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} {siteConfig.name}. All rights
              reserved.
            </p>
            <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
              Estimates are for guidance only and not a guarantee of final cost
              or quantity.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => withdrawConsent()}
            aria-label="Cookie preferences"
            title="Cookie preferences"
            className="h-8 w-8 shrink-0 self-start rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-brand-purple sm:self-auto dark:hover:bg-white/5 dark:hover:text-brand-purple-lighter"
          >
            <Cookie className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; path: string }[];
}) {
  return (
    <nav aria-label={title}>
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:text-muted-foreground">
        {title}
      </h3>
      <ul className="mt-2.5 space-y-1.5">
        {links.map((link) => (
          <li key={link.path}>
            <Link
              to={link.path}
              className="text-[13px] sm:text-sm text-muted-foreground transition-colors hover:text-brand-purple dark:text-muted-foreground dark:hover:text-brand-purple-lighter"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
