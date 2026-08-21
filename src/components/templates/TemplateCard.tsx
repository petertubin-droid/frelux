import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Copy, Trash2, Edit2, ArrowRight, Calculator, Download } from 'lucide-react';
import { calculatorLabel, calculatorPath } from '@/lib/templates';
import type { DbCalculatorTemplate } from '@/types/database';
import { classNames } from '@/lib/utils';

interface TemplateCardProps {
  template: DbCalculatorTemplate;
  variant?: 'private' | 'public';
  onUse?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onToggleFavorite?: () => void;
  onExport?: () => void;
}

export default function TemplateCard({
  template,
  variant = 'private',
  onUse,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleFavorite,
  onExport,
}: TemplateCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const useHref = variant === 'public' && template.slug
    ? `/templates/${template.slug}`
    : undefined;

  return (
    <div className="group relative flex flex-col rounded-xl border border-neutral-200 bg-white p-4 transition-all duration-200 hover:border-brand-purple/30 hover:shadow-sm dark:border-white/10 dark:bg-brand-navy-mid dark:hover:border-brand-purple/40">
      {/* Top row: badge + favorite */}
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-purple/8 px-2.5 py-1 text-xs font-medium text-brand-purple dark:bg-brand-purple/15 dark:text-brand-purple-lighter">
          <Calculator className="h-3 w-3" />
          {calculatorLabel(template.calculator_type)}
        </span>

        {onToggleFavorite && (
          <button
            onClick={onToggleFavorite}
            className={classNames(
              'rounded-md p-1 transition-colors',
              template.is_favorite
                ? 'text-amber-500 hover:text-amber-600'
                : 'text-neutral-300 hover:text-neutral-400 dark:text-neutral-600 dark:hover:text-neutral-500'
            )}
            aria-label={template.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className="h-4 w-4" fill={template.is_favorite ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      {/* Title + description */}
      <div className="mt-3 flex-1">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
          {template.name}
        </h3>
        {template.description && (
          <p className="mt-1 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
            {template.description}
          </p>
        )}
      </div>

      {/* Input summary */}
      <TemplateInputSummary template={template} />

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        {onUse ? (
          <button
            onClick={onUse}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-purple px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-purple-dark"
          >
            Use Template
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : useHref ? (
          <Link
            to={useHref}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-purple px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-purple-dark"
          >
            View Template
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}

        {variant === 'private' && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={onEdit}
                className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/5 dark:hover:text-white"
                aria-label="Edit template"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            )}
            {onExport && (
              <button
                onClick={onExport}
                className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/5 dark:hover:text-white"
                aria-label="Export template"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            )}
            {onDuplicate && (
              <button
                onClick={onDuplicate}
                className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/5 dark:hover:text-white"
                aria-label="Duplicate template"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
            {onDelete && (
              confirmDelete ? (
                <button
                  onClick={() => { onDelete(); setConfirmDelete(false); }}
                  className="rounded-md bg-red-50 px-2 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                >
                  Confirm?
                </button>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  aria-label="Delete template"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateInputSummary({ template }: { template: DbCalculatorTemplate }) {
  const data = template.input_data;
  const parts: string[] = [];

  if (template.calculator_type === 'paint') {
    if (data.length && data.width) parts.push(`${data.length}×${data.width} ${data.unit ?? ''}`);
    if (data.coats) parts.push(`${data.coats} coats`);
    if (data.includeCeiling) parts.push('Ceiling');
  } else if (template.calculator_type === 'tile') {
    if (data.length && data.width) parts.push(`${data.length}×${data.width} ${data.unit ?? ''}`);
    if (data.tileWidthMm) parts.push(`${data.tileWidthMm}mm tile`);
    if (data.method) parts.push(data.method === 'adhesive' ? 'Adhesive' : 'Cement');
  } else if (template.calculator_type === 'screeding') {
    if (data.roomLength && data.roomWidth) parts.push(`${data.roomLength}×${data.roomWidth} ${data.unit ?? ''}`);
    if (data.wallHeight) parts.push(`${data.wallHeight}ft height`);
  } else if (template.calculator_type === 'pop') {
    if (data.roomLength && data.roomWidth) parts.push(`${data.roomLength}×${data.roomWidth} ${data.unit ?? ''}`);
    if (data.includeDecorative) parts.push('Decorative');
  }

  if (parts.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {parts.map((p, i) => (
        <span key={i} className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-white/5 dark:text-neutral-400">
          {p}
        </span>
      ))}
    </div>
  );
}
