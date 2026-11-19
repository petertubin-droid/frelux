import { describe, expect, it } from "vitest";
import zh from "@/lib/i18n/locales/zh.json";
import ja from "@/lib/i18n/locales/ja.json";
import ru from "@/lib/i18n/locales/ru.json";
import navLabelGaps from "@/lib/i18n/nav-label-gaps.json";

/**
 * The admin and navigation chrome that used to fall back to English in
 * Chinese, Japanese and Russian.
 *
 * These labels are not marketing copy, so they never reach the curated
 * dictionaries: they live in the generated locale files, which a regeneration
 * pass can overwrite. Pinning them here means the English fallback cannot come
 * back unnoticed, because the audit reported an interface that stayed English
 * for three of the twelve languages.
 */
const ADMIN_LABELS: string[] = [
  "AI Credits",
  "AI Engines",
  "Ad Management",
  "Ad Manager",
  "Admin",
  "Analytics Dashboard",
  "Audit Log",
  "Available",
  "BOQ Templates",
  "Building Services",
  "Building from Abroad",
  "Business",
  "Cash-Flow Templates",
  "Code Registry",
  "Community Prices",
  "Company Profiles",
  "Config & Rules",
  "Construction Dictionary",
  "Conversational Packs",
  "Convert & Explore",
  "Core",
  "Create account",
  "Credit Profiles",
  "Credits & Rewards",
  "Dark mode",
  "Display & layout",
  "Email us",
  "Engine Config",
  "Engine Studio",
  "Engine Test Calculator",
  "Estimate & build",
  "Estimates",
  "Everything else on FRELUX",
  "Explore & trade",
  "Explore Map",
  "FAQ Articles",
  "Factor Tables",
  "Field performance",
  "Free plan",
  "Image Estimation",
  "Industry Trends",
  "Intelligence Sources",
  "Investment Insights",
  "Learn Articles",
  "Learning Review",
  "Macro Tracker",
  "Maintenance Profiles",
  "Manage",
  "Manage & learn",
  "Market News",
  "Market Overview",
  "Market Prices",
  "Markets & Regions",
  "Material prices, markets, finishes and people to hire",
  "Materials & Finishes",
  "Materials Market",
  "Media Manager",
  "Money & disputes",
  "More",
  "My dashboard",
  "No matches",
  "PDF Branding & Templates",
  "Paid plan",
  "Paint Types (Legacy)",
  "Price Index Review",
  "Price Updater",
  "Prices",
  "Pro SEO & Location",
  "Professionals & Reports",
  "Project & Cost",
  "Quantities, costs and units for the work in front of you",
  "Quick tools",
  "Regional Costs",
  "Reuse Factors",
  "Roadmap",
  "Roles & Permissions",
  "Scale and calculator view",
  "Search tools and pages",
  "Social Brand Center",
  "Solar Panels",
  "Solar Prices",
  "Stock Market",
  "Structure",
  "Subscription prices",
  "Supplier Network",
  "Tax rules",
  "Thermal Factors",
  "Tile Library",
  "Timeline Templates",
  "Toggle section",
  "Total Owned",
  "Travel approvals",
  "Try a trade, a material or a page name.",
  "Typography",
  "Unit Converter",
  "Wall Finishing Library",
  "Your account",
  "Your projects, guides and everything you have saved",
];

const LOCALES: Record<string, Record<string, string>> = { zh, ja, ru };

describe("admin and navigation labels", () => {
  it("covers the labels the audit found in English", () => {
    expect(ADMIN_LABELS.length).toBeGreaterThan(90);
  });

  it.each(Object.keys(LOCALES))("translates every label in %s", (locale) => {
    const dictionary = LOCALES[locale];
    const untranslated = ADMIN_LABELS.filter((label) => {
      const value = dictionary[label];
      return !value || value.trim() === label.trim();
    });
    expect(untranslated).toEqual([]);
  });

  it("keeps FRELUX and BOQ as trade names, not translation targets", () => {
    // Proper nouns and the bill of quantities acronym read the same in every
    // market; they are the only Latin text left in these labels by design.
    const latin = ADMIN_LABELS.filter((label) =>
      /FRELUX|BOQ/.test(LOCALES.zh[label] ?? ""),
    );
    expect(latin).toContain("Everything else on FRELUX");
  });

  it("no longer declares any locale as showing English labels", () => {
    expect(Object.keys(navLabelGaps)).toEqual([]);
  });
});
