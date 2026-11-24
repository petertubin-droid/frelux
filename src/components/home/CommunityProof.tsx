import { useEffect, useState } from "react";
import {
  Users,
  Calculator,
  TrendingUp,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase-lazy";
import { useLanguage } from "@/lib/i18n";

const CACHE_KEY = "frelux.community_size";
const CACHE_TTL_MS = 10 * 60 * 1000;
const THRESHOLD = 100;

function cachedSize(): number | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { size: number; at: number };
    if (Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return parsed.size;
  } catch {
    return null;
  }
}

function storeSize(size: number) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ size, at: Date.now() }));
  } catch {
    // cache is optional
  }
}

/**
 * Proof band with dual verification states:
 * 1. Zero-User / Pre-Traction State (size < 100): Displays 100% verifiable
 *    engineering authority, calculation depth, and cryptographic verification
 *    rather than fabricated counts or empty space.
 * 2. Real Community Proof (size >= 100): Once genuine verified user accounts
 *    reach 100+, celebrates verified community scale.
 */
export default function CommunityProof() {
  const { t } = useLanguage();
  const [size, setSize] = useState<number | null>(() => cachedSize());

  useEffect(() => {
    if (size !== null) return;
    let active = true;

    async function load() {
      try {
        const supabase = await getSupabase();
        const { data, error } = await supabase.rpc("frelux_community_size");
        if (!active || error) return;
        const value = typeof data === "number" ? data : Number(data ?? 0);
        if (Number.isFinite(value)) {
          setSize(value);
          storeSize(value);
        }
      } catch {
        // Fall back to verifiable engineering capability metrics below
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [size]);

  // Scaled verified community size
  if (size !== null && size >= THRESHOLD) {
    return (
      <section
        aria-label={t("Community")}
        className="border-y border-border/60 bg-card dark:bg-background"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-3 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">
          <Users aria-hidden="true" className="h-4 w-4 text-foreground" />
          <p>
            {t("Trusted by")}{" "}
            <strong className="font-semibold text-foreground">
              {new Intl.NumberFormat().format(size)}
            </strong>{" "}
            {t("builders and contractors")}
          </p>
        </div>
      </section>
    );
  }

  // Pre-100 Accounts: Verifiable Engineering Authority & Data Depth Bar
  return (
    <section
      aria-label={t("Engineering Authority & Data Integrity")}
      className="border-y border-border/60 bg-card/60 backdrop-blur-sm py-4 dark:border-white/5 dark:bg-slate-950/40"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:gap-6">
          <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-background/70 px-3 py-2.5 shadow-sm dark:border-white/5 dark:bg-white/[0.02]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Calculator className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-semibold tracking-tight text-foreground truncate">
                77+ Calibrated Calculators
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                Deterministic civil takeoffs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-background/70 px-3 py-2.5 shadow-sm dark:border-white/5 dark:bg-white/[0.02]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-semibold tracking-tight text-foreground truncate">
                630+ Live Material Prices
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                Weekly updated market rates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-background/70 px-3 py-2.5 shadow-sm dark:border-white/5 dark:bg-white/[0.02]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Scale className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-semibold tracking-tight text-foreground truncate">
                Eurocode, ISO & NIS Norms
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                Engineering constants verified
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-background/70 px-3 py-2.5 shadow-sm dark:border-white/5 dark:bg-white/[0.02]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-semibold tracking-tight text-foreground truncate">
                Tamper-Proof Verification
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                SHA-256 blockchain receipts
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
