import { useEffect, useMemo, useState } from 'react';
import { Save, CheckCircle2, RotateCcw, Search, X, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {AdminHeader, AdminCard, AdminButton, StateMessage, AdminInput, AdminIconButton} from '@/components/admin/AdminUi';
import { classNames } from '@/lib/utils';
import {
  FONT_LIBRARY,
  FONT_CATEGORIES,
  TYPOGRAPHY_AREAS,
  DEFAULT_TYPOGRAPHY,
  getFont,
  type FontFamily,
  type FontCategory,
  type TypographyArea,
  type TypographyConfig,
} from '@/lib/font-library';
import { preloadFontForPreview, clearDynamicFonts } from '@/lib/font-loader';
import { previewTypography, resetPreview } from '@/lib/useTypography';

type Status = 'loading' | 'ready' | 'error' | 'saving';

export default function AdminTypography() {
  const [config, setConfig] = useState<TypographyConfig>(DEFAULT_TYPOGRAPHY);
  const [originalConfig, setOriginalConfig] = useState<TypographyConfig>(DEFAULT_TYPOGRAPHY);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<FontCategory | 'all'>('all');
  const [previewText, setPreviewText] = useState('The quick brown fox jumps over the lazy dog');
  const [pickerArea, setPickerArea] = useState<TypographyArea | null>(null);
  const [settingsId, setSettingsId] = useState<string>('');

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('site_settings')
        .select('id, typography_config')
        .limit(1)
        .maybeSingle();
      if (error) { setError(error.message); setStatus('error'); return; }
      const tc = data?.typography_config as TypographyConfig | null;
      const resolved = tc && typeof tc === 'object' && tc.body
        ? { ...DEFAULT_TYPOGRAPHY, ...tc }
        : DEFAULT_TYPOGRAPHY;
      setConfig(resolved);
      setOriginalConfig(resolved);
      setSettingsId(data?.id ?? '');
      setStatus('ready');
    }
    load();
  }, []);

  // Live preview whenever config changes
  useEffect(() => {
    previewTypography(config);
  }, [config]);

  const filteredFonts = useMemo(() => {
    let result = FONT_LIBRARY;
    if (activeCategory !== 'all') {
      result = result.filter((f) => f.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (f) => f.family.toLowerCase().includes(q) || f.category.toLowerCase().includes(q),
      );
    }
    return result;
  }, [search, activeCategory]);

  function selectFontForArea(area: TypographyArea, font: string) {
    setConfig((prev) => ({ ...prev, [area]: font }));
    setPickerArea(null);
  }

  async function handleSave() {
    setStatus('saving');
    setError('');
    if (!settingsId) {
      // No settings row yet — insert a new one with typography config
      const { data: insertData, error: insertError } = await supabase
        .from('site_settings')
        .insert({ typography_config: config })
        .select('id')
        .limit(1)
        .maybeSingle();
      if (insertError) {
        setError(insertError.message);
        setStatus('ready');
        return;
      }
      if (insertData?.id) setSettingsId(insertData.id);
    } else {
      const { error: saveError } = await supabase
        .from('site_settings')
        .update({ typography_config: config })
        .eq('id', settingsId);
      if (saveError) {
        setError(saveError.message);
        setStatus('ready');
        return;
      }
    }
    setOriginalConfig(config);
    setStatus('ready');
    setSavedAt(true);
    setTimeout(() => setSavedAt(false), 3000);
  }

  function handleReset() {
    if (!confirm('Reset all typography to the default FRELUX fonts?')) return;
    clearDynamicFonts();
    setConfig(DEFAULT_TYPOGRAPHY);
    resetPreview();
  }

  if (status === 'loading') {
    return (
      <>
        <AdminHeader title="Typography Manager" subtitle="Manage website fonts globally." />
        <StateMessage type="loading" title="Loading…" message="Fetching typography settings." />
      </>
    );
  }
  if (status === 'error') {
    return (
      <>
        <AdminHeader title="Typography Manager" subtitle="Manage website fonts globally." />
        <StateMessage type="error" title="Error" message={error} />
      </>
    );
  }

  return (
    <>
      <AdminHeader
        title="Typography Manager"
        subtitle="Browse 60+ premium fonts and apply them across FRELUX."
        action={
          <div className="flex gap-2">
            <AdminButton variant="secondary" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" /> Reset
            </AdminButton>
            <AdminButton onClick={handleSave} disabled={status === 'saving'}>
              <Save className="h-4 w-4" /> {status === 'saving' ? 'Saving…' : 'Save & Apply'}
            </AdminButton>
          </div>
        }
      />

      {savedAt && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" /> Typography saved and applied globally.
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Typography area assignments */}
      <AdminCard className="mb-6">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
          Font Assignments
        </h2>
        <p className="mb-4 text-xs text-neutral-400 dark:text-neutral-500">
          Click any area to browse and select a font from the library.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {TYPOGRAPHY_AREAS.map((area) => {
            const font = getFont(config[area.key]);
            const isPickerOpen = pickerArea === area.key;
            return (
              <div key={area.key}>
                <div
                  className={classNames(
                    'rounded-lg border p-4 transition-all cursor-pointer',
                    isPickerOpen
                      ? 'border-brand-purple ring-2 ring-brand-purple/20'
                      : 'border-neutral-200 hover:border-neutral-300 dark:border-white/5 dark:hover:border-white/10',
                  )}
                  onClick={() => {
                    setPickerArea(isPickerOpen ? null : area.key);
                    if (!isPickerOpen) setActiveCategory('all');
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-brand-navy dark:text-white">{area.label}</p>
                      <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">{area.description}</p>
                    </div>
                    {config[area.key] === originalConfig[area.key] ? (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500 dark:bg-white/5 dark:text-neutral-400">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-brand-purple/15 px-2 py-0.5 text-[10px] font-semibold text-brand-purple">
                        Modified
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <span
                      className="text-lg font-bold"
                      style={{ fontFamily: font?.stack ?? `'${config[area.key]}', system-ui, sans-serif` }}
                    >
                      {config[area.key]}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AdminCard>

      {/* Font picker panel */}
      {pickerArea && (
        <AdminCard className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
              Select Font for {TYPOGRAPHY_AREAS.find((a) => a.key === pickerArea)?.label}
            </h2>
            <AdminIconButton variant="ghost"
              type="button"
              onClick={() => setPickerArea(null)}
              
            >
              <X className="h-4 w-4" />
            </AdminIconButton>
          </div>

          {/* Search + Category filter */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <AdminInput
                className="pl-10"
                placeholder="Search fonts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <CategoryChip label="All" active={activeCategory === 'all'} onClick={() => setActiveCategory('all')} />
            {FONT_CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat}
                label={cat}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
              />
            ))}
          </div>

          {/* Custom preview text */}
          <div className="mb-4">
            <AdminInput
              
              placeholder="Type custom preview text…"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
            />
          </div>

          {/* Font cards grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredFonts.map((font) => (
              <FontCard
                key={font.family}
                font={font}
                previewText={previewText}
                isActive={config[pickerArea] === font.family}
                onSelect={() => selectFontForArea(pickerArea, font.family)}
              />
            ))}
          </div>
          {filteredFonts.length === 0 && (
            <p className="py-8 text-center text-sm text-neutral-400">No fonts match your search.</p>
          )}
        </AdminCard>
      )}

      {/* Live site preview */}
      <AdminCard>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
          Live Website Preview
        </h2>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-white/5 dark:bg-brand-navy">
          {/* Heading */}
          <h3
            className="text-3xl font-bold text-brand-navy dark:text-white"
            style={{ fontFamily: `var(--font-headings)` }}
          >
            Plan Your Perfect Paint Project
          </h3>
          <h4
            className="mt-1 text-lg text-neutral-500 dark:text-neutral-400"
            style={{ fontFamily: `var(--font-calc-title)` }}
          >
            Tile Calculator
          </h4>
          {/* Navigation */}
          <div className="mt-4 flex gap-4 text-sm" style={{ fontFamily: `var(--font-nav)` }}>
            <span className="font-semibold text-brand-purple">Home</span>
            <span className="text-neutral-500 dark:text-neutral-400">Paint Calc</span>
            <span className="text-neutral-500 dark:text-neutral-400">Color Library</span>
            <span className="text-neutral-500 dark:text-neutral-400">Learn</span>
          </div>
          {/* Paragraph */}
          <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-600 dark:text-neutral-300" style={{ fontFamily: `var(--font-body)` }}>
            Calculate what you need, estimate what it may cost, and discover colors that can transform your space with precision.
          </p>
          {/* Buttons */}
          <div className="mt-4 flex gap-3">
            <button className="btn-primary text-sm" style={{ fontFamily: `var(--font-btn)` }}>
              Start Calculating
            </button>
            <button className="btn-secondary text-sm" style={{ fontFamily: `var(--font-btn)` }}>
              Learn More
            </button>
          </div>
          {/* Calculator card preview */}
          <div className="mt-6 max-w-sm rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-white/5 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400" style={{ fontFamily: `var(--font-calc-title)` }}>
              Your Tile Estimate
            </p>
            <p className="mt-1 text-2xl font-bold text-brand-navy dark:text-white" style={{ fontFamily: `var(--font-calc-result)` }}>
              ₦371,000
            </p>
            <div className="mt-2 flex justify-between text-xs" style={{ fontFamily: `var(--font-body)` }}>
              <span className="text-neutral-500">Surface area</span>
              <span className="font-semibold text-neutral-700 dark:text-neutral-200">20.0 m²</span>
            </div>
            <div className="mt-1 flex justify-between text-xs" style={{ fontFamily: `var(--font-body)` }}>
              <span className="text-neutral-500">Tiles needed</span>
              <span className="font-semibold text-neutral-700 dark:text-neutral-200">62 tiles</span>
            </div>
          </div>
        </div>
      </AdminCard>
    </>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <AdminButton
      type="button"
      onClick={onClick}
      className={classNames(
        'rounded-full border px-3 py-1 text-xs font-semibold transition-all',
        active
          ? 'border-brand-purple bg-brand-purple text-white'
          : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-white/10 dark:text-neutral-300 dark:hover:border-white/20',
      )}
    >
      {label}
    </AdminButton>
  );
}

function FontCard({
  font,
  previewText,
  isActive,
  onSelect,
}: {
  font: FontFamily;
  previewText: string;
  isActive: boolean;
  onSelect: () => void;
}) {
  // Lazy-load font preview on mount
  useEffect(() => {
    preloadFontForPreview(font.family);
  }, [font.family]);

  return (
    <div
      className={classNames(
        'rounded-lg border p-4 transition-all',
        isActive
          ? 'border-brand-purple bg-brand-purple/5 ring-2 ring-brand-purple/20'
          : 'border-neutral-200 hover:border-neutral-300 dark:border-white/5 dark:hover:border-white/10',
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-brand-navy dark:text-white">{font.name}</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">{font.category}</p>
        </div>
        {isActive && (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-purple text-white">
            <Check className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      {/* Live preview with the actual font */}
      <p
        className="mt-3 text-base leading-snug"
        style={{ fontFamily: font.stack }}
      >
        {previewText || 'The quick brown fox jumps over the lazy dog'}
      </p>
      <div className="mt-3 flex items-center gap-2">
        {font.goodForBody && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-white/5 dark:text-neutral-400">
            Body
          </span>
        )}
        {font.goodForHeadings && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-white/5 dark:text-neutral-400">
            Heading
          </span>
        )}
      </div>
      <AdminButton
        type="button"
        onClick={onSelect}
        disabled={isActive}
        className={classNames(
          'mt-3 w-full rounded-lg py-2 text-xs font-semibold transition-all',
          isActive
            ? 'bg-brand-purple/10 text-brand-purple'
            : 'bg-neutral-100 text-neutral-700 hover:bg-brand-purple hover:text-white dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-brand-purple',
        )}
      >
        {isActive ? 'Currently Active' : 'Apply This Font'}
      </AdminButton>
    </div>
  );
}
