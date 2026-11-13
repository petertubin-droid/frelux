import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Loader2, Rocket } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSeo } from "@/lib/seo";
import { useLanguage } from "@/lib/i18n";
import { formatByCode } from "@/lib/international/currency-format";
import { getSafeError } from "@/lib/safeError";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";
import { Button } from "@/components/ui/shadcn/button";

interface PackageRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  days: number;
  placements: string[];
  price_ngn_minor: number;
  price_usd_minor: number;
}

const PLACEMENT_LABELS: Record<string, string> = {
  marketplace_native: "Marketplace grid",
  marketplace_sidebar: "Marketplace sidebar",
  calculator_results: "Calculator result pages",
};

/**
 * A seller buys placement for one product.
 *
 * The page only chooses a package. The price it shows comes from the same table
 * the checkout function reads, and the function re-reads it, so what is quoted
 * here is what is charged.
 */
export default function PromoteProduct() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [productTitle, setProductTitle] = useState("");
  const [currency, setCurrency] = useState<"NGN" | "USD">("NGN");
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useSeo({
    title: "Promote a product, FRELUX Marketplace",
    description:
      "Put your product in front of buyers across the FRELUX marketplace and its calculators.",
    canonicalPath: `/marketplace/products/${id}/promote`,
    noIndex: true,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;
        if (!user) {
          navigate(`/login?next=/marketplace/products/${id}/promote`, {
            replace: true,
          });
          return;
        }
        const { data: product, error: productError } = await supabase
          .from("marketplace_products")
          .select("id,title,currency,seller_id")
          .eq("id", id)
          .maybeSingle();
        if (productError || !product) {
          setError("We could not find that product.");
          return;
        }
        if (product.seller_id !== user.id) {
          setError("You can only promote your own products.");
          return;
        }
        const { data: rows, error: packageError } = await supabase
          .from("marketplace_promotion_packages")
          .select(
            "id,slug,name,description,days,placements,price_ngn_minor,price_usd_minor",
          )
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        if (packageError) throw packageError;
        if (!alive) return;
        setProductTitle(product.title);
        setCurrency(
          String(product.currency || "").toUpperCase() === "NGN"
            ? "NGN"
            : "USD",
        );
        setPackages((rows ?? []) as PackageRow[]);
      } catch (e) {
        if (alive)
          setError(getSafeError(e, "Could not load promotion options"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, navigate]);

  async function start(packageId: string) {
    setStarting(packageId);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/promotion-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
            Authorization: `Bearer ${session?.access_token ?? ""}`,
          },
          body: JSON.stringify({ product_id: id, package_id: packageId }),
        },
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.authorization_url) {
        throw new Error(payload?.error || "Could not start the payment");
      }
      window.location.href = payload.authorization_url as string;
    } catch (e) {
      setError(getSafeError(e, "Could not start the payment"));
      setStarting(null);
    }
  }

  return (
    <>
      <PageHeader
        variant="data"
        breadcrumbs={[
          { label: "Marketplace", path: "/marketplace" },
          { label: "My Products", path: "/marketplace/my-products/" },
          { label: "Promote" },
        ]}
        eyebrow={t("Marketplace")}
        title={t("Promote this product")}
        subtitle={
          productTitle
            ? `${productTitle} · ${t("paid placement on FRELUX")}`
            : t("paid placement on FRELUX")
        }
      />

      <Container className="max-w-4xl pb-16 pt-6">
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
          </div>
        ) : packages.length === 0 ? (
          <p className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
            {t("No promotion packages are on sale right now.")}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {packages.map((pack) => {
              const minor =
                currency === "NGN"
                  ? pack.price_ngn_minor
                  : pack.price_usd_minor;
              return (
                <div
                  key={pack.id}
                  className="flex flex-col rounded-xl border border-border bg-card p-5 dark:border-white/10"
                >
                  <div className="flex items-center gap-2">
                    <Rocket
                      aria-hidden="true"
                      className="h-4 w-4 text-brand-purple"
                    />
                    <h2 className="text-sm font-bold text-foreground dark:text-primary-foreground">
                      {pack.name}
                    </h2>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {pack.description ||
                      `${pack.days} days of sponsored placement.`}
                  </p>
                  <ul className="mt-3 space-y-1">
                    {pack.placements.map((placement) => (
                      <li
                        key={placement}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      >
                        <BadgeCheck
                          aria-hidden="true"
                          className="h-3 w-3 text-emerald-500"
                        />
                        {PLACEMENT_LABELS[placement] || placement}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-lg font-bold text-brand-purple">
                        {formatByCode(minor / 100, currency)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {pack.days} {t("days")}
                      </p>
                    </div>
                    <Button
                      onClick={() => start(pack.id)}
                      disabled={starting !== null}
                      className="h-8 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"
                    >
                      {starting === pack.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        t("Pay and promote")
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          {t(
            "Paid placement is labelled Sponsored on the site, and stops on its own when the period ends.",
          )}
        </p>

        <Link
          to="/marketplace/my-products/"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-brand-purple"
        >
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
          {t("Back to my products")}
        </Link>
      </Container>
    </>
  );
}
