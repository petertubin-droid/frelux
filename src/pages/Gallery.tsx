import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Image as ImageIcon, Loader2, MapPin, Calendar, Filter, Sparkles } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { useSeo } from '@/lib/seo';
import { useAuth } from '@/lib/auth';
import { fetchPublicGallery, fetchGalleryImages } from '@/lib/project-intelligence';
import type { DbGalleryEntry } from '@/types/database';

const CATEGORIES = [
  { key: '', label: 'All' },
  { key: 'painting', label: 'Painting' },
  { key: 'screeding', label: 'Screeding' },
  { key: 'pop_ceiling', label: 'POP Ceiling' },
  { key: 'tiling', label: 'Tiling' },
  { key: 'finishing', label: 'Finishing' },
  { key: 'construction', label: 'Construction' },
];

export default function Gallery() {
  useSeo({
    title: 'Before & After Project Gallery: Real Painting Transformations',
    description: 'Browse real FRELUX project transformations. See before and after photos of painting, screeding, POP ceiling, tiling, and finishing projects.',
    canonicalPath: '/gallery',
    ogType: 'website',
  });

  const { user } = useAuth();
  const [entries, setEntries] = useState<DbGalleryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [images, setImages] = useState<Record<string, { before?: string; after?: string }>>({});

  const loadGallery = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPublicGallery({ category: filter || undefined, limit: 24 });
      setEntries(data);
      const imgPromises = data.map(async (entry) => {
        const imgs = await fetchGalleryImages(entry.id);
        const before = imgs.find((i) => i.image_type === 'before');
        const after = imgs.find((i) => i.image_type === 'after');
        return [entry.id, { before: before?.image_url, after: after?.image_url }] as const;
      });
      const imgResults = await Promise.all(imgPromises);
      const imgMap: Record<string, { before?: string; after?: string }> = {};
      for (const [id, urls] of imgResults) imgMap[id] = urls;
      setImages(imgMap);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { loadGallery(); }, [loadGallery]);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Before & After Gallery" subtitle="Real project transformations from the FRELUX community." />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {CATEGORIES.map((cat) => (
            <button key={cat.key} onClick={() => setFilter(cat.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                filter === cat.key ? 'bg-primary text-primary-foreground scale-105 shadow-lg' : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:scale-105'
              }`}>{cat.label}</button>
          ))}
          {user && (
            <Link to="/gallery/new" className="ml-auto group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
              <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" /> Share Your Project
            </Link>
          )}
        </div>

        {loading && <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}
        {error && <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">{error}</div>}

        {!loading && !error && entries.length === 0 && (
          <div className="text-center py-20">
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No gallery entries yet. Be the first to share your project!</p>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry, i) => {
              const imgs = images[entry.id] || {};
              return (
                <div key={entry.id} className="group overflow-hidden rounded-xl border bg-card shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1"
                  style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                    {imgs.after ? (
                      <img src={imgs.after} alt={`${entry.title} - after`} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                    ) : imgs.before ? (
                      <img src={imgs.before} alt={`${entry.title} - before`} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground"><ImageIcon className="h-8 w-8" /></div>
                    )}
                    {entry.is_featured && (
                      <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
                        <Sparkles className="h-3 w-3" /> Featured
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold mb-1">{entry.title}</h3>
                    {entry.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{entry.description}</p>}
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-muted px-2.5 py-1 capitalize">{entry.project_category}</span>
                      {entry.paint_type_used && <span className="rounded-full bg-muted px-2.5 py-1">{entry.paint_type_used}</span>}
                      {entry.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {entry.location}</span>}
                      {entry.completion_date && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(entry.completion_date).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
