import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, AlertCircle, Share2, Clock } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { fetchSharedResource } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { useSeo } from '@/lib/seo';
import { readableTextColor } from '@/lib/colors';
import type { DbShareableLink, DbUserProject, DbPaintColor } from '@/types/database';

export default function SharedProject() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<DbShareableLink | null>(null);
  const [project, setProject] = useState<DbUserProject | null>(null);
  const [colors, setColors] = useState<DbPaintColor[]>([]);

  useSeo({
    title: 'Shared Project',
    description: 'A shared FRELUX project — colors, calculations, and estimates.',
    noIndex: true,
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: linkData, error: linkError } = await fetchSharedResource(id);
      if (linkError || !linkData) {
        setError('This share link is invalid or has expired.');
        setLoading(false);
        return;
      }
      setLink(linkData);

      if (linkData.resource_type === 'project') {
        const { data: proj } = await supabase
          .from('user_projects')
          .select('*')
          .eq('id', linkData.resource_id)
          .maybeSingle();
        if (proj) {
          setProject(proj as DbUserProject);
          const savedColors = (proj as Record<string, unknown>).saved_colors as { color_id?: string }[] | undefined;
          if (savedColors && savedColors.length > 0) {
            const colorIds = savedColors.map((c) => c.color_id).filter(Boolean) as string[];
            const { data: colData } = await supabase
              .from('paint_colors')
              .select('*')
              .in('id', colorIds);
            setColors((colData ?? []) as DbPaintColor[]);
          }
        }
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center gap-2 py-32 text-sm text-muted-foreground"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> Loading shared project…</div>;

  if (error || !link) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <AlertCircle aria-hidden="true" className="mx-auto h-8 w-8 text-muted-foreground/80" />
        <p className="mt-3 text-sm font-semibold text-muted-foreground">{error ?? 'Share link not found.'}</p>
        <Link to="/" className="mt-4 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Go to homepage</Link>
      </div>
    );
  }

  const projectData = project ? (project as unknown as Record<string, unknown>) : null;

  return (
    <>
      <PageHeader eyebrow="Shared" title={project?.name ?? 'Shared Project'} subtitle={project?.description ?? undefined} />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-accent-blue/20 bg-accent-blue/5 p-3 text-sm text-muted-foreground">
          <Share2 className="h-4 w-4 text-accent-blue" />
          This is a shared project. The owner can revoke access at any time.
        </div>

        {project && (
          <div className="space-y-6">
            {/* Project type badge */}
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-brand-purple">{project.project_type.replace('_', ' ')}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock aria-hidden="true" className="h-3 w-3" /> Created {new Date(project.created_at).toLocaleDateString()}</span>
            </div>

            {/* Saved colors */}
            {colors.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-foreground dark:text-primary-foreground">Colors</h2>
                <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {colors.map((c) => (
                    <Link key={c.id} to={`/colors/paint/${c.slug}`} className="group overflow-hidden rounded-lg border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-md">
                      <div className="aspect-square" style={{ background: c.hex_code }}>
                        <span className="flex h-full items-center justify-center text-xs font-bold uppercase" style={{ color: readableTextColor(c.hex_code) }}>{c.hex_code}</span>
                      </div>
                      <div className="p-2"><p className="truncate text-xs font-semibold text-foreground dark:text-primary-foreground">{c.name}</p></div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Project data as JSON-like display */}
            {projectData && (
              <div className="rounded-xl border border-border bg-muted/50 p-5">
                <h2 className="text-sm font-bold text-foreground dark:text-primary-foreground">Project Details</h2>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  {Object.entries(projectData)
                    .filter(([key]) => !['id', 'user_id', 'created_at', 'updated_at', 'name', 'description', 'saved_colors'].includes(key))
                    .map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{key.replace(/_/g, ' ')}</dt>
                        <dd className="mt-0.5 text-sm text-card-foreground dark:text-muted-foreground/60">{value === null || value === undefined ? 'N/A' : typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 border-t border-border pt-6 text-center">
          <Link to="/" className="text-sm font-semibold text-brand-purple hover:underline">Create your own project at FRELUX PROJECT CALC</Link>
        </div>
      </div>
    </>
  );
}
