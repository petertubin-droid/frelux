import { useEffect, useState } from 'react';
import { Save, Loader2, AlertCircle, Palette, Image as ImageIcon, Type } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminHeader, AdminCard, AdminField, StateMessage } from '@/components/admin/AdminUi';
import { MediaUploader } from '@/components/admin/MediaUploader';
import { useBranding } from '@/lib/branding';
import type { DbSiteBranding } from '@/types/database';

export default function AdminBranding() {
  const { branding, refresh } = useBranding();
  const [config, setConfig] = useState<DbSiteBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Form state
  const [websiteName, setWebsiteName] = useState('');
  const [websiteTagline, setWebsiteTagline] = useState('');
  const [browserTitle, setBrowserTitle] = useState('');
  const [lightLogo, setLightLogo] = useState<string | null>(null);
  const [darkLogo, setDarkLogo] = useState<string | null>(null);
  const [favicon, setFavicon] = useState<string | null>(null);
  const [pwaIcon, setPwaIcon] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#6B21A8');
  const [secondaryColor, setSecondaryColor] = useState('#0F172A');
  const [accentColor, setAccentColor] = useState('#F97316');

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
      }
      setLoading(false);
    }
    load();
  }, [branding]);

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
        updated_at: new Date().toISOString(),
      })
      .eq('id', config.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setSaveMsg('Branding saved! Changes are now live across the site.');
      refresh();
      setTimeout(() => setSaveMsg(null), 4000);
    }
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching branding configuration." />;

  return (
    <>
      <AdminHeader
        title="Site Branding"
        subtitle="Manage your website identity — logos, favicon, PWA icon, site name, tagline, browser title, and brand colors. Changes apply instantly across the entire site."
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
          <h2 className="text-sm font-bold text-brand-navy">Site Identity</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AdminField label="Website Name">
            <input type="text" className="input-field" value={websiteName} onChange={(e) => setWebsiteName(e.target.value)} />
          </AdminField>
          <AdminField label="Website Tagline">
            <input type="text" className="input-field" value={websiteTagline} onChange={(e) => setWebsiteTagline(e.target.value)} />
          </AdminField>
          <AdminField label="Browser Title" hint="Shown in the browser tab">
            <input type="text" className="input-field" value={browserTitle} onChange={(e) => setBrowserTitle(e.target.value)} />
          </AdminField>
        </div>
      </AdminCard>

      {/* Logos & Icons section */}
      <AdminCard className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-brand-purple" />
          <h2 className="text-sm font-bold text-brand-navy">Logos & Icons</h2>
        </div>
        <p className="mt-1 text-xs text-neutral-400">Upload from your device or select from the Media Library. Images are optimized and stored securely.</p>
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
          <h2 className="text-sm font-bold text-brand-navy">Brand Colors</h2>
        </div>
        <p className="mt-1 text-xs text-neutral-400">These colors are applied as CSS variables across the site. Use hex codes (e.g. #6B21A8).</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <AdminField label="Primary Color">
            <div className="flex items-center gap-2">
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-12 shrink-0 cursor-pointer rounded border border-neutral-200" />
              <input type="text" className="input-field" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
            </div>
          </AdminField>
          <AdminField label="Secondary Color">
            <div className="flex items-center gap-2">
              <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="h-10 w-12 shrink-0 cursor-pointer rounded border border-neutral-200" />
              <input type="text" className="input-field" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} />
            </div>
          </AdminField>
          <AdminField label="Accent Color">
            <div className="flex items-center gap-2">
              <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-10 w-12 shrink-0 cursor-pointer rounded border border-neutral-200" />
              <input type="text" className="input-field" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
            </div>
          </AdminField>
        </div>
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
        <span className="text-xs text-neutral-400">Changes apply instantly across the website.</span>
      </div>
    </>
  );
}
