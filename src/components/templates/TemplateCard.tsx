import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bookmark,
  Copy,
  Trash2,
  Edit2,
  ArrowRight,
  Calculator,
  Download,
} from "lucide-react";
import { calculatorLabel } from "@/lib/templates";
import {
  describeTemplateForMarket,
  resolveTemplateRoomUnit,
  convertTemplateInputForUnit,
} from "@/lib/templates-global";
import { useMarket } from "@/lib/international/market-context";
import type { DbCalculatorTemplate } from "@/types/database";
import { classNames } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";

interface TemplateCardProps {
  template: DbCalculatorTemplate;
  variant?: "private" | "public";
  onUse?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onToggleFavorite?: () => void;
  onExport?: () => void;
}

export default function TemplateCard({
  template,
  variant = "private",
  onUse,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleFavorite,
  onExport,
}: TemplateCardProps) {
  const { t } = useLanguage();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { market } = useMarket();
  // Public templates render their curated prose plus a generated
  // dimension sentence in the visitor's market unit.
  const marketDescription =
    variant === "public"
      ? describeTemplateForMarket(template, market)
      : (template.description ?? "");

  const useHref =
    variant === "public" && template.slug
      ? `/templates/${template.slug}`
      : undefined;

  return (
    <div className="group relative flex flex-col rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-brand-purple/30 hover:shadow-sm dark:border-white/10 dark:bg-card dark:hover:border-brand-purple/40">
      {/* Top row: badge + favorite */}
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/8 px-2.5 py-1 text-xs font-medium text-brand-purple dark:bg-primary/15 dark:text-brand-purple-lighter">
          <Calculator className="h-3 w-3" />
          {calculatorLabel(template.calculator_type)}
        </span>

        {onToggleFavorite && (
          <Button
            variant="ghost"
            onClick={onToggleFavorite}
            className={classNames(
              "rounded-md p-1 transition-colors",
              template.is_favorite
                ? "text-amber-500 hover:text-amber-600"
                : "text-muted-foreground/80 hover:text-muted-foreground dark:text-muted-foreground dark:hover:text-muted-foreground",
            )}
            aria-label={
              template.is_favorite
                ? "Remove from favorites"
                : "Add to favorites"
            }
          >
            <Bookmark
              className="h-4 w-4"
              fill={template.is_favorite ? "currentColor" : "none"}
            />
          </Button>
        )}
      </div>

      {/* Title + description */}
      <div className="mt-3 flex-1">
        <h3 className="text-sm font-semibold text-foreground dark:text-primary-foreground">
          {template.name}
        </h3>
        {marketDescription && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground dark:text-muted-foreground">
            {marketDescription}
          </p>
        )}
      </div>

      {/* Input summary */}
      <TemplateInputSummary template={template} market={market} />

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        {onUse ? (
          <Button
            variant="default"
            onClick={onUse}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors hover:bg-primary/90"
          >
            {t("Use Template")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : useHref ? (
          <Link
            to={useHref}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("View Template")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}

        {variant === "private" && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                onClick={onEdit}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-card-foreground dark:hover:bg-white/5 dark:hover:text-primary-foreground"
                aria-label={t("Edit template")}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {onExport && (
              <Button
                variant="ghost"
                onClick={onExport}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-card-foreground dark:hover:bg-white/5 dark:hover:text-primary-foreground"
                aria-label={t("Export template")}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDuplicate && (
              <Button
                variant="ghost"
                onClick={onDuplicate}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-card-foreground dark:hover:bg-white/5 dark:hover:text-primary-foreground"
                aria-label={t("Duplicate template")}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete &&
              (confirmDelete ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    onDelete();
                    setConfirmDelete(false);
                  }}
                  className="rounded-md bg-red-50 px-2 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                >
                  Confirm?
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  aria-label={t("Delete template")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateInputSummary({
  template,
  market,
}: {
  template: DbCalculatorTemplate;
  market: ReturnType<typeof useMarket>["market"];
}) {
  const roomUnit = resolveTemplateRoomUnit(market);
  const data = convertTemplateInputForUnit(
    template.input_data as Record<string, unknown>,
    roomUnit,
  ) as typeof template.input_data;
  const u = roomUnit === "feet" ? "ft" : "m";
  const parts: string[] = [];

  if (template.calculator_type === "paint") {
    if (data.length && data.width)
      parts.push(`${data.length}×${data.width} ${u}`);
    if (data.coats) parts.push(`${data.coats} coats`);
    if (data.includeCeiling) parts.push("Ceiling");
  } else if (template.calculator_type === "tile") {
    if (data.length && data.width)
      parts.push(`${data.length}×${data.width} ${u}`);
    if (data.tileWidthMm) parts.push(`${data.tileWidthMm}mm tile`);
    if (data.method)
      parts.push(data.method === "adhesive" ? "Adhesive" : "Cement");
  } else if (template.calculator_type === "screeding") {
    if (data.roomLength && data.roomWidth)
      parts.push(`${data.roomLength}×${data.roomWidth} ${u}`);
    if (data.wallHeight) parts.push(`${data.wallHeight}${u} height`);
  } else if (template.calculator_type === "pop") {
    if (data.roomLength && data.roomWidth)
      parts.push(`${data.roomLength}×${data.roomWidth} ${u}`);
    if (data.includeDecorative) parts.push("Decorative");
  }

  if (parts.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {parts.map((p, i) => (
        <span
          key={i}
          className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground dark:bg-white/5 dark:text-muted-foreground"
        >
          {p}
        </span>
      ))}
    </div>
  );
}
