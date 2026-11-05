import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, HardHat, Loader2, Wrench } from "lucide-react";
import { fetchCategories, searchProfessionals } from "@/lib/pro-connect";
import { Button } from "@/components/ui/shadcn/button";

/**
 * Lead hand off from the borehole result to the Pro Connect directory.
 *
 * The count is read from the directory itself, never written into the copy, so
 * the page cannot claim professionals who are not listed. A market with nobody
 * listed gets an honest empty state and a registration route instead of a
 * fabricated "we found five drillers in your area".
 */

interface Props {
  /** ISO market code chosen in the estimator. */
  market: string;
}

interface Listed {
  total: number;
  categoryName: string;
}

export default function BoreholeProConnectCta({ market }: Props) {
  const [listed, setListed] = useState<Listed | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const categories = await fetchCategories();
        const target =
          categories.find((c) => c.slug === "plumbers") ??
          categories.find((c) => c.slug === "building-contractors") ??
          null;
        if (!target) {
          if (!cancelled) setListed({ total: 0, categoryName: "plumbers" });
          return;
        }
        const result = await searchProfessionals({
          country: market,
          categoryId: target.id,
          pageSize: 6,
        });
        if (!cancelled)
          setListed({ total: result.total, categoryName: target.name });
      } catch {
        if (!cancelled) setListed({ total: 0, categoryName: "plumbers" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [market]);

  const total = listed?.total ?? 0;
  const found = total > 0;

  return (
    <section
      aria-labelledby="borehole-pro-heading"
      className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
    >
      <h2
        id="borehole-pro-heading"
        className="flex items-center gap-2 text-sm font-semibold text-foreground sm:text-base"
      >
        <HardHat className="h-4 w-4 text-primary" />
        Need a professional to drill or plumb this?
      </h2>

      {loading ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Checking the Pro Connect directory for {market}.
        </p>
      ) : found ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {total} verified {listed?.categoryName.toLowerCase()} listed in{" "}
          {market} on Pro Connect, ready for a drilling, pump or plumbing quote
          on the system you just sized.
        </p>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Nobody is listed in {market} for drilling or plumbing yet. Browse the
          directory for a nearby trade, or register your own firm and be the
          first name a homeowner sees when they finish this calculation.
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button asChild variant="default" size="sm" className="gap-1.5 text-xs">
          <Link to="/pro-connect">
            {found
              ? "View profiles on Pro Connect"
              : "Browse the Pro Connect directory"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
          <Link to="/pro-connect/register">
            <Wrench className="h-3.5 w-3.5" />
            Register as a borehole or plumbing pro
          </Link>
        </Button>
      </div>
    </section>
  );
}
