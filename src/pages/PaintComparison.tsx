import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Loader2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { useSeo } from '@/lib/seo';
import { fetchPaintComparisons } from '@/lib/project-intelligence';
import type { DbPaintComparison } from '@/types/database';

export default function PaintComparison() {
  useSeo({
    title: 'Paint Comparison Tool: Matt vs Satin vs Emulsion',
    description: 'Compare paint types side by side. See differences in finish, durability, washability, recommended use, and price range to choose the right paint for your project.',
    canonicalPath: '/paint-comparison',
    ogType: 'website',
  });

  const [comparisons, setComparisons] = useState<DbPaintComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPaintComparisons()
      .then((data) => {
        setComparisons(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const comparisonRows: Array<{ label: string; key: keyof DbPaintComparison }> = [
    { label: 'Finish', key: 'finish' },
    { label: 'Recommended Use', key: 'recommended_use' },
    { label: 'Durability', key: 'durability' },
    { label: 'Washability', key: 'washability' },
    { label: 'Appearance', key: 'appearance' },
    { label: 'Characteristics', key: 'product_characteristics' },
    { label: 'Suitable Areas', key: 'suitable_areas' },
    { label: 'Price Range', key: 'price_range' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Paint Comparison Tool"
        subtitle="Compare paint types side by side to find the right finish for your project."
      />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && comparisons.length > 0 && (
          <>
            {/* Comparison Table */}
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted">
                    <th className="p-4 text-left font-medium text-muted-foreground">Feature</th>
                    {comparisons.map((c) => (
                      <th key={c.id} className="p-4 text-left font-semibold">
                        {c.display_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Description row */}
                  <tr className="border-b">
                    <td className="p-4 font-medium text-muted-foreground">Description</td>
                    {comparisons.map((c) => (
                      <td key={c.id} className="p-4 text-muted-foreground">{c.description || '—'}</td>
                    ))}
                  </tr>
                  {comparisonRows.map((row, i) => (
                    <tr key={row.key} className={i % 2 === 0 ? 'border-b bg-muted/30' : 'border-b'}>
                      <td className="p-4 font-medium text-muted-foreground">{row.label}</td>
                      {comparisons.map((c) => (
                        <td key={c.id} className="p-4">{(c[row.key] as string) || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CTA cards */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {comparisons.map((c) => (
                <div key={c.id} className="rounded-lg border bg-card p-6">
                  <h3 className="font-semibold text-lg mb-2">{c.display_name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{c.finish || ''}</p>
                  <Link
                    to="/paint-calculator"
                    className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Calculate {c.display_name} →
                  </Link>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-lg border bg-muted/30 p-6">
              <h3 className="font-semibold mb-2">Need more help choosing?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Use our AI Color Assistant for personalized recommendations, or create a project to organize your painting work.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/ai-color-assistant" className="text-sm font-medium text-primary hover:underline">
                  AI Color Assistant →
                </Link>
                <Link to="/start-building" className="text-sm font-medium text-primary hover:underline">
                  Create a Project →
                </Link>
                <Link to="/learn" className="text-sm font-medium text-primary hover:underline">
                  Learn More →
                </Link>
              </div>
            </div>
          </>
        )}

        {!loading && !error && comparisons.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            No paint comparison data available yet. Please check back soon.
          </div>
        )}
      </div>
    </div>
  );
}
