import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Wrench } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useCommandPalette } from "@/components/ui/useCommandPalette";
import { isOnboardingComplete } from "@/lib/onboarding";
import { trackVisit } from "@/lib/achievements";
import { trackReturnVisitRewards } from "@/lib/rewards-integration";
import type { Achievement } from "@/lib/achievements";
import { getSupabase } from "@/lib/supabase-lazy";
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

  // ── Monetag multi-tag: inject only on public pages, never on admin ──
  // The tag serves banner/push/native/interstitial formats. Admin pages
  // are completely ad-free — no scripts, no redirects, no impressions.
  useEffect(() => {
    // Safety: never load on admin routes (Layout shouldn't render there,
    // but this is a belt-and-suspenders guard)
    if (location.pathname.startsWith("/admin")) return;

    // Avoid double-injection
    if (document.querySelector('script[src*="quge5.com"]')) return;

    const s = document.createElement("script");
    s.src = "https://quge5.com/88/tag.min.js";
    s.setAttribute("data-zone", "275352");
    s.setAttribute("data-domain", "quge5.com");
    s.setAttribute("data-monetag-tag", "true");
    s.async = true;
    s.setAttribute("data-cfasync", "false");
    document.head.appendChild(s);

    return () => {
      // Clean up if the component unmounts (e.g. navigating to admin)
      s.remove();
    };
  }, [location.pathname]);

  // ── Maintenance mode check: deferred to idle callback to avoid blocking initial render ──
  useEffect(() => {
    let channel: ReturnType<Awaited<ReturnType<typeof getSupabase>>["channel"]> | null = null;
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
        getSupabase().then((sb) => sb.removeChannel(channel as Parameters<typeof sb.removeChannel>[0]));
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
