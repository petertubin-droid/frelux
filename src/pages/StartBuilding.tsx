import { Link } from "react-router-dom";
import {
  Building2,
  Paintbrush,
  Hammer,
  Layers,
  Grid3x3,
  Building,
  Palette,
  ArrowRight,
  Camera,
  HelpCircle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";
import { useSeo } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { SITE_URL } from "@/lib/seo";

export default function StartBuilding() {
  useSeo({
    title: "Start Building: What Are You Building Today? | FRELUX",
    description:
      "Start your construction project with FRELUX. Estimate materials and costs from foundation to roof, then finishing — paint, screeding, POP ceiling, tiles, and exterior. Free Nigerian construction calculators and estimators.",
    canonicalPath: "/start-building",
    ogType: "website",
    keywords:
      "start building, construction estimator Nigeria, build to roof estimator, paint calculator, screeding calculator, POP ceiling calculator, tile calculator, tyrolene estimator, construction cost calculator Nigeria",
    structuredDataArray: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Start Building — FRELUX",
        description:
          "Choose what you are building and FRELUX will help you calculate materials, quantities and estimated project costs.",
        url: `${SITE_URL}/start-building`,
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Start Building",
            item: `${SITE_URL}/start-building`,
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "FRELUX Building Categories",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Build to Roof",
            url: `${SITE_URL}/build-to-roof-estimator`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Painting",
            url: `${SITE_URL}/paint-calculator`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Screeding",
            url: `${SITE_URL}/screeding-calculator`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: "POP Ceiling",
            url: `${SITE_URL}/pop-ceiling-calculator`,
          },
          {
            "@type": "ListItem",
            position: 5,
            name: "Tiles & Flooring",
            url: `${SITE_URL}/tile-calculator`,
          },
          {
            "@type": "ListItem",
            position: 6,
            name: "Exterior Finishing",
            url: `${SITE_URL}/tyrolene-estimator`,
          },
          {
            "@type": "ListItem",
            position: 7,
            name: "Colour & Design",
            url: `${SITE_URL}/colors`,
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is the Build-to-Roof Estimator?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The Build-to-Roof Estimator calculates materials and costs for a complete building project from foundation through roofing, including blocks, cement, sand, granite, roofing sheets, structural members, and labour based on Nigerian construction standards.",
            },
          },
          {
            "@type": "Question",
            name: "Can I estimate finishing costs after the build?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. After your structure is built, use FRELUX finishing calculators for paint, screeding, POP ceiling, tiles, and exterior finishes to estimate materials and costs for each stage.",
            },
          },
          {
            "@type": "Question",
            name: "Are FRELUX calculators free to use?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. All calculators and estimators are free to use with no sign-up required. Pro features like saved estimates and PDF exports are available with a Pro account.",
            },
          },
        ],
      },
    ],
  });

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Start Building" },
        ]}
        eyebrow="Construction Planning"
        title="What Are You Building Today?"
        subtitle="Choose what you're working on and FRELUX will help you calculate materials, quantities and estimated project costs."
      />

      {/* ── Construction Journey Visual ── */}
      <div className="border-b border-neutral-200/80 bg-brand-navy-mid dark:bg-brand-navy-mid">
        <Container className="py-6">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide text-xs font-medium text-white/60">
            <span className="whitespace-nowrap text-white/40">FOUNDATION</span>
            <ChevronRight className="h-3 w-3 text-white/20" />
            <span className="whitespace-nowrap text-white/40">STRUCTURE</span>
            <ChevronRight className="h-3 w-3 text-white/20" />
            <span className="whitespace-nowrap text-white/40">WALLS</span>
            <ChevronRight className="h-3 w-3 text-white/20" />
            <span className="whitespace-nowrap text-white/40">ROOF</span>
            <ChevronRight className="h-3 w-3 text-white/20" />
            <span className="whitespace-nowrap text-white/40">SCREEDING</span>
            <ChevronRight className="h-3 w-3 text-white/20" />
            <span className="whitespace-nowrap text-white/40">POP CEILING</span>
            <ChevronRight className="h-3 w-3 text-white/20" />
            <span className="whitespace-nowrap text-white/40">
              TILES / FLOORING
            </span>
            <ChevronRight className="h-3 w-3 text-white/20" />
            <span className="whitespace-nowrap text-white/40">PAINTING</span>
            <ChevronRight className="h-3 w-3 text-white/20" />
            <span className="whitespace-nowrap text-white/40">
              EXTERIOR FINISHING
            </span>
            <ChevronRight className="h-3 w-3 text-white/20" />
            <span className="whitespace-nowrap text-white/40">
              COLOUR / DESIGN
            </span>
          </div>
        </Container>
      </div>

      {/* ── Build-to-Roof Feature Card (primary) ── */}
      <Container className="py-10 sm:py-12">
        <Link
          to="/build-to-roof-estimator"
          onClick={() =>
            track("start_building_clicked", { category: "build_to_roof" })
          }
          className="group block overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-brand-navy to-brand-navy-mid shadow-premium-lg transition-all hover:shadow-xl hover:scale-[1.01] dark:border-white/10"
        >
          <div className="grid items-center gap-0 md:grid-cols-2">
            {/* Left: Content */}
            <div className="p-8 sm:p-10 lg:p-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-purple/20 px-3 py-1 text-xs font-medium text-brand-purple-light">
                <Building2 aria-hidden="true" className="h-3.5 w-3.5" />
                Start Here
              </div>
              <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Build to Roof
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-white/60">
                Your starting point for estimating a building project. Estimate
                your project from building to roof, then move into the finishing
                stages with FRELUX.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/50">
                  <CheckCircle2
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-accent-green"
                  />
                  Foundation to roofing
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/50">
                  <CheckCircle2
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-accent-green"
                  />
                  Blocks, cement, sand & granite
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/50">
                  <CheckCircle2
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-accent-green"
                  />
                  Nigerian construction standards
                </span>
              </div>
              <div className="mt-7 inline-flex items-center gap-2 rounded-xl bg-brand-purple px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-purple/25 transition-all group-hover:bg-brand-purple-dark group-hover:shadow-xl">
                Start Build-to-Roof Estimate
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                />
              </div>
            </div>
            {/* Right: Visual */}
            <div className="relative hidden min-h-[280px] md:block">
              <img
                src="https://images.pexels.com/photos/159306/construction-site-build-construction-work-159306.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Building under construction from foundation to roof"
                className="absolute inset-0 h-full w-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-navy/40 to-transparent" />
            </div>
          </div>
        </Link>
      </Container>

      {/* ── Secondary Categories ── */}
      <Container className="pb-12">
        <div className="mb-6">
          <h2 className="font-display text-xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-2xl">
            Finishing & Specialised Calculators
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
            After your structure is built, estimate materials and costs for each
            finishing stage.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Painting */}
          <CategoryCard
            icon={<Paintbrush aria-hidden="true" className="h-5 w-5" />}
            title="Painting"
            description="Estimate paint quantities, finishes and material requirements for rooms, homes and projects."
            tools={[
              { label: "Paint Calculator", to: "/paint-calculator" },
              {
                label: "Painting Estimator",
                to: "/paint-calculator?mode=room-estimate",
              },
              {
                label: "Paint Cost Estimator",
                to: "/paint-calculator?mode=cost",
              },
            ]}
            onClick={() =>
              track("painting_category_clicked", { source: "start_building" })
            }
          />

          {/* Screeding */}
          <CategoryCard
            icon={<Hammer aria-hidden="true" className="h-5 w-5" />}
            title="Screeding"
            description="Calculate screeding materials and estimate the requirements for your project."
            tools={[
              { label: "Screeding Calculator", to: "/screeding-calculator" },
              {
                label: "Screeding Cost Estimator",
                to: "/screeding-calculator?mode=cost",
              },
            ]}
            onClick={() =>
              track("screeding_category_clicked", { source: "start_building" })
            }
          />

          {/* POP Ceiling */}
          <CategoryCard
            icon={<Layers aria-hidden="true" className="h-5 w-5" />}
            title="POP Ceiling"
            description="Estimate POP ceiling materials and project requirements."
            tools={[
              {
                label: "POP Ceiling Calculator",
                to: "/pop-ceiling-calculator",
              },
              {
                label: "POP Ceiling Cost Estimator",
                to: "/pop-ceiling-calculator?mode=cost",
              },
            ]}
            onClick={() =>
              track("pop_category_clicked", { source: "start_building" })
            }
          />

          {/* Tiles & Flooring */}
          <CategoryCard
            icon={<Grid3x3 aria-hidden="true" className="h-5 w-5" />}
            title="Tiles & Flooring"
            description="Calculate tile quantities, cartons, wastage and project requirements."
            tools={[
              { label: "Tile Calculator", to: "/tile-calculator" },
              {
                label: "Tile Cost Estimator",
                to: "/tile-calculator?mode=cost",
              },
            ]}
            onClick={() =>
              track("tiles_category_clicked", { source: "start_building" })
            }
          />

          {/* Exterior Finishing */}
          <CategoryCard
            icon={<Building className="h-5 w-5" />}
            title="Exterior Finishing"
            description="Estimate exterior wall finishes including Tyrolene and other coatings."
            tools={[
              {
                label: "Tyrolene Estimator",
                to: "/finish-estimator?mode=tyrolene",
              },
              { label: "Finish Estimator", to: "/finish-estimator" },
            ]}
            onClick={() =>
              track("exterior_finishing_clicked", { source: "start_building" })
            }
          />

          {/* Colour & Design */}
          <CategoryCard
            icon={<Palette aria-hidden="true" className="h-5 w-5" />}
            title="Colour & Design"
            description="Browse paint colours, compare options, and get AI-powered colour recommendations."
            tools={[
              { label: "Colour Gallery", to: "/colors" },
              { label: "Compare Colours", to: "/colors/compare" },
              { label: "Smart Colour Assistant", to: "/ai-color-assistant" },
            ]}
            onClick={() =>
              track("colour_design_clicked", { source: "start_building" })
            }
          />
        </div>
      </Container>

      {/* ── AI Photo Estimator Banner ── */}
      <Container className="pb-12">
        <Link
          to="/image-estimator"
          onClick={() =>
            track("start_building_clicked", { category: "ai_photo_estimator" })
          }
          className="group flex flex-col items-center gap-4 rounded-2xl border border-neutral-200 bg-gradient-to-r from-brand-navy-mid to-brand-navy p-6 text-center shadow-lg transition-all hover:shadow-xl hover:scale-[1.01] dark:border-white/10 sm:flex-row sm:text-left"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-green/20">
            <Camera aria-hidden="true" className="h-6 w-6 text-accent-green" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-bold text-white">
              Not sure where to start? Try the AI Photo Estimator
            </h3>
            <p className="mt-1 text-sm text-white/60">
              Upload a photo of your site or room and get an AI-powered material
              and cost estimate in seconds.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-all group-hover:bg-white/15">
            Try it now
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            />
          </div>
        </Link>
      </Container>

      {/* ── Not sure where to start ── */}
      <Container className="pb-16">
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center dark:border-neutral-700 dark:bg-brand-navy-mid/50">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-purple/10">
            <HelpCircle className="h-5 w-5 text-brand-purple" />
          </div>
          <h3 className="mt-4 font-display text-lg font-bold text-neutral-900 dark:text-white">
            Not sure where to start?
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-500">
            Tell FRELUX what you're working on and we'll guide you to the right
            calculator.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/calculators"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-purple px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-purple-dark"
            >
              View All Calculators
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              to="/learn"
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-5 py-3 text-sm font-semibold text-neutral-700 transition-all hover:bg-neutral-100 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
            >
              Learn Construction Basics
            </Link>
          </div>
        </div>
      </Container>
    </>
  );
}

/* ─── Category Card Component ─── */

interface ToolLink {
  label: string;
  to: string;
}

function CategoryCard({
  icon,
  title,
  description,
  tools,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tools: ToolLink[];
  onClick?: () => void;
}) {
  return (
    <div className="group flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:border-brand-purple/30 hover:shadow-md dark:border-white/10 dark:bg-brand-navy-mid">
      {/* Header */}
      <Link
        to={tools[0].to}
        onClick={onClick}
        className="flex items-center gap-3"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple transition-colors group-hover:bg-brand-purple/20">
          {icon}
        </div>
        <h3 className="font-display text-base font-bold text-neutral-900 transition-colors group-hover:text-brand-purple dark:text-white">
          {title}
        </h3>
      </Link>

      {/* Description */}
      <p className="mt-3 text-sm leading-relaxed text-neutral-500 dark:text-neutral-500">
        {description}
      </p>

      {/* Tool links */}
      <div className="mt-4 flex flex-1 flex-col gap-1.5">
        {tools.map((tool) => (
          <Link
            key={tool.to}
            to={tool.to}
            onClick={onClick}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 transition-colors hover:text-brand-purple dark:text-neutral-300 dark:hover:text-brand-purple-lighter"
          >
            <ChevronRight className="h-3.5 w-3.5 text-neutral-300 dark:text-neutral-600" />
            {tool.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
