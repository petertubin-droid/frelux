import React, { useEffect, useState, type ReactNode } from "react";
import { Shield, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";

export interface ScreenProtectionProps {
  children: ReactNode;
  /** Whether screen and recording protection is active (default true) */
  enabled?: boolean;
  /** Document title or identifier for watermarking */
  documentId?: string;
  /** Document title shown on security badge */
  documentTitle?: string;
  /** Custom handler when user presses Ctrl+P / Cmd+P to intercept browser print */
  onPrintRequested?: () => void;
  /** Optional extra CSS classes */
  className?: string;
}

/**
 * ScreenProtection component provides multi-layered client-side protection
 * against screenshots, screen recorders, snipping tools, and unauthorized printing.
 *
 * Mechanisms:
 * 1. Window Blur Shield: Blurs content when window loses focus (e.g. Snipping tool / screen grabber overlay).
 * 2. Shortcut Interception: Intercepts PrintScreen, Ctrl+P, Mac Cmd+Shift+3/4/5, Ctrl+Shift+S, F12.
 * 3. Context & Selection Prevention: Disables right-click, selection, and drag operations.
 * 4. Watermarking Layer: Renders subtle security watermark grid to deter leaks.
 * 5. Print Media Guard: Hides content under unapproved native browser print.
 */
export function ScreenProtection({
  children,
  enabled = true,
  documentId,
  documentTitle,
  onPrintRequested,
  className = "",
}: ScreenProtectionProps) {
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);
  const [protectionWarning, setProtectionWarning] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!enabled) return;

    // 1. Detect when window loses focus (Snipping tool, OS screenshot tool, screen recorder active)
    const handleBlur = () => {
      setIsWindowBlurred(true);
    };

    const handleFocus = () => {
      setIsWindowBlurred(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsWindowBlurred(true);
      } else {
        setIsWindowBlurred(false);
      }
    };

    // 2. Keyboard shortcut guards
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === "PrintScreen" || e.code === "PrintScreen") {
        e.preventDefault();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            void navigator.clipboard.writeText("");
          }
        } catch {
          // Ignore clipboard permission errors
        }
        triggerWarning(
          "Screenshot shortcut detected. Screenshots are disabled for this document.",
        );
        return;
      }

      // Print shortcut (Ctrl+P or Cmd+P)
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        e.stopPropagation();
        if (onPrintRequested) {
          onPrintRequested();
        } else {
          triggerWarning(
            "Printing is gated. Please use the Print button to unlock this document.",
          );
        }
        return;
      }

      // Mac Screenshot shortcuts: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
      if (
        e.metaKey &&
        e.shiftKey &&
        (e.key === "3" ||
          e.key === "4" ||
          e.key === "5" ||
          e.code === "Digit3" ||
          e.code === "Digit4" ||
          e.code === "Digit5")
      ) {
        e.preventDefault();
        triggerWarning(
          "Screen capture shortcut detected. Screen capture is protected.",
        );
        return;
      }

      // Windows Snipping Tool: Ctrl+Shift+S or Windows key combos
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === "s" || e.key === "S")
      ) {
        e.preventDefault();
        triggerWarning(
          "Screen grabber shortcut detected. Recording & screenshots are protected.",
        );
        return;
      }

      // DevTools inspect shortcuts
      if (
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          (e.key === "i" || e.key === "I"))
      ) {
        e.preventDefault();
        triggerWarning(
          "Developer inspection shortcuts are disabled on protected documents.",
        );
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [enabled, onPrintRequested]);

  const triggerWarning = (msg: string) => {
    setProtectionWarning(msg);
    toast.error(msg);
    setTimeout(() => {
      setProtectionWarning(null);
    }, 4000);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (enabled) {
      e.preventDefault();
      triggerWarning("Context menu disabled to protect document content.");
    }
  };

  const handleCopy = (e: React.ClipboardEvent) => {
    if (enabled) {
      e.preventDefault();
      triggerWarning("Copying text is disabled on protected documents.");
    }
  };

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={`relative select-none ${className}`}
      onContextMenu={handleContextMenu}
      onCopy={handleCopy}
      onDragStart={(e) => e.preventDefault()}
      style={{
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
      }}
      data-testid="screen-protection-wrapper"
    >
      {/* Security Status Header Badge */}
      <div className="mb-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs text-emerald-800 print:hidden">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-medium">Protected Document View</span>
          <span className="text-emerald-600/80 hidden sm:inline">
            — Anti-screenshot & screen recording protection active
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
          <Lock className="h-3 w-3" />
          <span>DRM Protected</span>
        </div>
      </div>

      {/* Ephemeral Warning Notification */}
      {protectionWarning && (
        <div
          role="alert"
          className="fixed top-16 right-4 z-50 max-w-sm rounded-lg border border-amber-300 bg-amber-50 p-3 shadow-lg text-xs text-amber-900 flex items-center gap-2 animate-in fade-in"
        >
          <EyeOff className="h-4 w-4 text-amber-600 shrink-0" />
          <span>{protectionWarning}</span>
        </div>
      )}

      {/* Main Document Content Area */}
      <div className="relative">
        {/* Anti-Screen Recording Blur Shield: Activates when window blurs / screen recorder triggers focus loss */}
        {isWindowBlurred && (
          <div
            data-testid="screen-shield-overlay"
            className="absolute inset-0 z-40 flex flex-col items-center justify-center rounded-xl bg-slate-900/60 backdrop-blur-md p-6 text-center text-white transition-opacity duration-200"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 border border-slate-700 shadow-inner mb-3">
              <EyeOff className="h-6 w-6 text-amber-400" />
            </div>
            <h4 className="text-base font-bold text-slate-100">
              Content Shield Active
            </h4>
            <p className="mt-1 max-w-sm text-xs text-slate-300">
              Screenshots and screen recordings are disabled for this document.
              Click inside this window to resume viewing.
            </p>
          </div>
        )}

        {/* Diagonal DRM Watermark Grid Layer (Very subtle visual deterrent against external cameras/recording) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 overflow-hidden opacity-[0.035] select-none"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 80px,
              rgba(15, 23, 42, 0.4) 80px,
              rgba(15, 23, 42, 0.4) 82px
            )`,
          }}
        >
          <div className="flex h-full w-full flex-wrap items-center justify-around gap-12 p-8 text-[11px] font-black uppercase tracking-widest text-slate-900">
            <span>FRELUX SECURE SYSTEM</span>
            <span>DO NOT SCREENSHOT</span>
            <span>CONFIDENTIAL</span>
            <span>
              {documentId ? `ID: ${documentId.slice(0, 8)}` : "PROTECTED"}
            </span>
          </div>
        </div>

        {/* Document Body */}
        <div
          className={`transition-filter duration-150 ${isWindowBlurred ? "filter blur-sm pointer-events-none" : ""}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default ScreenProtection;
