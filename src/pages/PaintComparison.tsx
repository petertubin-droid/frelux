import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Loader2,
  ArrowRight,
  Sparkles,
  Palette,
  Shield,
  Droplets,
  TrendingUp,
  Info,
  Plus,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useSeo } from "@/lib/seo";
import { fetchPaintComparisons } from "@/lib/project-intelligence";
import type { DbPaintComparison } from "@/types/database";

export default function PaintComparison() {
  useSeo({
    title: "Paint Comparison Tool: Matt vs Satin vs Emulsion",
    description:
      "Compare paint types side by side. See differences in finish, durability, washability, recommended use, and price range to choose the right paint for your project.",
    canonicalPath: "/paint-comparison",
    ogType: "website",
    structuredDataArray: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is the difference between matt and satin paint?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Matt paint has a flat, non-reflective finish that hides wall imperfections. Satin has a subtle sheen that is more durable and washable, making it better for kitchens and bathrooms.",
            },
          },
          {
            "@type": "Question",
            name: "Which paint finish is most durable?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Satin and semi-gloss finishes are the most durable. They resist moisture, are easy to clean, and maintain their appearance over time better than matt finishes.",
            },
          },
          {
            "@type": "Question",
            name: "How do I choose the right paint for my room?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Consider the room's function, moisture level, and traffic. Use matt for low-traffic areas like bedrooms, satin for kitchens and bathrooms, and emulsion for general interior walls.",
            },
          },
        ],
      },
    ],
  });

  const [comparisons, setComparisons] = useState<DbPaintComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPaints, setSelectedPaints] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPaintComparisons()
      .then((data) => {
        setComparisons(data);
        // Select first 3 by default
        setSelectedPaints(new Set(data.slice(0, 3).map((d) => d.id)));
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const comparisonRows: Array<{
    label: string;
    key: keyof DbPaintComparison;
    icon?: typeof Palette;
  }> = [
    { label: "Finish", key: "finish", icon: Palette },
    { label: "Recommended Use", key: "recommended_use", icon: Info },
    { label: "Durability", key: "durability", icon: Shield },
    { label: "Washability", key: "washability", icon: Droplets },
    { label: "Appearance", key: "appearance", icon: Sparkles },
    { label: "Characteristics", key: "product_characteristics" },
    { label: "Suitable Areas", key: "suitable_areas" },
    { label: "Price Range", key: "price_range", icon: TrendingUp },
  ];

  function togglePaint(id: string) {
    setSelectedPaints((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id); // Keep at least 1 selected
      } else {
        if (next.size < 4) next.add(id); // Max 4 at once
      }
      return next;
    });
  }

  const visibleComparisons = comparisons.filter((c) =>
    selectedPaints.has(c.id),
  );

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        eyebrow="Tools"
        title="Paint Comparison Tool"
        subtitle="Compare paint types side by side to find the right finish for your project."
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-brand-purple" />
            <p className="text-sm text-neutral-500">
              Loading paint comparisons…
            </p>
          </div>
        )}

        {error && (
          <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10">
            {error}
          </div>
        )}

        {!loading && !error && comparisons.length > 0 && (
          <>
            {/* Paint selector chips */}
            <div className="mb-8">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-neutral-500">
                Select paints to compare
              </h2>
              <div className="flex flex-wrap gap-2">
                {comparisons.map((c) => {
                  const isSelected = selectedPaints.has(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => togglePaint(c.id)}
                      className={`group inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 ${
                        isSelected
                          ? "bg-brand-purple text-white shadow-md shadow-brand-purple/25"
                          : "border border-neutral-200 bg-white text-neutral-600 hover:border-brand-purple/30 dark:border-white/10 dark:bg-brand-navy-mid dark:text-neutral-400"
                      }`}
                    >
                      {isSelected ? (
                        <Check className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                      ) : (
                        <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                      )}
                      {c.display_name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Premium comparison table */}
            <div className="overflow-hidden rounded-2xl border border-neutral-200 shadow-lg dark:border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-gradient-to-r from-brand-purple/5 to-transparent dark:border-white/10">
                      <th className="sticky left-0 z-10 bg-gradient-to-r from-brand-purple/5 to-transparent p-5 text-left font-bold text-neutral-500 dark:bg-brand-navy-mid">
                        <span className="text-xs uppercase tracking-widest">
                          Feature
                        </span>
                      </th>
                      {visibleComparisons.map((c) => (
                        <th key={c.id} className="p-5 text-left">
                          <div className="flex items-center gap-2">
                            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple">
                              <Palette className="h-5 w-5" />
                            </div>
                            <span className="font-bold text-brand-navy dark:text-white">
                              {c.display_name}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Description row */}
                    <tr className="border-b border-neutral-200 dark:border-white/10">
                      <td className="sticky left-0 z-10 bg-white p-5 font-semibold text-neutral-500 dark:bg-brand-navy-mid">
                        <span className="text-xs uppercase tracking-widest">
                          Description
                        </span>
                      </td>
                      {visibleComparisons.map((c) => (
                        <td
                          key={c.id}
                          className="p-5 text-neutral-600 dark:text-neutral-300"
                        >
                          {c.description || "—"}
                        </td>
                      ))}
                    </tr>
                    {comparisonRows.map((row, i) => {
                      const Icon = row.icon;
                      return (
                        <tr
                          key={row.key}
                          className={`border-b border-neutral-200 transition-colors hover:bg-brand-purple/5 dark:border-white/10 ${
                            i % 2 === 0
                              ? "bg-neutral-50/50 dark:bg-white/[0.02]"
                              : ""
                          }`}
                        >
                          <td className="sticky left-0 z-10 bg-inherit p-5 font-semibold text-neutral-600 dark:text-neutral-400">
                            <span className="flex items-center gap-2">
                              {Icon && (
                                <Icon className="h-4 w-4 text-brand-purple/60" />
                              )}
                              {row.label}
                            </span>
                          </td>
                          {visibleComparisons.map((c) => (
                            <td
                              key={c.id}
                              className="p-5 text-neutral-700 dark:text-neutral-300"
                            >
                              {(c[row.key] as string) || "—"}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Premium CTA cards */}
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visibleComparisons.map((c, i) => (
                <div
                  key={c.id}
                  className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-brand-navy-mid"
                  style={{
                    animation: `fadeInUp 0.4s ease-out ${i * 80}ms both`,
                  }}
                >
                  {/* Gradient accent bar */}
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-purple to-brand-purple/40 transition-all duration-500 group-hover:h-1.5" />

                  <div className="flex items-center gap-3 mb-4">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple transition-transform duration-300 group-hover:scale-110">
                      <Palette className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-brand-navy dark:text-white">
                      {c.display_name}
                    </h3>
                  </div>

                  <p className="mb-2 text-sm text-neutral-500 dark:text-neutral-400">
                    {c.finish || ""}
                  </p>
                  <p className="mb-5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 line-clamp-3">
                    {c.description || ""}
                  </p>

                  <Link
                    to="/paint-calculator"
                    className="group/btn inline-flex items-center gap-2 rounded-lg bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-purple/20 transition-all duration-300 hover:bg-brand-purple/90 hover:shadow-lg hover:shadow-brand-purple/30 active:scale-95"
                  >
                    Calculate {c.display_name}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </Link>
                </div>
              ))}
            </div>

            {/* Help section */}
            <div className="mt-10 rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-brand-purple/5 via-transparent to-transparent p-6 sm:p-8">
              <h3 className="text-lg font-bold text-brand-navy dark:text-white">
                Need more help choosing?
              </h3>
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                Use our AI Color Assistant for personalized recommendations, or
                create a project to organize your painting work.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/ai-color-assistant"
                  className="group inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-brand-navy transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-purple/30 hover:shadow-md dark:border-white/10 dark:text-white"
                >
                  <Sparkles className="h-4 w-4 text-brand-purple transition-transform duration-300 group-hover:rotate-12" />
                  AI Color Assistant
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/start-building"
                  className="group inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-brand-navy transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-purple/30 hover:shadow-md dark:border-white/10 dark:text-white"
                >
                  Create a Project
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/learn/category/painting-guides"
                  className="group inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-brand-navy transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-purple/30 hover:shadow-md dark:border-white/10 dark:text-white"
                >
                  Learn More
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </>
        )}

        {!loading && !error && comparisons.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Palette className="h-12 w-12 text-neutral-300 mb-4" />
            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              No paint comparison data available yet.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Please check back soon.
            </p>
          </div>
        )}
      </div>

      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
