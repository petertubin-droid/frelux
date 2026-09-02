import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Loader2, MapPin, Users, Eye, Clock, X } from 'lucide-react';
import { fetchMyListings, cancelListing } from '@/lib/marketplace';
import { useAuth } from '@/lib/auth';
import type { DbMarketplaceListing } from '@/types/marketplace';
import { PROJECT_TYPE_LABELS, LISTING_STATUS_LABELS } from '@/types/marketplace';
import { classNames } from '@/lib/utils';
import { useSeo } from '@/lib/seo';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  open: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  awarded: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  in_progress: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  completed: 'bg-muted text-muted-foreground dark:bg-white/5 dark:text-muted-foreground',
  cancelled: 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400',
  expired: 'bg-muted text-muted-foreground',
};

export default function MyListings() {
  const { user } = useAuth();
  useSeo({ description: 'FRELUX marketplace', title: 'My Listings — FRELUX Marketplace', canonicalPath: '/marketplace/my-listings' });

  const [listings, setListings] = useState<DbMarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchMyListings(user.id);
      setListings(data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function handleCancel(id: string) {
    setCancellingId(id);
    try {
      await cancelListing(id, 'Cancelled by owner');
      load();
    } catch { /* ignore */ } finally {
      setCancellingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-brand-purple" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50 dark:bg-background">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground dark:text-primary-foreground">My Listings</h1>
            <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
              {listings.length} {listings.length === 1 ? 'listing' : 'listings'} total
            </p>
          </div>
          <Link
            to="/marketplace/post"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus aria-hidden="true" className="h-4 w-4" /> New Job
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center dark:border-white/5 dark:bg-card">
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">You haven't posted any jobs yet.</p>
            <Link
              to="/marketplace/post"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus aria-hidden="true" className="h-4 w-4" /> Post Your First Job
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="rounded-xl border border-border bg-card p-4 dark:border-white/5 dark:bg-card"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-brand-purple">
                        {PROJECT_TYPE_LABELS[listing.project_type]}
                      </span>
                      <span className={classNames(
                        'rounded-md px-2 py-0.5 text-[11px] font-semibold',
                        STATUS_COLORS[listing.status] || 'bg-muted text-muted-foreground'
                      )}>
                        {LISTING_STATUS_LABELS[listing.status]}
                      </span>
                      {listing.urgency === 'urgent' && (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                          <Clock aria-hidden="true" className="h-3 w-3" /> Urgent
                        </span>
                      )}
                    </div>
                    <Link
                      to={`/marketplace/${listing.id}`}
                      className="mt-2 block text-sm font-bold text-foreground hover:text-brand-purple dark:text-primary-foreground"
                    >
                      {listing.title}
                    </Link>
                    {listing.location_state && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground dark:text-muted-foreground">
                        <MapPin aria-hidden="true" className="h-3 w-3" />
                        {[listing.location_city, listing.location_state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground dark:text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Users aria-hidden="true" className="h-3 w-3" /> {listing.bid_count}</span>
                    <span className="inline-flex items-center gap-1"><Eye aria-hidden="true" className="h-3 w-3" /> {listing.view_count}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3 dark:border-white/5">
                  <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                    {new Date(listing.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    {listing.status === 'open' && (
                      <button
                        onClick={() => handleCancel(listing.id)}
                        disabled={cancellingId === listing.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-red-300 hover:text-red-500 dark:border-white/10 dark:text-muted-foreground/80"
                      >
                        {cancellingId === listing.id ? <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" /> : <X aria-hidden="true" className="h-3 w-3" />}
                        Cancel
                      </button>
                    )}
                    <Link
                      to={`/marketplace/${listing.id}`}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-brand-purple hover:text-brand-purple dark:border-white/10 dark:text-muted-foreground/80"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
