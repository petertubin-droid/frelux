import { useEffect, useState } from 'react';
import { Save, Loader2, AlertCircle, Palette, Image as ImageIcon, Type, Highlighter, X, Plus } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { AdminHeader, AdminCard, AdminField, StateMessage } from '@/components/admin/AdminUi';
import { MediaUploader } from '@/components/admin/MediaUploader';
import { useBranding } from '@/lib/branding';
import { invalidateHeroContentCache } from '@/lib/useHeroContent';
import type { DbSiteBranding, HeroHighlightConfig, HeroWordHighlight } from '@/types/database';
import { AdminButton, AdminInput } from '@/components/admin/AdminUi';

export default function AdminBranding() {
  const { branding, refresh } = useBranding();
  const [config, setConfig] = useState<DbSiteBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Form state — identity
  const [websiteName, setWebsiteName] = useState('');
  const [websiteTagline, setWebsiteTagline] = useState('');
  const [browserTitle, setBrowserTitle] = useState('');
  // Form state — logos
  const [lightLogo, setLightLogo] = useState<string | null>(null);
  const [darkLogo, setDarkLogo] = useState<string | null>(null);
  const [favicon, setFavicon] = useState<string | null>(null);
  const [pwaIcon, setPwaIcon] = useState<string | null>(null);
  // Form state — colors
  const [primaryColor, setPrimaryColor] = useState('#7C3AED');
  const [secondaryColor, setSecondaryColor] = useState('#0B1120');
  const [accentColor, setAccentColor] = useState('#F97316');
  // Form state — hero highlight
  const [heroHeadline, setHeroHeadline] = useState('Know Exactly What Materials Your Project Needs.');
  const [highlightConfig, setHighlightConfig] = useState<HeroHighlightConfig | null>(null);
  // Active color picker for the next word selected
  const [pendingColor, setPendingColor] = useState('#F97316');

  useEffect(() => {
    async function load() {
      if (branding && branding.id) {
        setConfig(branding);
        setWebsiteName(branding.website_name);
        setWebsiteTagline(branding.website_tagline);
        setBrowserTitle(branding.browser_title);
        setLightLogo(branding.light_logo_url);
        setDarkLogo(branding.dark_logo_url);
        setFavicon(branding.favicon_url);
        setPwaIcon(branding.pwa_icon_url);
        setPrimaryColor(branding.primary_color);
        setSecondaryColor(branding.secondary_color);
        setAccentColor(branding.accent_color);
        setHighlightConfig(branding.hero_highlight_config ?? { highlights: [] });
      }
      setLoading(false);
    }
    load();
  }, [branding]);

  // Fetch the hero headline from site_settings for the live preview
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from('site_settings')
      .select('hero_headline')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.hero_headline) setHeroHeadline(data.hero_headline);
      });
  }, []);

  // Parse the headline into words for the clickable preview
  const words = heroHeadline.split(/\s+/);

  function toggleWordHighlight(wordIndex: number) {
    if (!highlightConfig) return;
    const existing = highlightConfig.highlights.find((h) => h.wordIndex === wordIndex);
    if (existing) {
      // Remove highlight
      setHighlightConfig({
        highlights: highlightConfig.highlights.filter((h) => h.wordIndex !== wordIndex),
      });
    } else {
      // Add highlight with the pending color
      const newHighlight: HeroWordHighlight = {
        wordIndex,
        word: words[wordIndex] ?? '',
        color: pendingColor,
      };
      setHighlightConfig({
        highlights: [...highlightConfig.highlights, newHighlight],
      });
    }
  }

  function updateHighlightColor(wordIndex: number, color: string) {
    if (!highlightConfig) return;
    setHighlightConfig({
      highlights: highlightConfig.highlights.map((h) =>
        h.wordIndex === wordIndex ? { ...h, color } : h
      ),
    });
  }

  function removeHighlight(wordIndex: number) {
    if (!highlightConfig) return;
    setHighlightConfig({
      highlights: highlightConfig.highlights.filter((h) => h.wordIndex !== wordIndex),
    });
  }

  async function onSave() {
    if (!config) return;
    setSaving(true);
    setSaveMsg(null);
    setError(null);
    const { error: updateError } = await supabase
      .from('site_branding')
      .update({
        website_name: websiteName,
        website_tagline: websiteTagline,
        browser_title: browserTitle,
        light_logo_url: lightLogo,
        dark_logo_url: darkLogo,
        favicon_url: favicon,
        pwa_icon_url: pwaIcon,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        hero_highlight_config: highlightConfig,
        updated_at: new Date().toISOString(),
      })
      .eq('id', config.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setSaveMsg('Branding saved! Changes are now live across the site.');
      refresh();
      // Invalidate hero content cache so the hero picks up the new highlight config
      invalidateHeroContentCache();
      setTimeout(() => setSaveMsg(null), 4000);
    }
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching branding configuration." />;

  return (
    <>
      <AdminHeader
        title="Site Branding"
        subtitle="Manage your website identity, logos, favicon, PWA icon, site name, tagline, browser title, brand colors, and hero text highlighting. Changes apply instantly across the entire site."
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {saveMsg && (
        <div className="mb-4 rounded-lg border border-accent-green/30 bg-accent-green/10 p-3 text-sm text-accent-green">
          {saveMsg}
        </div>
      )}

      {/* Identity section */}
      <AdminCard className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <Type className="h-5 w-5 text-brand-purple" />
          <h2 className="text-sm font-bold text-brand-navy dark:text-white">Site Identity</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AdminField label="Website Name">
            <AdminInput type="text" value={websiteName} onChange={(e) => setWebsiteName(e.target.value)} />
          </AdminField>
          <AdminField label="Website Tagline">
            <AdminInput type="text" value={websiteTagline} onChange={(e) => setWebsiteTagline(e.target.value)} />
          </AdminField>
          <AdminField label="Browser Title" hint="Shown in the browser tab">
            <AdminInput type="text" value={browserTitle} onChange={(e) => setBrowserTitle(e.target.value)} />
          </AdminField>
        </div>
      </AdminCard>

      {/* Logos & Icons section */}
      <AdminCard className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-brand-purple" />
          <h2 className="text-sm font-bold text-brand-navy dark:text-white">Logos & Icons</h2>
        </div>
        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">Upload from your device or select from the Media Library. Images are optimized and stored securely.</p>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <MediaUploader label="Light Mode Logo" value={lightLogo} onChange={setLightLogo} folder="branding" />
          <MediaUploader label="Dark Mode Logo" value={darkLogo} onChange={setDarkLogo} folder="branding" />
          <MediaUploader label="Favicon" value={favicon} onChange={setFavicon} folder="branding" />
          <MediaUploader label="PWA App Icon" value={pwaIcon} onChange={setPwaIcon} folder="branding" />
        </div>
      </AdminCard>

      {/* Brand Colors section */}
      <AdminCard className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-brand-purple" />
          <h2 className="text-sm font-bold text-brand-navy dark:text-white">Brand Colors</h2>
        </div>
        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">These colors are applied as CSS variables across the site. Use hex codes (e.g. #7C3AED).</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <AdminField label="Primary Color">
            <div className="flex items-center gap-2">
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-12 shrink-0 cursor-pointer rounded border border-neutral-200" />
              <AdminInput type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
            </div>
          </AdminField>
          <AdminField label="Secondary Color">
            <div className="flex items-center gap-2">
              <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="h-10 w-12 shrink-0 cursor-pointer rounded border border-neutral-200" />
              <AdminInput type="text" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} />
            </div>
          </AdminField>
          <AdminField label="Accent Color">
            <div className="flex items-center gap-2">
              <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-10 w-12 shrink-0 cursor-pointer rounded border border-neutral-200" />
              <AdminInput type="text" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
            </div>
          </AdminField>
        </div>
      </AdminCard>

      {/* Hero Text Highlighting section */}
      <AdminCard className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <Highlighter className="h-5 w-5 text-brand-purple" />
          <h2 className="text-sm font-bold text-brand-navy dark:text-white">Hero Text Highlighting</h2>
        </div>
        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
          Click any word in the hero headline below to highlight it with a custom color. Click again to remove. The headline text is managed in <span className="font-semibold">Admin → Settings → Homepage Hero</span>.
        </p>

        {/* Pending color picker */}
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-white/10 dark:bg-brand-navy-mid">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Color for next selection:</span>
          <input
            type="color"
            value={pendingColor}
            onChange={(e) => setPendingColor(e.target.value)}
            className="h-8 w-10 shrink-0 cursor-pointer rounded border border-neutral-200 dark:border-white/10"
          />
          <input
            type="text"
            value={pendingColor}
            onChange={(e) => setPendingColor(e.target.value)}
            className="w-28 text-xs"
            placeholder="#F97316"
          />
        </div>

        {/* Live preview — clickable headline */}
        <div className="mt-4 rounded-xl border border-neutral-200 bg-gradient-to-br from-brand-navy to-brand-navy-mid p-6 dark:border-white/10">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Live preview — click words to toggle highlight</p>
          <h3 className="font-display text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
            {words.map((word, i) => {
              const hl = highlightConfig?.highlights.find((h) => h.wordIndex === i);
              const isHighlighted = !!hl;
              return (
                <span
                  key={i}
                  onClick={() => toggleWordHighlight(i)}
                  className="cursor-pointer rounded px-1 py-0.5 transition-all hover:bg-white/10"
                  style={isHighlighted ? { color: hl!.color } : undefined}
                  title={isHighlighted ? `Highlighted: ${hl!.color} — click to remove` : 'Click to highlight'}
                >
                  {word}{i < words.length - 1 ? ' ' : ''}
                </span>
              );
            })}
          </h3>
        </div>

        {/* Active highlights list */}
        {highlightConfig && highlightConfig.highlights.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Active highlights ({highlightConfig.highlights.length}):</p>
            {highlightConfig.highlights
              .sort((a, b) => a.wordIndex - b.wordIndex)
              .map((hl) => (
                <div key={hl.wordIndex} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 dark:border-white/10 dark:bg-brand-navy-mid">
                  <span className="text-xs font-mono text-neutral-400">#{hl.wordIndex}</span>
                  <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{hl.word}</span>
                  <div className="ml-auto flex items-center gap-2">
                    <input
                      type="color"
                      value={hl.color}
                      onChange={(e) => updateHighlightColor(hl.wordIndex, e.target.value)}
                      className="h-7 w-9 cursor-pointer rounded border border-neutral-200 dark:border-white/10"
                    />
                    <input
                      type="text"
                      value={hl.color}
                      onChange={(e) => updateHighlightColor(hl.wordIndex, e.target.value)}
                      className="w-24 text-xs"
                    />
                    <button
                      onClick={() => removeHighlight(hl.wordIndex)}
                      className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                      title="Remove highlight"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {(!highlightConfig || highlightConfig.highlights.length === 0) && (
          <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-500">
            No highlights yet. Click on any word in the preview above to start highlighting.
          </p>
        )}
      </AdminCard>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-purple px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-purple/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving…' : 'Save Branding'}
        </button>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">Changes apply instantly across the website.</span>
      </div>
    </>
  );
}
