import type { ReactNode } from "react";
import { classNames } from "@/lib/utils";
import { Switch } from "@/components/ui/shadcn/switch";

export function AdminCard({
  children,
  className,
  compact,
}: {
  children: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={classNames(
        "admin-surface admin-surface-hover",
        compact ? "p-3" : "p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <span className="admin-eyebrow">Admin</span>
          <h1 className="mt-1.5 font-display text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-[28px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <div className="flex shrink-0 items-center gap-2">{action}</div>
        )}
      </div>
      <div className="admin-divider mt-5" />
    </header>
  );
}

export function AdminButton({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
  className,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "success" | "link";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2";
  const variants = {
    primary:
      "bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-[0_1px_2px_rgba(16,12,40,0.12),0_8px_20px_-8px_hsl(var(--primary)/0.65)] hover:shadow-[0_2px_6px_rgba(16,12,40,0.14),0_12px_26px_-10px_hsl(var(--primary)/0.7)]",
    secondary:
      "border border-border/70 bg-card/70 text-foreground backdrop-blur hover:border-primary/30 hover:bg-card dark:border-white/10 dark:bg-white/5 dark:text-foreground dark:hover:bg-white/10",
    danger:
      "border border-red-500/25 bg-red-500/10 text-red-600 hover:bg-red-500/15 dark:text-red-300 dark:hover:bg-red-500/20",
    success:
      "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-[0_8px_20px_-10px_rgba(16,185,129,0.7)] hover:from-emerald-500 hover:to-emerald-500",
    link: "bg-transparent px-0 py-0 text-primary hover:underline",
  };
  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={classNames(base, variants[variant], className)}
    >
      {children}
    </Button>
  );
}

export function StateMessage({
  type,
  title,
  message,
  action,
}: {
  type: "loading" | "error" | "empty";
  title: string;
  message: string;
  action?: ReactNode;
}) {
  const styles = {
    loading: "admin-inset text-muted-foreground",
    error:
      "border border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
    empty: "admin-inset border-dashed text-muted-foreground",
  };
  const accent = {
    loading: "bg-primary/80 animate-pulse",
    error: "bg-red-500",
    empty: "bg-muted-foreground/50",
  };
  return (
    <div
      className={classNames(
        "rounded-2xl p-10 text-center backdrop-blur-sm",
        styles[type],
      )}
    >
      <span
        className={classNames(
          "mx-auto mb-3 block h-1.5 w-8 rounded-full",
          accent[type],
        )}
      />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed">{message}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}

export function AdminField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[13px] font-semibold tracking-wide text-foreground">
        {label}
      </span>
      {hint && (
        <span className="mt-0.5 block text-xs text-muted-foreground dark:text-muted-foreground">
          {hint}
        </span>
      )}
      <div className="mt-1.5">{children}</div>
      {error && (
        <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </label>
  );
}

// =========================================================
// CollapsibleGroup, used to break long flat admin lists
// (colors, materials, products, …) into organized, collapsible
// sections grouped by category/family instead of one endless scroll.
// =========================================================

export function CollapsibleGroup({
  title,
  count,
  isOpen,
  onToggle,
  children,
  preview,
}: {
  title: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  preview?: ReactNode;
}) {
  return (
    <div className="admin-surface admin-surface-hover overflow-hidden">
      <Button
        variant="ghost"
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 bg-transparent px-4 py-3.5 text-left transition-colors hover:bg-muted/40 dark:hover:bg-white/[0.04]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <svg
            className={classNames(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              isOpen && "rotate-90",
            )}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
          <span className="truncate text-sm font-bold text-foreground dark:text-primary-foreground">
            {title}
          </span>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground dark:bg-white/10 dark:text-muted-foreground">
            {count}
          </span>
        </div>
        {preview && (
          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            {preview}
          </div>
        )}
      </Button>
      {isOpen && (
        <div className="border-t border-border/60 bg-muted/30 p-3 backdrop-blur-sm dark:border-white/5 dark:bg-white/[0.02]">
          {children}
        </div>
      )}
    </div>
  );
}

export function GroupControls({
  onExpandAll,
  onCollapseAll,
  groupLabel = "groups",
}: {
  onExpandAll: () => void;
  onCollapseAll: () => void;
  groupLabel?: string;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground dark:text-muted-foreground">
      <span>Organized into {groupLabel}</span>
      <Button
        variant="link"
        type="button"
        onClick={onExpandAll}
        className="text-brand-purple hover:underline dark:text-brand-purple-lighter"
      >
        {t("Expand all")}
      </Button>
      <span className="text-muted-foreground/80 dark:text-muted-foreground">
        ·
      </span>
      <Button
        variant="link"
        type="button"
        onClick={onCollapseAll}
        className="text-brand-purple hover:underline dark:text-brand-purple-lighter"
      >
        {t("Collapse all")}
      </Button>
    </div>
  );
}

// =========================================================
// AdminInput / AdminTextarea, shadcn-based form controls
// with FRELUX dark-mode styling baked in. Drop-in replacement
// for the old `input-field` CSS class pattern.
// =========================================================

import { Input as ShadcnInput } from "@/components/ui/shadcn/input";
import { Textarea as ShadcnTextarea } from "@/components/ui/shadcn/textarea";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function AdminInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <ShadcnInput className={classNames("h-11", className)} {...props} />;
}

export function AdminTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <ShadcnTextarea
      className={classNames("px-3.5 py-2.5", className)}
      {...props}
    />
  );
}

// =========================================================
// AdminSelect, native <select> with FRELUX dark-mode styling.
// shadcn-compatible border/ring tokens. Drop-in replacement
// for the old input-field CSS class on <select> elements.
// =========================================================

import type { SelectHTMLAttributes } from "react";
import { Button } from "@/components/ui/shadcn/button";
import { normalizeStatus, statusTone } from "@/lib/admin-status";
import { useLanguage } from "@/lib/i18n";

export function AdminSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={classNames(
        "flex h-11 w-full rounded-lg border border-border/70 bg-card px-3.5 py-2 text-sm text-foreground shadow-sm ring-offset-background transition-all duration-200 hover:border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
        "dark:border-white/10 dark:bg-card",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

// =========================================================
// AdminIconButton, compact icon-only action button for
// edit/delete/move/close patterns. Two variants: ghost (neutral)
// and danger (red for delete actions).
// =========================================================

export function AdminIconButton({
  children,
  onClick,
  variant = "ghost",
  type = "button",
  disabled,
  className,
  title,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  title?: string;
  "aria-label"?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-lg p-1.5 transition-all duration-150 active:scale-95 disabled:opacity-50";
  const variants = {
    ghost:
      "text-muted-foreground hover:bg-muted/70 hover:text-primary dark:hover:bg-white/10",
    danger: "text-muted-foreground hover:bg-red-500/10 hover:text-red-500",
  };
  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={classNames(base, variants[variant], className)}
    >
      {children}
    </Button>
  );
}

// =========================================================
// AdminTabButton, tab/filter selector with active/inactive
// states. Three variants:
//   underline, bottom-border tab (default, classic tab bar)
//   pill     , rounded bordered pill (icon + label tabs)
//   filter   , solid/outline filter chip (severity filters)
// =========================================================

export function AdminTabButton({
  active = false,
  onClick,
  children,
  variant = "underline",
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  variant?: "underline" | "pill" | "filter";
  className?: string;
}) {
  const base = "text-sm font-medium transition-colors";
  const variants = {
    underline: {
      base: "px-4 py-2.5 rounded-none",
      active:
        "border-b-2 border-primary text-foreground shadow-[inset_0_-1px_0_0_hsl(var(--primary))]",
      inactive: "text-muted-foreground hover:text-foreground",
    },
    pill: {
      base: "flex items-center gap-2 rounded-xl border px-4 py-2",
      active:
        "border-primary/30 bg-primary/10 text-primary shadow-[0_6px_18px_-12px_hsl(var(--primary))]",
      inactive:
        "border-border/60 bg-card/60 text-muted-foreground backdrop-blur hover:border-primary/25 hover:text-foreground dark:border-white/10 dark:bg-white/5",
    },
    filter: {
      base: "rounded-lg px-3 py-1.5 capitalize",
      active:
        "bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-[0_6px_16px_-10px_hsl(var(--primary)/0.8)]",
      inactive:
        "border border-border/60 bg-card/60 text-muted-foreground backdrop-blur hover:bg-muted/50 dark:border-white/10 dark:bg-white/5",
    },
  };
  const v = variants[variant];
  return (
    <Button
      variant="ghost"
      type="button"
      onClick={onClick}
      className={classNames(
        base,
        v.base,
        active ? v.active : v.inactive,
        className,
      )}
    >
      {children}
    </Button>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const norm = normalizeStatus(status);
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] " +
        statusTone(norm) +
        (className ? " " + className : "")
      }
    >
      {norm}
    </span>
  );
}
