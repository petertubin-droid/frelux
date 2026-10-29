import { useEffect, useMemo, useState } from "react";
import { ImageIcon, RotateCcw, Search, Upload } from "lucide-react";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n";
import {
  fetchHeaderImageOverrides,
  resetHeaderImageOverridesCache,
} from "@/lib/header-image-overrides";
import {
  AdminHeader,
  AdminCard,
  AdminButton,
  StateMessage,
} from "@/components/admin/AdminUi";
import {
  PAGE_CATALOG,
  HEADER_IMAGE_LIBRARY,
  resolveHeaderImage,
  type CatalogEntry,
} from "@/config/page-header-images";

// =========================================================
// ADMIN > HEADER IMAGES
// =========================================================
// Owner directive (2026-10-10): the page header backdrops must be
// configurable from the admin. Every user-facing page is listed
// here from the PAGE_CATALOG (config-driven, ~85 routes) in a
// paginated grid - never one overwhelming wall of cards. Admins
// can give any page an image from the library or a custom URL;
// resets fall back to the per-niche registry. Overrides persist
// in the header_image_overrides table (admin-only writes) and go
// live on the site immediately, no deploy needed.
// =========================================================

const PAGE_SIZE = 12;

type OverrideMap = Record<string, string>;

export default function AdminHeaderImages() {
  const { t } = useLanguage();
  const [overrides, setOverrides] = useState<OverrideMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Grid state: search + pagination (page resets on search change)
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  // Card currently open for editing (catalog path), and the page
  // whose media picker is open (catalog path)
  const [editing, setEditing] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const map = await fetchHeaderImageOverrides();
        if (alive) setOverrides(map ?? {});
      } catch {
        if (alive) setError("Could not load the current header images.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Filtered catalog (title or path match), stable order.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PAGE_CATALOG;
    return PAGE_CATALOG.filter(
      (entry) =>
        entry.title.toLowerCase().includes(q) ||
        entry.path.toLowerCase().includes(q),
    );
  }, [query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageEntries = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  // Compact page-number window (current ± 2)
  const pageNumbers = useMemo(() => {
    const out: number[] = [];
    for (
      let i = Math.max(0, safePage - 2);
      i <= Math.min(pageCount - 1, safePage + 2);
      i++
    ) {
      out.push(i);
    }
    return out;
  }, [safePage, pageCount]);

  function flash(message: string) {
    setNotice(message);
    setError("");
    window.setTimeout(() => setNotice(""), 2500);
  }

  async function saveOverride(route: string, imageUrl: string) {
    setSaving(true);
    setError("");
    try {
      if (!isSupabaseConfigured) throw new Error("not configured");
      const { error: upsertError } = await supabase
        .from("header_image_overrides")
        .upsert({ route, image_url: imageUrl }, { onConflict: "route" });
      if (upsertError) throw upsertError;
      setOverrides((prev) => ({ ...prev, [route]: imageUrl }));
      resetHeaderImageOverridesCache();
      flash(`Saved: ${route} now uses a custom header image.`);
      setEditing(null);
      setPickerFor(null);
    } catch {
      setError("Could not save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function resetOverride(route: string) {
    setSaving(true);
    setError("");
    try {
      if (!isSupabaseConfigured) throw new Error("not configured");
      const { error: deleteError } = await supabase
        .from("header_image_overrides")
        .delete()
        .eq("route", route);
      if (deleteError) throw deleteError;
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[route];
        return next;
      });
      resetHeaderImageOverridesCache();
      flash(`Reset: ${route} is back to its niche default.`);
      setEditing(null);
      setPickerFor(null);
    } catch {
      setError("Could not reset. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <AdminHeader
        title={t("Header Images")}
        subtitle="Choose the background photo shown behind each page's header. Unlisted pages fall back to the niche default; changes go live instantly."
      />

      {error && (
        <StateMessage
          type="error"
          title={t("Couldn't save")}
          message={error}
          action={
            <AdminButton variant="link" onClick={() => setError("")}>
              {t("Dismiss")}
            </AdminButton>
          }
        />
      )}
      {notice && (
        <div className="mb-4 rounded-lg border border-accent-green/30 bg-accent-green/10 p-3 text-sm text-accent-green">
          {notice}
        </div>
      )}

      <AdminCard>
        {/* Toolbar: search + count */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder={t("Search pages (e.g. paint, learn, /colors)…")}
              aria-label={t("Search pages")}
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {filtered.length} page{filtered.length === 1 ? "" : "s"} ·{" "}
            {Object.keys(overrides).length} custom
          </p>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Loading pages…
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No pages match "{query}".
          </p>
        ) : (
          <>
            {/* Paginated grid — never all ~85 cards at once */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {pageEntries.map((entry) => (
                <HeaderImageCard
                  key={entry.path}
                  entry={entry}
                  effectiveImage={resolveHeaderImage(entry.path, overrides)}
                  overridden={Boolean(overrides[entry.path])}
                  editing={editing === entry.path}
                  saving={saving}
                  onEdit={() =>
                    setEditing(editing === entry.path ? null : entry.path)
                  }
                  onSelect={(imageUrl) => saveOverride(entry.path, imageUrl)}
                  onUpload={() => setPickerFor(entry.path)}
                  onReset={() => resetOverride(entry.path)}
                />
              ))}
            </div>

            {/* Pagination */}
            <nav
              aria-label={t("Pages")}
              className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row"
            >
              <p className="text-xs text-muted-foreground">
                Showing {safePage * PAGE_SIZE + 1}–
                {Math.min(filtered.length, (safePage + 1) * PAGE_SIZE)} of{" "}
                {filtered.length}
              </p>
              <div className="flex items-center gap-1.5">
                <AdminButton
                  variant="secondary"
                  onClick={() => setPage(safePage - 1)}
                  disabled={safePage === 0}
                >
                  {t("Previous")}
                </AdminButton>
                {pageNumbers[0] > 0 && (
                  <span className="px-1 text-xs text-muted-foreground">…</span>
                )}
                {pageNumbers.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    aria-current={n === safePage ? "page" : undefined}
                    className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors ${
                      n === safePage
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {n + 1}
                  </button>
                ))}
                {pageNumbers[pageNumbers.length - 1] < pageCount - 1 && (
                  <span className="px-1 text-xs text-muted-foreground">…</span>
                )}
                <AdminButton
                  variant="secondary"
                  onClick={() => setPage(safePage + 1)}
                  disabled={safePage >= pageCount - 1}
                >
                  {t("Next")}
                </AdminButton>
              </div>
            </nav>
          </>
        )}
      </AdminCard>

      {/* Device upload via the media library (file upload, not URLs) */}
      {pickerFor && (
        <MediaPicker
          open={Boolean(pickerFor)}
          defaultFolder="headers"
          onClose={() => setPickerFor(null)}
          onSelect={(url) => {
            const route = pickerFor;
            setPickerFor(null);
            if (route) saveOverride(route, url);
          }}
        />
      )}
    </div>
  );
}

function HeaderImageCard({
  entry,
  effectiveImage,
  overridden,
  editing,
  saving,
  onEdit,
  onSelect,
  onUpload,
  onReset,
}: {
  entry: CatalogEntry;
  effectiveImage: string;
  overridden: boolean;
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onSelect: (imageUrl: string) => void;
  onUpload: () => void;
  onReset: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-background">
      {/* Thumbnail with the same fade feel as the live header */}
      <div className="relative h-28 w-full overflow-hidden bg-muted">
        <img
          src={effectiveImage}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-background/10" />
        <span className="absolute left-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
          {entry.group}
        </span>
        {overridden && (
          <span className="absolute right-2 top-2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
            {t("Custom")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <p className="truncate text-sm font-semibold text-foreground">
            {entry.title}
          </p>
          <p className="truncate text-xs text-muted-foreground">{entry.path}</p>
        </div>

        <div className="mt-auto flex items-center gap-2">
          <AdminButton onClick={onEdit} disabled={saving}>
            <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t("Change")}
          </AdminButton>
          {overridden && (
            <AdminButton variant="danger" onClick={onReset} disabled={saving}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {t("Reset")}
            </AdminButton>
          )}
        </div>

        {editing && (
          <div className="mt-1 rounded-lg border border-border bg-muted/40 p-2">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Pick an image:
            </p>
            <div className="grid max-h-44 grid-cols-3 gap-1.5 overflow-y-auto">
              {HEADER_IMAGE_LIBRARY.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelect(option.src)}
                  title={option.label}
                  className={`group relative overflow-hidden rounded-md border transition-transform hover:scale-[1.03] ${
                    effectiveImage === option.src
                      ? "border-primary ring-1 ring-primary/40"
                      : "border-border"
                  }`}
                >
                  <img
                    src={option.src}
                    alt={option.label}
                    loading="lazy"
                    className="h-10 w-full object-cover"
                  />
                </button>
              ))}
            </div>
            <div className="mt-2">
              <AdminButton
                variant="secondary"
                onClick={onUpload}
                disabled={saving}
                className="w-full"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                {t("Upload your own image")}
              </AdminButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
