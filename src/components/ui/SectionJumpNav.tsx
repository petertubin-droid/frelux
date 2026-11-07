// =========================================================
// SECTION JUMP NAV
//
// Long calculator and explainer pages stack six or more screens of content
// under a header that scrolls away. This is the small, quiet control that lets
// a reader jump straight to the part they came for, and shows where they are
// while they read.
//
//  - Real buttons, not hash links: no history entries to back out of, and it
//    works when the target is rendered inside a child component.
//  - The chip row scrolls sideways on a phone instead of wrapping into the
//    content, and stays put under the header.
//  - Active state comes from an IntersectionObserver, so it tracks reading
//    rather than clicks alone.
// =========================================================

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export interface JumpSection {
  id: string;
  label: string;
}

interface SectionJumpNavProps {
  sections: JumpSection[];
  label?: string;
  className?: string;
}

export default function SectionJumpNav({
  sections,
  label = "On this page",
  className,
}: SectionJumpNavProps) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");
  const clickedRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const targets = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (targets.length === 0) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible.set(
            entry.target.id,
            entry.isIntersecting ? entry.intersectionRatio : 0,
          );
        }
        // Keep the clicked target while it is on screen; otherwise take the
        // section nearest the top of the viewport.
        if (clickedRef.current && (visible.get(clickedRef.current) ?? 0) > 0) {
          setActive(clickedRef.current);
          return;
        }
        clickedRef.current = null;
        let best = "";
        let bestRatio = 0;
        for (const [id, ratio] of visible) {
          if (ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }
        if (best) setActive(best);
      },
      { rootMargin: "-96px 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [sections]);

  const jump = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    clickedRef.current = id;
    setActive(id);
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  if (sections.length === 0) return null;

  return (
    <nav
      aria-label={label}
      className={cn(
        "sticky top-16 z-20 -mx-1 rounded-[var(--radius-lg,18px)] border border-border/70 bg-card/85 px-1.5 py-1.5 backdrop-blur-md supports-[backdrop-filter]:bg-card/70",
        className,
      )}
    >
      <ul className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((section) => {
          const isActive = section.id === active;
          return (
            <li key={section.id} className="shrink-0">
              <button
                type="button"
                onClick={() => jump(section.id)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-brand-purple text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {section.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
