import { useEffect, useState } from "react";
import { Users } from "lucide-react";
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
 * "Trusted by" proof band. The number comes from frelux_community_size(), which
 * returns 0 until the platform genuinely reaches 100 accounts, so the band stays
 * blank rather than advertising early traction that does not exist.
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
        // No proof band when the count cannot be verified.
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [size]);

  if (size === null || size < THRESHOLD) return null;

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
