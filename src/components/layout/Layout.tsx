import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Wrench } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AdSlot from "@/components/ui/AdSlot";
import { useCommandPalette } from "@/components/ui/useCommandPalette";
import { isOnboardingComplete } from "@/lib/onboarding";
import { trackVisit } from "@/lib/achievements";
import { trackReturnVisitRewards } from "@/lib/rewards-integration";
import type { Achievement } from "@/lib/achievements";
import { getSupabase } from "@/lib/supabase-lazy";
import { adDebug, instrumentScript } from "@/lib/ad-diagnostics";
import { useAuth } from "@/lib/auth";

// Lazy-loaded below-the-fold components — not visible on first paint
const SupportChatWidget = lazy(
  () => import("@/components/layout/SupportChatWidget"),
);
const MobileBottomNav = lazy(() => import("@/components/ui/MobileBottomNav"));
const OfflineIndicator = lazy(() =>
  import("@/components/ui/OfflineIndicator").then((m) => ({
    default: m.OfflineIndicator,
  })),
);
const CommandPalette = lazy(() =>
  import("@/components/ui/CommandPalette").then((m) => ({
    default: m.CommandPalette,
  })),
);
const OnboardingTour = lazy(() =>
  import("@/components/ui/OnboardingTour").then((m) => ({
    default: m.OnboardingTour,
  })),
);
const AchievementToast = lazy(() =>
  import("@/components/ui/AchievementBadges").then((m) => ({
    default: m.AchievementToast,
  })),
);

export default function Layout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [maintenance, setMaintenance] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const location = useLocation();
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();

  // Track visit and check onboarding on first load
  const mountedRef = useRef(true);
  useEffect(() => {
    const newlyUnlocked = trackVisit();
    if (newlyUnlocked.length > 0) {
      setNewAchievements(newlyUnlocked);
      setTimeout(() => setNewAchievements([]), 5000);
    }
    // Fire-and-forget: track return visit for credits/streak (authenticated users only)
    trackReturnVisitRewards();
    if (!isOnboardingComplete() && location.pathname === "/") {
      setTimeout(() => setShowOnboarding(true), 800);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [location.pathname]);

  // ── Site-wide ad format tags: injected ONCE on first public page load ──
  // Only non-intrusive, in-page-safe formats are injected here: AdSense
  // page-level ads and Adsterra site-wide scripts (when their zone keys
  // are configured in Admin → Ads). Monetag site-wide tags are NOT
  // injected (they hijack the top-level page — see the note below).
  // Admin pages don't use Layout at all (separate AdminLayout), so the
  // admin guard is belt-and-suspenders.
  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) return;

    let cancelled = false;
    (async () => {
      let adsterraSiteWide: Array<{ format: string; src: string }> = [];
      let monetagAutoZones: Array<{
        format: string;
        zone: string;
        src: string;
      }> = [];
      let adsensePubId: string | null = null;
      try {
        const [{ fetchAdConfig }] = await Promise.all([
          import("@/lib/ad-config"),
        ]);
        const { providers } = await fetchAdConfig();
        // ── Additional format tags (additive; dormant until configured) ──
        const formats = await import("@/lib/ad-network-formats");
        // NOTE: Monetag site-wide display/auto zones (Popunder / Vignette /
        // Interstitial) are intentionally NOT injected. The website zone
        // tag hijacked the top-level page (observed redirecting visitors
        // off the site seconds after load), which breaks every other ad
        // format and the site itself. Monetag still monetizes through the
        // user-initiated REWARDED flow (monetag-rewarded.ts) and through
        // per-placement SDK zones (AdSlot renders a container when an
        // admin maps a Monetag zone ID to a placement).
        // AdSense page-level ads (Auto / Anchor / Vignette / Interstitial):
        // the script + page-level push runs only when the publisher toggled
        // at least one page-level format on here. The exact format mix is
        // fine-tuned in the AdSense dashboard (Auto ads settings).
        const adsense = providers.find(
          (p) => p.slug === "google_adsense" && p.is_active,
        );
        if (adsense && formats.displayAdsEnabled(adsense)) {
          const as = (adsense.settings ?? {}) as Record<string, unknown>;
          const ac = (adsense.credentials ?? {}) as Record<string, unknown>;
          const pubId =
            typeof ac.publisher_id === "string" ? ac.publisher_id.trim() : "";
          const pageLevelWanted =
            as.auto_ads === true ||
            as.anchor_ads === true ||
            as.vignette_ads === true ||
            as.interstitial_ads === true;
          if (pubId && pageLevelWanted) adsensePubId = pubId;
        }

        // Adsterra Interstitial / Popunder / Social Bar site-wide scripts
        const adsterra = providers.find(
          (p) => p.slug === "adsterra" && p.is_active,
        );
        if (adsterra) {
          const { getAdsterraServeDomain } =
            await import("@/components/ui/AdSlot");
          adsterraSiteWide = formats.getAdsterraSiteWideScripts(
            adsterra,
            getAdsterraServeDomain(adsterra),
          );
        }

        // Monetag admin-configured auto zones (Vignette / Interstitial /
        // Popunder). These are true website zones the admin explicitly
        // created per format in the Monetag dashboard — injected per zone
        // with data-sdk-ignore so they never create global show_ fns.
        // Rewarded/Social-Bar SDK zones are NOT auto zones and must never
        // be loaded here (they hijack the page — see monetag-rewarded.ts).
        const monetag = providers.find(
          (p) => p.slug === "monetag" && p.is_active,
        );
        if (monetag) {
          monetagAutoZones = formats.getMonetagAutoZoneScripts(monetag);
        }
      } catch {
        // Ad config unavailable — do not inject anything.
        return;
      }
      if (cancelled) return;

      // AdSense page-level ads — inject once, never remove
      if (
        adsensePubId &&
        !cancelled &&
        !document.querySelector('script[data-adsense-page-level="true"]')
      ) {
        const s = document.createElement("script");
        s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsensePubId)}`;
        s.async = true;
        s.crossOrigin = "anonymous";
        s.setAttribute("data-adsense-page-level", "true");
        document.head.appendChild(s);
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({
          google_ad_client: adsensePubId,
          enable_page_level_ads: true,
        });
      }

      // Adsterra site-wide scripts (Interstitial / Popunder / Social Bar)
      for (const a of adsterraSiteWide) {
        if (cancelled) return;
        if (
          document.querySelector(`script[data-adsterra-format="${a.format}"]`)
        )
          continue;
        const s = document.createElement("script");
        s.src = a.src;
        s.setAttribute("data-adsterra-format", a.format);
        s.async = true;
        s.setAttribute("data-cfasync", "false");
        instrumentScript("adsterra", s, `sitewide:${a.format}`);
        document.head.appendChild(s);
        adDebug("adsterra", "sitewide:injected", {
          format: a.format,
          src: a.src,
        });
      }
      // Monetag admin-configured auto zones (Vignette / Interstitial /
      // Popunder) — one tag per zone, deduped per format
      for (const m of monetagAutoZones) {
        if (cancelled) return;
        if (document.querySelector(`script[data-monetag-auto="${m.format}"]`))
          continue;
        const s = document.createElement("script");
        s.src = m.src;
        s.async = true;
        s.setAttribute("data-cfasync", "false");
        s.setAttribute("data-zone", m.zone);
        s.setAttribute("data-domain", "quge5.com");
        s.setAttribute("data-sdk-ignore", "true");
        s.setAttribute("data-monetag-auto", m.format);
        instrumentScript("monetag", s, `auto:${m.format}`);
        document.head.appendChild(s);
        adDebug("monetag", "auto-zone:injected", {
          format: m.format,
          zone: m.zone,
        });
      }
      // No cleanup — tags persist for the entire page session
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Maintenance mode check: deferred to idle callback to avoid blocking initial render ──
  useEffect(() => {
    let channel: ReturnType<
      Awaited<ReturnType<typeof getSupabase>>["channel"]
    > | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    // Defer to idle callback so it doesn't compete with initial paint/hydration
    const ric = (cb: () => void) => {
      if ("requestIdleCallback" in window) {
        (
          window as unknown as {
            requestIdleCallback: (cb: () => void) => number;
          }
        ).requestIdleCallback(cb);
      } else {
        setTimeout(cb, 200);
      }
    };

    async function checkMaintenance() {
      const supabase = await getSupabase();
      // Always check admin status first (independent of maintenance state)
      const { data: session } = await supabase.auth.getSession();
      let admin = false;
      if (session.session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.session.user.id)
          .maybeSingle();
        admin = profile?.role === "admin";
      }
      setIsAdmin(admin);

      // Then check maintenance mode
      const { data, error } = await supabase
        .from("site_settings")
        .select("maintenance_mode")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn(
          "[maintenance] Failed to check site_settings:",
          error.message,
        );
        return;
      }

      setMaintenance(!!data?.maintenance_mode);
    }

    ric(() => checkMaintenance());

    // Real-time subscription: detect maintenance_mode changes immediately
    // Get supabase for the real-time subscription (reuses cached client from checkMaintenance)
    getSupabase().then((sb) => {
      if (!mountedRef.current) return;
      channel = sb
        .channel("site_settings_maintenance")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "site_settings" },
          (payload) => {
            const newMode = (payload.new as Record<string, unknown>)
              ?.maintenance_mode;
            setMaintenance(!!newMode);
          },
        )
        .subscribe();
    });

    // Polling fallback: check every 30 seconds in case real-time misses
    pollTimer = setInterval(checkMaintenance, 30_000);

    return () => {
      if (channel) {
        getSupabase().then((sb) =>
          sb.removeChannel(channel as Parameters<typeof sb.removeChannel>[0]),
        );
      }
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [location.pathname]);

  // ── Client onboarding redirect: if logged-in client hasn't completed onboarding, redirect there ──
  useEffect(() => {
    if (!user) return;
    // Don't redirect if already on onboarding, login, or admin pages
    if (
      location.pathname === "/onboarding" ||
      location.pathname.startsWith("/login") ||
      location.pathname.startsWith("/admin")
    )
      return;
    // Only check once per session
    if (sessionStorage.getItem("frelux_onboarding_checked")) return;
    (async () => {
      const sb = await getSupabase();
      const { data: profile } = await sb
        .from("profiles")
        .select("account_type, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.account_type === "client" && !profile.onboarding_completed) {
        navigate("/onboarding", { replace: true });
      }
      sessionStorage.setItem("frelux_onboarding_checked", "1");
    })();
  }, [user, location.pathname, navigate]);

  if (maintenance && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/50 px-4 text-center dark:bg-background">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-brand-purple">
          <Wrench className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-foreground dark:text-primary-foreground">
          Under Maintenance
        </h1>
        <p className="mt-2 max-w-md text-muted-foreground dark:text-muted-foreground">
          We're making some improvements. Please check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <a
        href="#main-content"
        className="sr-only sr-only-focusable absolute left-4 top-4 z-[100] rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Skip to main content
      </a>
      <Navbar />
      <main
        id="main-content"
        className="w-full flex-1 pt-16 pb-16 md:pb-0"
        role="main"
      >
        <Outlet />
      </main>
      {/* Global footer ad slot — placement "global_footer", toggled in
          Admin → Ads → Placements like every other slot. */}
      <AdSlot slotKey="global_footer" />
      <Footer />
      <Suspense fallback={null}>
        <OfflineIndicator />
      </Suspense>
      <Suspense fallback={null}>
        <SupportChatWidget />
      </Suspense>
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
      <Suspense fallback={null}>
        <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      </Suspense>
      {showOnboarding && (
        <Suspense fallback={null}>
          <OnboardingTour onComplete={() => setShowOnboarding(false)} />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <AchievementToast
          achievements={newAchievements}
          onDismiss={() => setNewAchievements([])}
        />
      </Suspense>
    </div>
  );
}
