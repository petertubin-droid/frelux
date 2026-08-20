import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Folder, Clock, Trash2, Copy, Plus, AlertCircle, Palette as PaletteIcon, Calculator, DollarSign, Layers, Pencil, Check, X, Pin, Search, Share2, ArrowRight } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonGrid } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { fetchFavoriteColors, fetchFavoritePalettes, fetchUserProjects, deleteUserProject, duplicateUserProject, fetchUserCollections, createUserCollection, deleteUserCollection, fetchCollectionColors, renameUserCollection, moveColorToCollection, fetchRecentlyViewedColors, clearRecentlyViewed, togglePinRecentlyViewed, createShareableLink } from '@/lib/queries';
import { useSeo } from '@/lib/seo';
import { useAuth } from '@/lib/auth';
import { readableTextColor } from '@/lib/colors';
import type { DbPaintColor, DbColorCombination, DbUserProject, DbUserCollection, ShareableResourceType } from '@/types/database';
import { SITE_URL } from '@/lib/seo';

type Tab = 'projects' | 'colors' | 'palettes' | 'collections' | 'recent';
type Status = 'loading' | 'ready' | 'error';

export default function MyProjects() {
  useSeo({
    title: 'My Projects — Saved Colors, Palettes & Calculations',
    description: 'View your saved paint colors, color palettes, calculations, and custom collections.',
    canonicalPath: '/my-projects',
    ogType: 'website',
    noIndex: true,
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('projects');
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [projects, setProjects] = useState<DbUserProject[]>([]);
  const [favColors, setFavColors] = useState<DbPaintColor[]>([]);
  const [favPalettes, setFavPalettes] = useState<DbColorCombination[]>([]);
  const [collections, setCollections] = useState<DbUserCollection[]>([]);
  const [collectionColors, setCollectionColors] = useState<Record<string, DbPaintColor[]>>({});
  const [recentlyViewed, setRecentlyViewed] = useState<DbPaintColor[]>([]);
  const [newCollName, setNewCollName] = useState('');
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [moveState, setMoveState] = useState<{ colorId: string; fromColl: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user]);

  async function loadAll() {
    setStatus('loading');
    setError('');
    const [projRes, favColRes, favPalRes, collRes, recentRes] = await Promise.all([
      fetchUserProjects(),
      fetchFavoriteColors(),
      fetchFavoritePalettes(),
      fetchUserCollections(),
      fetchRecentlyViewedColors(20),
    ]);
    if (projRes.error || favColRes.error || favPalRes.error || collRes.error) {
      setError('Failed to load your data. Please try again.');
      setStatus('error');
      return;
    }
    setProjects(projRes.data);
    setFavColors(favColRes.data);
    setFavPalettes(favPalRes.data);
    setCollections(collRes.data);
    setRecentlyViewed(recentRes.data);

    const collColors: Record<string, DbPaintColor[]> = {};
    await Promise.all(collRes.data.map(async (c) => {
      const { data } = await fetchCollectionColors(c.id);
      collColors[c.id] = data;
    }));
    setCollectionColors(collColors);
    setStatus('ready');
  }

  async function handleDeleteProject(id: string) {
    if (!confirm('Delete this project?')) return;
    await deleteUserProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleDuplicate(id: string) {
    await duplicateUserProject(id);
    loadAll();
  }

  const PROJECT_ROUTES: Record<string, string> = {
    screeding: '/screeding-calculator',
    paint_calc: '/paint-calculator',
    cost_estimate: '/cost-estimator',
    ai_recommendation: '/ai-color-assistant',
    custom: '/paint-calculator',
    pop_ceiling: '/pop-ceiling-calculator',
    pop_estimate: '/pop-ceiling-cost-estimator',
    tile: '/tile-calculator',
    tile_estimate: '/tile-cost-estimator',
  };

  function handleOpenProject(p: DbUserProject) {
    const route = PROJECT_ROUTES[p.project_type] ?? '/paint-calculator';
    navigate(route, { state: { projectData: p.project_data, projectId: p.id, projectName: p.name } });
  }

  async function handleCreateCollection() {
    if (!newCollName.trim()) return;
    setCreating(true);
    const { error } = await createUserCollection(newCollName.trim());
    setCreating(false);
    if (error) { setError(error); return; }
    setNewCollName('');
    loadAll();
  }

  async function handleDeleteCollection(id: string) {
    if (!confirm('Delete this collection and all its colors?')) return;
    await deleteUserCollection(id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleRename(id: string) {
    if (!renameValue.trim()) return;
    const { error } = await renameUserCollection(id, renameValue.trim());
    if (error) { setError(error); return; }
    setRenamingId(null);
    loadAll();
  }

  async function handleMoveColor(toCollectionId: string) {
    if (!moveState) return;
    const { error } = await moveColorToCollection(moveState.fromColl, toCollectionId, moveState.colorId);
    if (error) { setError(error); return; }
    setMoveState(null);
    loadAll();
  }

  async function handleClearRecent() {
    if (!confirm('Clear all unpinned recently viewed colors?')) return;
    await clearRecentlyViewed();
    loadAll();
  }

  async function handlePinRecent(colorId: string) {
    await togglePinRecentlyViewed(colorId);
    loadAll();
  }

  async function handleShare(resourceType: ShareableResourceType, resourceId: string) {
    const { data } = await createShareableLink(resourceType, resourceId);
    if (data) {
      const link = `${SITE_URL}/shared/${data.id}`;
      if (navigator.clipboard) navigator.clipboard.writeText(link);
      toast({ type: 'success', title: 'Share link copied', message: 'The shareable link has been copied to your clipboard.' });
    } else {
      toast({ type: 'error', title: 'Failed to create share link' });
    }
  }


  // Filter collections by search
  const filteredCollections = useMemo(() => {
    if (!search) return collections;
    return collections.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [collections, search]);

  // Filter projects by search
  const filteredProjects = useMemo(() => {
    if (!search) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [projects, search]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-neutral-300" />
        <p className="mt-3 text-sm font-semibold text-neutral-600">Sign in to view your saved projects and favorites.</p>
        <Link to="/login?redirect=/my-projects" className="mt-4 inline-block rounded-lg bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-purple-dark">Sign in</Link>
      </div>
    );
  }

  if (status === 'loading') return (
    <>
      <PageHeader eyebrow="Your workspace" title="My Projects" subtitle="Your saved colors, palettes, calculations, and custom collections, all in one place." />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <SkeletonGrid count={6} />
      </div>
    </>
  );
  if (status === 'error') return <div className="mx-auto max-w-md py-20 text-center"><AlertCircle className="mx-auto h-8 w-8 text-red-400" /><p className="mt-3 text-sm text-red-600">{error}</p></div>;

  const projectIcon = (type: string) => {
    switch (type) {
      case 'screeding': return <Layers className="h-5 w-5 text-accent-cyan" />;
      case 'paint_calc': return <Calculator className="h-5 w-5 text-accent-orange" />;
      case 'cost_estimate': return <DollarSign className="h-5 w-5 text-accent-green" />;
      case 'ai_recommendation': return <PaletteIcon className="h-5 w-5 text-brand-purple" />;
      default: return <Folder className="h-5 w-5 text-neutral-400" />;
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Folder; count: number }[] = [
    { id: 'projects', label: 'Projects', icon: Folder, count: projects.length },
    { id: 'colors', label: 'Favorite Colors', icon: Heart, count: favColors.length },
    { id: 'palettes', label: 'Favorite Palettes', icon: PaletteIcon, count: favPalettes.length },
    { id: 'collections', label: 'Collections', icon: Folder, count: collections.length },
    { id: 'recent', label: 'Recently Viewed', icon: Clock, count: recentlyViewed.length },
  ];

  return (
    <>
      <PageHeader eyebrow="Your workspace" title="My Projects" subtitle="Your saved colors, palettes, calculations, and custom collections, all in one place." />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} type="button" onClick={() => { setTab(t.id); setSearch(''); }} className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${tab === t.id ? 'border-brand-purple bg-brand-purple text-white' : 'border-neutral-200 bg-white text-neutral-600 hover:text-brand-purple dark:border-white/5 dark:bg-brand-navy-mid dark:text-neutral-300 dark:hover:text-brand-purple-lighter'}`}>
                <Icon className="h-4 w-4" /> {t.label} <span className={`rounded-full px-1.5 py-0.5 text-xs ${tab === t.id ? 'bg-white/20' : 'bg-neutral-100'}`}>{t.count}</span>
              </button>
            );
          })}
        </div>

        {/* Search bar for projects/collections */}
        {(tab === 'projects' || tab === 'collections') && (
          <div className="relative mb-4 w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${tab}…`} className="input-field pl-9" />
          </div>
        )}

        {/* Projects tab */}
        {tab === 'projects' && (
          filteredProjects.length > 0 ? (
            <div className="space-y-3">
              {filteredProjects.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid">
                  <div className="flex items-start gap-3">
                    {projectIcon(p.project_type)}
                    <div>
                      <h3 className="text-sm font-bold text-brand-navy dark:text-white">{p.name}</h3>
                      {p.description && <p className="mt-0.5 text-xs text-neutral-500">{p.description}</p>}
                      <p className="mt-1 text-xs text-neutral-400">Updated {new Date(p.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => handleOpenProject(p)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-purple px-3 py-2 text-xs font-semibold text-white hover:bg-brand-purple-dark" title="Open"><ArrowRight className="h-3.5 w-3.5" /> Open</button>
                    <button type="button" onClick={() => handleShare('project', p.id)} className="rounded-lg border border-neutral-200 p-2 text-neutral-500 hover:text-brand-purple dark:border-white/5 dark:text-neutral-400 dark:hover:text-brand-purple-lighter" title="Share"><Share2 className="h-4 w-4" /></button>
                    <button type="button" onClick={() => handleDuplicate(p.id)} className="rounded-lg border border-neutral-200 p-2 text-neutral-500 hover:text-brand-purple dark:border-white/5 dark:text-neutral-400 dark:hover:text-brand-purple-lighter" title="Duplicate"><Copy className="h-4 w-4" /></button>
                    <button type="button" onClick={() => handleDeleteProject(p.id)} className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              illustration="projects"
              title="No saved projects yet"
              description="Save calculations and estimates from the calculators to revisit them here."
              actionLabel="Start calculating"
              actionTo="/paint-calculator"
            />
          )
        )}

        {/* Favorite colors tab */}
        {tab === 'colors' && (
          favColors.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {favColors.map((c) => (
                <Link key={c.id} to={`/colors/paint/${c.slug}`} className="group overflow-hidden rounded-lg border border-neutral-200 bg-white transition-all dark:border-white/5 dark:bg-brand-navy-mid hover:-translate-y-1 hover:shadow-md">
                  <div className="aspect-square" style={{ background: c.hex_code }}>
                    <span className="flex h-full items-center justify-center text-xs font-bold uppercase" style={{ color: readableTextColor(c.hex_code) }}>{c.hex_code}</span>
                  </div>
                  <div className="p-2"><p className="truncate text-xs font-semibold text-brand-navy dark:text-white">{c.name}</p></div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              illustration="favorites"
              title="No favorite colors yet"
              description="Tap the heart icon on any color to save it here."
              actionLabel="Browse colors"
              actionTo="/colors"
            />
          )
        )}

        {/* Favorite palettes tab */}
        {tab === 'palettes' && (
          favPalettes.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {favPalettes.map((p) => (
                <Link key={p.id} to={`/colors/${p.slug}`} className="group overflow-hidden rounded-xl border border-neutral-200 bg-white transition-all dark:border-white/5 dark:bg-brand-navy-mid hover:-translate-y-1 hover:shadow-lg">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img src={p.image_url} alt={p.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    <div className="absolute bottom-0 left-0 right-0 flex gap-1 bg-white/90 p-2 backdrop-blur dark:bg-brand-navy/90">
                      {[p.main_color_code, p.secondary_color_code, p.accent_color_code].map((hex) => (
                        <div key={hex} className="h-5 flex-1 rounded ring-1 ring-black/5" style={{ background: hex }} />
                      ))}
                    </div>
                  </div>
                  <div className="p-4"><h3 className="text-base font-bold text-brand-navy dark:text-white">{p.title}</h3></div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              illustration="favorites"
              title="No favorite palettes yet"
              description="Browse color palettes and save the ones you love."
              actionLabel="Browse palettes"
              actionTo="/colors"
            />
          )
        )}

        {/* Collections tab */}
        {tab === 'collections' && (
          <>
            <div className="mb-6 flex gap-2">
              <input value={newCollName} onChange={(e) => setNewCollName(e.target.value)} placeholder="New collection name (e.g., Luxury Living Room)" className="input-field flex-1" onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()} />
              <button type="button" onClick={handleCreateCollection} disabled={creating || !newCollName.trim()} className="inline-flex items-center gap-2 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-brand-purple-dark">
                <Plus className="h-4 w-4" /> Create
              </button>
            </div>
            {filteredCollections.length > 0 ? (
              <div className="space-y-4">
                {filteredCollections.map((c) => (
                  <div key={c.id} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {renamingId === c.id ? (
                          <div className="flex items-center gap-2">
                            <input className="input-field flex-1 text-sm font-bold" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleRename(c.id)} />
                            <button type="button" onClick={() => handleRename(c.id)} className="rounded-md bg-brand-purple p-1.5 text-white"><Check className="h-4 w-4" /></button>
                            <button type="button" onClick={() => setRenamingId(null)} className="rounded-md border border-neutral-200 p-1.5 text-neutral-500 dark:border-white/5 dark:text-neutral-400"><X className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <>
                            <h3 className="text-sm font-bold text-brand-navy dark:text-white">{c.name}</h3>
                            {c.description && <p className="text-xs text-neutral-500">{c.description}</p>}
                            <p className="mt-0.5 text-xs text-neutral-400">{(collectionColors[c.id] ?? []).length} colors</p>
                          </>
                        )}
                      </div>
                      {renamingId !== c.id && (
                        <div className="flex shrink-0 items-center gap-2">
                          <button type="button" onClick={() => { setRenamingId(c.id); setRenameValue(c.name); }} className="rounded-lg border border-neutral-200 p-2 text-neutral-500 hover:text-brand-purple dark:border-white/5 dark:text-neutral-400 dark:hover:text-brand-purple-lighter" title="Rename"><Pencil className="h-4 w-4" /></button>
                          <button type="button" onClick={() => handleDeleteCollection(c.id)} className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50" title="Delete"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      )}
                    </div>
                    {(collectionColors[c.id] ?? []).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(collectionColors[c.id] ?? []).map((col) => (
                          <div key={col.id} className="group relative flex items-center gap-2 rounded-lg border border-neutral-200 p-1.5 pr-3 hover:border-brand-purple">
                            <Link to={`/colors/paint/${col.slug}`} className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded" style={{ background: col.hex_code }} />
                              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">{col.name}</span>
                            </Link>
                            {collections.length > 1 && (
                              <div className="relative">
                                <button type="button" onClick={() => setMoveState({ colorId: col.id, fromColl: c.id })} className="rounded p-0.5 text-neutral-400 hover:text-brand-purple" title="Move to another collection">
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                                {moveState?.colorId === col.id && (
                                  <div className="absolute right-0 top-6 z-10 w-48 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg dark:border-white/5 dark:bg-brand-navy-mid">
                                    <p className="mb-1 text-[10px] font-semibold uppercase text-neutral-400">Move to</p>
                                    {collections.filter((oc) => oc.id !== c.id).map((oc) => (
                                      <button key={oc.id} type="button" onClick={() => handleMoveColor(oc.id)} className="block w-full rounded px-2 py-1.5 text-left text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100">{oc.name}</button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
              illustration="projects"
              title="No collections yet"
              description="Create custom collections to organize your favorite colors by project or theme."
            />
            )}
          </>
        )}

        {/* Recently Viewed tab */}
        {tab === 'recent' && (
          <>
            {recentlyViewed.length > 0 ? (
              <>
                <div className="mb-4 flex justify-end">
                  <button type="button" onClick={handleClearRecent} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:text-red-500 dark:border-white/5 dark:text-neutral-300 dark:hover:text-red-400">
                    <Trash2 className="h-4 w-4" /> Clear History
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {recentlyViewed.map((c) => (
                    <div key={c.id} className="group relative overflow-hidden rounded-lg border border-neutral-200 bg-white transition-all dark:border-white/5 dark:bg-brand-navy-mid hover:-translate-y-1 hover:shadow-md">
                      <button type="button" onClick={() => handlePinRecent(c.id)} className="absolute right-2 top-2 z-10 rounded-full bg-white/80 p-1.5 text-neutral-500 dark:bg-brand-navy/80 dark:text-neutral-400 hover:text-brand-purple" title="Pin/Unpin">
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                      <Link to={`/colors/paint/${c.slug}`}>
                        <div className="aspect-square" style={{ background: c.hex_code }}>
                          <span className="flex h-full items-center justify-center text-xs font-bold uppercase" style={{ color: readableTextColor(c.hex_code) }}>{c.hex_code}</span>
                        </div>
                        <div className="p-2"><p className="truncate text-xs font-semibold text-brand-navy dark:text-white">{c.name}</p></div>
                      </Link>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
              illustration="generic"
              title="No recently viewed colors"
              description="Browse the color library and your viewed colors will appear here."
              actionLabel="Browse colors"
              actionTo="/colors"
            />
            )}
          </>
        )}
      </div>
    </>
  );
}

