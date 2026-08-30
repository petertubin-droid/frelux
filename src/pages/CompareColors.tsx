import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, Loader2, Copy, Check } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { fetchPaintColors, fetchColorFamilies, fetchColorCombinations } from '@/lib/queries';
import { useSeo } from '@/lib/seo';
import { readableTextColor, complementaryColor, colorDistanceHex, normalizeHex } from '@/lib/colors';
import type { DbPaintColor, DbColorFamily, DbColorCombination } from '@/types/database';

const MAX_COMPARE = 4;

export default function CompareColors() {
  useSeo({
    title: 'Compare Paint Colors: Side by Side',
    description: 'Compare up to 4 paint colors side by side. View HEX, RGB, HSL values, recommended rooms, and compatible finishes.',
    canonicalPath: '/colors/compare',
    ogType: 'website',
  });

  const [selected, setSelected] = useState<DbPaintColor[]>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<DbPaintColor[]>([]);
  const [families, setFamilies] = useState<DbColorFamily[]>([]);
  const [allColors, setAllColors] = useState<DbPaintColor[]>([]);
  const [palettes, setPalettes] = useState<DbColorCombination[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchColorFamilies().then(({ data }) => setFamilies(data));
    fetchPaintColors({ pageSize: 500 }).then(({ data }) => setAllColors(data));
    fetchColorCombinations().then(({ data }) => setPalettes(data));
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      const { data } = await fetchPaintColors({ query: search, pageSize: 12 });
      setResults(data);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  function addColor(c: DbPaintColor) {
    if (selected.length >= MAX_COMPARE || selected.some((s) => s.id === c.id)) return;
    setSelected((prev) => [...prev, c]);
    setSearch('');
    setResults([]);
  }

  function removeColor(id: string) {
    setSelected((prev) => prev.filter((s) => s.id !== id));
  }

  function copy(text: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(text);
      window.setTimeout(() => setCopied(null), 1500);
    }
  }

  // Compute similar colors for each selected color
  const similarMap = useMemo(() => {
    const map: Record<string, DbPaintColor[]> = {};
    for (const c of selected) {
      map[c.id] = allColors
        .filter((a) => a.id !== c.id)
        .map((a) => ({ color: a, dist: colorDistanceHex(c.hex_code, a.hex_code) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 3)
        .map((x) => x.color);
    }
    return map;
  }, [selected, allColors]);

  // Compute complementary colors
  const complementaryMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of selected) {
      map[c.id] = complementaryColor(c.hex_code);
    }
    return map;
  }, [selected]);

  // Find coordinated palettes containing any selected color's hex
  const coordinatedPalettes = useMemo(() => {
    if (selected.length === 0) return [];
    const selectedHexes = selected.map((c) => normalizeHex(c.hex_code).toUpperCase());
    return palettes.filter((p) => {
      const paletteHexes = [p.main_color_code, p.secondary_color_code, p.accent_color_code].map((h) => normalizeHex(h).toUpperCase());
      return selectedHexes.some((h) => paletteHexes.includes(h));
    }).slice(0, 4);
  }, [selected, palettes]);

  // Compute key differences
  const keyDifferences = useMemo(() => {
    if (selected.length < 2) return [];
    const diffs: { label: string; values: string[] }[] = [];
    // Lightness
    diffs.push({
      label: 'Lightness',
      values: selected.map((c) => `${Math.round(c.hsl_l)}%`),
    });
    // Saturation
    diffs.push({
      label: 'Saturation',
      values: selected.map((c) => `${Math.round(c.hsl_s)}%`),
    });
    // Hue
    diffs.push({
      label: 'Hue',
      values: selected.map((c) => `${Math.round(c.hsl_h)}°`),
    });
    // Warm vs Cool
    diffs.push({
      label: 'Temperature',
      values: selected.map((c) => {
        const h = c.hsl_h;
        if (h >= 0 && h < 60 || h >= 300) return 'Warm';
        if (h >= 60 && h < 180) return 'Warm';
        return 'Cool';
      }),
    });
    return diffs;
  }, [selected]);

  return (
    <>
      <PageHeader eyebrow="Tools" title="Compare Colors" subtitle="Compare up to 4 paint colors side by side with HEX, RGB, HSL, and recommendations." breadcrumbs={[{ label: 'Color Library', path: '/colors' }, { label: 'Compare Colors' }]} />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search colors to add…" className="input-field pl-9" />
        </div>

        {loading && <div className="mt-3 flex items-center gap-2 text-sm text-neutral-500"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Searching…</div>}

        {/* Search results */}
        {results.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {results.map((c) => (
              <button key={c.id} type="button" onClick={() => addColor(c)} className="group overflow-hidden rounded-lg border border-neutral-200 bg-white text-left dark:border-white/5 dark:bg-brand-navy-mid transition-all hover:border-brand-purple hover:shadow-md">
                <div className="aspect-square" style={{ background: c.hex_code }} />
                <div className="p-2">
                  <p className="truncate text-xs font-semibold text-brand-navy dark:text-white">{c.name}</p>
                  <p className="text-[10px] text-neutral-500">{c.hex_code}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {search && !loading && results.length === 0 && (
          <p className="mt-3 text-sm text-neutral-500">No colors found. Try a different search term.</p>
        )}

        {/* Comparison area */}
        {selected.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 dark:border-white/5 dark:bg-white/5 p-12 text-center">
            <p className="text-sm font-medium text-neutral-500">Search and select colors above to compare them here.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody>
                  {/* Color preview row */}
                  <tr>
                    {selected.map((c) => (
                      <td key={c.id} className="border-b border-neutral-200 p-2 align-top" style={{ minWidth: 200 }}>
                        <div className="relative">
                          <div className="flex aspect-video items-center justify-center rounded-lg" style={{ background: c.hex_code }}>
                            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: readableTextColor(c.hex_code) }}>{c.hex_code}</span>
                          </div>
                          <button type="button" onClick={() => removeColor(c.id)} className="absolute right-2 top-2 rounded-full bg-white/80 p-1 text-neutral-500 hover:text-red-500"><X aria-hidden="true" className="h-4 w-4" /></button>
                        </div>
                      </td>
                    ))}
                  </tr>
                  {/* Name row */}
                  <CompareRow label="Name">
                    {selected.map((c) => <td key={c.id} className="border-b border-neutral-100 p-2"><Link to={`/colors/paint/${c.slug}`} className="text-sm font-bold text-brand-navy hover:text-brand-purple dark:text-white dark:hover:text-brand-purple-lighter">{c.name}</Link></td>)}
                  </CompareRow>
                  {/* HEX row */}
                  <CompareRow label="HEX">
                    {selected.map((c) => <td key={c.id} className="border-b border-neutral-100 p-2"><CopyBtn value={c.hex_code} copied={copied === c.hex_code} onCopy={copy} /></td>)}
                  </CompareRow>
                  {/* RGB row */}
                  <CompareRow label="RGB">
                    {selected.map((c) => <td key={c.id} className="border-b border-neutral-100 p-2"><CopyBtn value={`rgb(${c.rgb_r}, ${c.rgb_g}, ${c.rgb_b})`} copied={copied === `rgb(${c.rgb_r}, ${c.rgb_g}, ${c.rgb_b})`} onCopy={copy} /></td>)}
                  </CompareRow>
                  {/* HSL row */}
                  <CompareRow label="HSL">
                    {selected.map((c) => <td key={c.id} className="border-b border-neutral-100 p-2"><CopyBtn value={`hsl(${Math.round(c.hsl_h)}, ${Math.round(c.hsl_s)}%, ${Math.round(c.hsl_l)}%)`} copied={copied === `hsl(${Math.round(c.hsl_h)}, ${Math.round(c.hsl_s)}%, ${Math.round(c.hsl_l)}%)`} onCopy={copy} /></td>)}
                  </CompareRow>
                  {/* Interior/Exterior */}
                  <CompareRow label="Location">
                    {selected.map((c) => <td key={c.id} className="border-b border-neutral-100 p-2 text-sm text-neutral-700">{c.is_interior && c.is_exterior ? 'Interior / Exterior' : c.is_interior ? 'Interior' : 'Exterior'}</td>)}
                  </CompareRow>
                  {/* Recommended usage */}
                  <CompareRow label="Rooms">
                    {selected.map((c) => <td key={c.id} className="border-b border-neutral-100 p-2 text-sm text-neutral-700">{c.recommended_usage.join(', ') || 'N/A'}</td>)}
                  </CompareRow>
                  {/* Finishes */}
                  <CompareRow label="Finishes">
                    {selected.map((c) => <td key={c.id} className="border-b border-neutral-100 p-2 text-sm text-neutral-700">{c.finish_compatibility.join(', ') || 'N/A'}</td>)}
                  </CompareRow>
                  {/* Family */}
                  <CompareRow label="Family">
                    {selected.map((c) => {
                      const fam = families.find((f) => f.id === c.color_family_id);
                      return <td key={c.id} className="border-b border-neutral-100 p-2 text-sm text-neutral-700">{fam?.name ?? 'N/A'}</td>;
                    })}
                  </CompareRow>
                  {/* Complementary */}
                  <CompareRow label="Complementary">
                    {selected.map((c) => (
                      <td key={c.id} className="border-b border-neutral-100 p-2">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded ring-1 ring-black/10" style={{ background: complementaryMap[c.id] }} />
                          <span className="text-xs font-mono text-neutral-600">{complementaryMap[c.id]}</span>
                        </div>
                      </td>
                    ))}
                  </CompareRow>
                  {/* Similar colors */}
                  <CompareRow label="Similar">
                    {selected.map((c) => (
                      <td key={c.id} className="border-b border-neutral-100 p-2">
                        <div className="flex flex-wrap gap-1">
                          {(similarMap[c.id] ?? []).map((s) => (
                            <Link key={s.id} to={`/colors/paint/${s.slug}`} className="h-6 w-6 rounded ring-1 ring-black/10 transition-transform hover:scale-110" style={{ background: s.hex_code }} title={s.name} />
                          ))}
                        </div>
                      </td>
                    ))}
                  </CompareRow>
                </tbody>
              </table>
            </div>

            {/* Key Differences */}
            {keyDifferences.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-brand-navy dark:text-white">Key Differences</h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full border-collapse">
                    <tbody>
                      {keyDifferences.map((diff) => (
                        <tr key={diff.label}>
                          <td className="border-b border-neutral-200 bg-neutral-50 dark:border-white/5 dark:bg-white/5 p-2 text-xs font-semibold uppercase tracking-widest text-neutral-500" style={{ minWidth: 100 }}>{diff.label}</td>
                          {diff.values.map((v, i) => (
                            <td key={i} className="border-b border-neutral-100 p-2 text-sm text-neutral-700" style={{ minWidth: 150 }}>{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Coordinated Palettes */}
            {coordinatedPalettes.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-brand-navy dark:text-white">Coordinated Palettes</h3>
                <p className="mt-1 text-sm text-neutral-500">Color combinations featuring your selected colors.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {coordinatedPalettes.map((p) => (
                    <Link key={p.id} to={`/colors/${p.slug}`} className="group overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid transition-all dark:border-white/5 dark:bg-brand-navy-mid hover:-translate-y-1 hover:shadow-lg">
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <img src={p.image_url} alt={p.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                        <div className="absolute bottom-0 left-0 right-0 flex gap-1 bg-white/90 p-2 backdrop-blur">
                          {[p.main_color_code, p.secondary_color_code, p.accent_color_code].map((hex) => (
                            <div key={hex} className="h-5 flex-1 rounded ring-1 ring-black/5" style={{ background: hex }} />
                          ))}
                        </div>
                      </div>
                      <div className="p-3"><p className="truncate text-sm font-bold text-brand-navy dark:text-white">{p.title}</p></div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selected.length > 0 && selected.length < MAX_COMPARE && (
          <p className="mt-4 text-sm text-neutral-500">You can add {MAX_COMPARE - selected.length} more color{MAX_COMPARE - selected.length > 1 ? 's' : ''}.</p>
        )}
      </div>
    </>
  );
}

function CompareRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <td className="border-b border-neutral-200 bg-neutral-50 dark:border-white/5 dark:bg-white/5 p-2 text-xs font-semibold uppercase tracking-widest text-neutral-500" style={{ minWidth: 80 }}>{label}</td>
      {children}
    </tr>
  );
}

function CopyBtn({ value, copied, onCopy }: { value: string; copied: boolean; onCopy: (v: string) => void }) {
  return (
    <button type="button" onClick={() => onCopy(value)} className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-brand-purple">
      {copied ? <Check aria-hidden="true" className="h-3.5 w-3.5 text-accent-green" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : value}
    </button>
  );
}
