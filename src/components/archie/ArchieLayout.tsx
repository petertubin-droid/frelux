// =========================================================
// FRELUX ARCHIE STAGE 1 — INDEPENDENT OWNER PWA SHELL
//
// The ARCHIE application shell: its own identity, its own
// navigation, its own PWA manifest (swapped in while the
// Owner is inside /archie). It does NOT wrap the public
// FRELUX layout and requires no FRELUX screen first.
//
// Navigation (spec §14): CHAT / CONTROL / KNOWLEDGE /
// LEARNING / DEVICES / SECURITY / SYSTEM — mobile-first
// bottom nav, desktop sidebar.
// =========================================================

import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import "@/styles/archie-premium.css";
import ArchieInstallButton from "./ArchieInstallButton";

const NAV = [
  { to: "/archie/chat", label: "Chat", icon: "chat" },
  { to: "/archie/coding", label: "Coding", icon: "control" },
  { to: "/archie/control", label: "Control", icon: "control" },
  { to: "/archie/knowledge", label: "Knowledge", icon: "knowledge" },
  { to: "/archie/learning", label: "Learning", icon: "learning" },
  { to: "/archie/devices", label: "Devices", icon: "devices" },
  { to: "/archie/people", label: "People", icon: "devices" },
  { to: "/archie/shared", label: "Shared", icon: "knowledge" },
  { to: "/archie/security", label: "Security", icon: "security" },
  { to: "/archie/system", label: "System", icon: "system" },
  { to: "/archie/migration", label: "Migration", icon: "migration" },
  { to: "/archie/training", label: "Training", icon: "knowledge" },
  { to: "/archie/evolution", label: "Evolution", icon: "control" },
  { to: "/archie/voice", label: "Voice", icon: "chat" },
  { to: "/archie/ops", label: "Ops", icon: "control" },
  { to: "/archie/terminology", label: "TerminoBook", icon: "learning" },
] as const;

function NavIcon({ name }: { name: string }) {
  const common = "h-5 w-5";
  switch (name) {
    case "chat":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className={common}
        >
          <path
            d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "control":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className={common}
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "knowledge":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className={common}
        >
          <path
            d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Zm0 0a2 2 0 0 0 2 2h13"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "learning":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className={common}
        >
          <path
            d="m12 3 10 5-10 5L2 8l10-5Zm0 10 6-3m-6 8-6-3m6 3 6-3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "devices":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className={common}
        >
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <path d="M11 18h2" strokeLinecap="round" />
        </svg>
      );
    case "migration":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className={common}
        >
          <path d="M3 12h12" strokeLinecap="round" />
          <path
            d="m11 8 4 4-4 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M17 4v16" strokeLinecap="round" />
          <path d="M21 8v8" strokeLinecap="round" />
        </svg>
      );
    case "security":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className={common}
        >
          <path
            d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className={common}
        >
          <circle cx="12" cy="12" r="3" />
          <path
            d="M12 2v4m0 12v4M2 12h4m12 0h4M5 5l2.5 2.5m9 9L19 19M19 5l-2.5 2.5m-9 9L5 19"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

export default function ArchieLayout() {
  const { user } = useAuth();
  const location = useLocation();

  // Swap in the ARCHIE PWA manifest while inside /archie; the
  // FRELUX manifest is restored on unmount.
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>(
      'link[rel="manifest"]',
    );
    const original = link?.getAttribute("href") ?? null;
    if (link) link.setAttribute("href", "/assets/archie/manifest.webmanifest");
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", "#0B0F14");
    // Register the ARCHIE service worker (scoped to /archie) —
    // required by browsers to offer the PWA install option.
    let registration: ServiceWorkerRegistration | undefined;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/archie-sw.js", { scope: "/archie/" })
        .then((reg) => {
          registration = reg;
        })
        .catch(() => {
          /* offline shell unavailable; the app still works online */
        });
    }

    return () => {
      if (link) link.setAttribute("href", original ?? "/manifest.json");
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", "#6D28D9");
      registration?.unregister().catch(() => undefined);
    };
  }, []);

  return (
    <div className="archie-root flex min-h-screen flex-col text-slate-100">
      {/* ARCHIE header */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0B0F14]/80 backdrop-blur-xl after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-amber-400/30 after:to-transparent">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <img
            src="/assets/archie/archie-icon-512.png"
            alt=""
            className="h-8 w-8 rounded-lg"
            aria-hidden
          />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-[0.2em] text-amber-200/90">
              ARCHIE
            </span>
            <span className="text-[10px] text-slate-400">
              Personal Intelligence
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ArchieInstallButton />
            <div className="text-[11px] text-slate-400">
              {user?.email ? user.email : "Owner"}
            </div>
          </div>
        </div>
      </header>

      {/* desktop sidebar + mobile bottom nav */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-0 md:gap-6">
        <nav
          aria-label="ARCHIE sections"
          className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-48 shrink-0 flex-col gap-1 border-r border-white/5 py-4 md:flex"
        >
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                  isActive
                    ? "archie-nav-active bg-amber-400/10 text-amber-200"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                }`
              }
            >
              <NavIcon name={n.icon} />
              {n.label}
            </NavLink>
          ))}
          <a
            href="/"
            className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:text-slate-300"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-5 w-5"
            >
              <path
                d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            FRELUX
          </a>
        </nav>

        <main
          className="relative z-10 min-w-0 flex-1 pb-16 md:pb-0"
          key={location.pathname}
        >
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="ARCHIE sections"
        className="fixed inset-x-0 bottom-0 z-20 flex overflow-x-auto border-t border-white/10 bg-[#0B0F14]/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            aria-label={n.label}
            className={({ isActive }) =>
              `flex min-w-[68px] shrink-0 flex-col items-center gap-1 px-1 py-2 text-[10px] transition-colors ${
                isActive
                  ? "text-amber-200 drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]"
                  : "text-slate-500"
              }`
            }
          >
            <NavIcon name={n.icon} />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
