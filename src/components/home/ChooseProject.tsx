import { Link } from "react-router-dom";
import {
  Paintbrush,
  Grid3x3,
  Layers,
  Building2,
  Camera,
  Brain,
  ClipboardList,
  Sun,
  ArrowRight,
} from "lucide-react";
import Container from "@/components/ui/Container";

interface ProjectCard {
  icon: typeof Paintbrush;
  title: string;
  description: string;
  to: string;
  accent: string;
  iconBg: string;
}

// The cards immediately below the hero are the capability pillars of
// FRELUX, chosen to represent what the platform stands for on first visit:
// the material calculators people arrive for, the flagship whole-building
// estimator and BOQ, the AI layer, and the energy estimator. All other
// tools remain one click away via the tool library section and the
// Construction Tools menu.
const projectCards: ProjectCard[] = [
  {
    icon: Paintbrush,
    title: "Painting",
    description:
      "Calculate paint quantities, containers, and full cost breakdowns for any room.",
    to: "/paint-calculator",
    accent: "text-brand-purple",
    iconBg: "bg-primary/10",
  },
  {
    icon: Grid3x3,
    title: "Tiles",
    description:
      "Estimate tile count, adhesive, grout, and layout for floors and walls.",
    to: "/tile-calculator",
    accent: "text-accent-cyan",
    iconBg: "bg-accent-cyan/10",
  },
  {
    icon: Layers,
    title: "Screeding",
    description:
      "Calculate wall screeding area, cement, sand, and bonding agent quantities.",
    to: "/screeding-calculator",
    accent: "text-accent-orange",
    iconBg: "bg-accent-orange/10",
  },
  {
    icon: Building2,
    title: "Build-to-Roof Estimator",
    description:
      "One full-building estimate from foundation to roof, with every trade priced.",
    to: "/build-to-roof-estimator",
    accent: "text-accent-green",
    iconBg: "bg-accent-green/10",
  },
  {
    icon: ClipboardList,
    title: "BOQ Generator",
    description:
      "Turn any estimate into a professional bill of quantities for tendering.",
    to: "/boq-generator",
    accent: "text-brand-purple",
    iconBg: "bg-primary/10",
  },
  {
    icon: Camera,
    title: "AI Photo Estimator",
    description:
      "Upload a photo of any building and get an instant AI-assisted cost estimate.",
    to: "/image-estimator",
    accent: "text-accent-cyan",
    iconBg: "bg-accent-cyan/10",
  },
  {
    icon: Brain,
    title: "Smart Calculator",
    description:
      "Describe your project in plain language and get quantities and costs back.",
    to: "/smart-calculator",
    accent: "text-accent-green",
    iconBg: "bg-accent-green/10",
  },
  {
    icon: Sun,
    title: "Solar PV Estimator",
    description:
      "Size a complete solar system — panels, batteries, inverter — with full cost.",
    to: "/solar-pv-estimator",
    accent: "text-amber-600",
    iconBg: "bg-amber-100 dark:bg-amber-500/10",
  },
];

export default function ChooseProject() {
  return (
    <section
      aria-label="Choose your project type"
      className="relative -mt-12 pb-16 pt-4 sm:pb-20"
      style={{ zIndex: 1 }}
    >
      <Container>
        <div className="mb-8 text-center">
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl dark:text-primary-foreground">
            Start With What You Need
          </h2>
          <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
            The most-used tools on FRELUX — from a single room to an entire
            building.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {projectCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.to}
                to={card.to}
                aria-label={`Open ${card.title} calculator`}
                className="card-hover group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all duration-300 hover:border-brand-purple/20 hover:shadow-premium dark:border-white/5 dark:bg-card dark:hover:border-brand-purple/30"
              >
                {/* Hover glow */}
                <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/0 blur-3xl transition-all duration-500 group-hover:bg-primary/10" />

                {/* Shimmer border */}
                <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent transition-all duration-500 group-hover:via-primary/30" />

                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${card.iconBg} ${card.accent} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                </div>

                <h3 className="mt-4 font-display text-base font-bold text-foreground dark:text-primary-foreground">
                  {card.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground dark:text-muted-foreground">
                  {card.description}
                </p>

                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple transition-all group-hover:gap-2.5 dark:text-brand-purple-lighter">
                  Open calculator
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
