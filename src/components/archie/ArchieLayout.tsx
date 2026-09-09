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

const NAV = [
  { to: "/archie/chat", label: "Chat", icon: "chat" },
  { to: "/archie/control", label: "Control", icon: "control" },
  { to: "/archie/knowledge", label: "Knowledge", icon: "knowledge" },
  { to: "/archie/learning", label: "Learning", icon: "learning" },
  { to: "/archie/devices", label: "Devices", icon: "devices" },
  { to: "/archie/people", label: "People", icon: "devices" },
  { to: "/archie/security", label: "Security", icon: "security" },
  { to: "/archie/system", label: "System", icon: "system" },
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
    return () => {
      if (link) link.setAttribute("href", original ?? "/manifest.json");
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", "#6D28D9");
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0F14] text-slate-100">
      {/* ARCHIE header */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0B0F14]/90 backdrop-blur">
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
          <div className="ml-auto text-[11px] text-slate-400">
            {user?.email ? user.email : "Owner"}
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
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-amber-400/10 text-amber-200"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
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

        <main className="min-w-0 flex-1 pb-16 md:pb-0" key={location.pathname}>
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="ARCHIE sections"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-7 border-t border-white/5 bg-[#0B0F14]/95 backdrop-blur md:hidden"
      >
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            aria-label={n.label}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2 text-[10px] ${
                isActive ? "text-amber-200" : "text-slate-500"
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
