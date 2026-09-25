import { useEffect, useState } from "react";
import { fetchAdConfig } from "@/lib/ad-config";
import { hasAdvertisingConsent } from "@/lib/ad-consent";
import { onConsentChange } from "@/lib/ad-consent";

/**
 * Adsterra Direct Link / Smartlink unit — ported from Heartsyncx.
 *
 * A Direct Link is not a script: it is a plain URL from the Adsterra
 * dashboard ("Websites > Ad Units > Direct Link") that earns per click.
 * Rendered as a clearly labelled, rel=sponsored text link under the
 * site-wide footer ad slot; gated on the Adsterra provider being active,
 * the advertising consent category being granted, and a configured URL.
 * Never renders when unconfigured — no fake units.
 */
export default function AdsterraDirectLink() {
  const [unit, setUnit] = useState<{ url: string; label: string } | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    return onConsentChange(() => setTick((t) => t + 1));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAdConfig()
      .then(({ providers }) => {
        if (cancelled) return;
        const adsterra = providers.find(
          (p) => p.slug === "adsterra" && p.is_active,
        );
        if (!adsterra) {
          setUnit(null);
          return;
        }
        const creds = (adsterra.credentials ?? {}) as Record<string, unknown>;
        const url =
          typeof creds.direct_link_url === "string"
            ? creds.direct_link_url.trim()
            : "";
        const label =
          typeof creds.direct_link_label === "string" &&
          creds.direct_link_label.trim()
            ? creds.direct_link_label.trim()
            : "Sponsored: check out this offer";
        if (!url || !/^https?:\/\//i.test(url)) {
          setUnit(null);
          return;
        }
        setUnit({ url, label });
      })
      .catch(() => setUnit(null));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!unit) return null;
  // Personalization-heavy network: requires explicit advertising consent.
  if (!hasAdvertisingConsent()) return null;

  return (
    <div
      className="flex justify-center py-1 select-none"
      data-ad-slot-family="direct_link"
      aria-label="Advertisement"
    >
      <a
        href={unit.url}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="text-[10px] text-muted-foreground/70 underline underline-offset-2 hover:text-foreground transition-colors"
      >
        {unit.label}
      </a>
    </div>
  );
}
