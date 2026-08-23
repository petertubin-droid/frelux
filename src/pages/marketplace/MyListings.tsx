import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Loader2, MapPin, Users, Eye, Clock, X } from 'lucide-react';
import { fetchMyListings, cancelListing } from '@/lib/marketplace';
import { useAuth } from '@/lib/auth';
import type { DbMarketplaceListing } from '@/types/marketplace';
import { PROJECT_TYPE_LABELS, URGENCY_LABELS, LISTING_STATUS_LABELS } from '@/types/marketplace';
import { classNames } from '@/lib/utils';
import { useSeo } from '@/lib/seo';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-neutral-100 text-neutral-500',
  open: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  awarded: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  in_progress: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  completed: 'bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-400',
  cancelled: 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400',
  expired: 'bg-neutral-100 text-neutral-400',
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
        <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-brand-navy">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">My Listings</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {listings.length} {listings.length === 1 ? 'listing' : 'listings'} total
            </p>
          </div>
          <Link
            to="/marketplace/post"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white hover:bg-brand-purple-dark"
          >
            <Plus className="h-4 w-4" /> New Job
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white p-12 text-center dark:border-white/5 dark:bg-brand-navy-mid">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">You haven't posted any jobs yet.</p>
            <Link
              to="/marketplace/post"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white hover:bg-brand-purple-dark"
            >
              <Plus className="h-4 w-4" /> Post Your First Job
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-brand-purple/10 px-2 py-0.5 text-[11px] font-semibold text-brand-purple">
                        {PROJECT_TYPE_LABELS[listing.project_type]}
                      </span>
                      <span className={classNames(
                        'rounded-md px-2 py-0.5 text-[11px] font-semibold',
                        STATUS_COLORS[listing.status] || 'bg-neutral-100 text-neutral-500'
                      )}>
                        {LISTING_STATUS_LABELS[listing.status]}
                      </span>
                      {listing.urgency === 'urgent' && (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                          <Clock className="h-3 w-3" /> Urgent
                        </span>
                      )}
                    </div>
                    <Link
                      to={`/marketplace/${listing.id}`}
                      className="mt-2 block text-sm font-bold text-neutral-900 hover:text-brand-purple dark:text-white"
                    >
                      {listing.title}
                    </Link>
                    {listing.location_state && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                        <MapPin className="h-3 w-3" />
                        {[listing.location_city, listing.location_state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-neutral-400 dark:text-neutral-500">
                    <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {listing.bid_count}</span>
                    <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {listing.view_count}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-white/5">
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">
                    {new Date(listing.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    {listing.status === 'open' && (
                      <button
                        onClick={() => handleCancel(listing.id)}
                        disabled={cancellingId === listing.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-red-300 hover:text-red-500 dark:border-white/10 dark:text-neutral-300"
                      >
                        {cancellingId === listing.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                        Cancel
                      </button>
                    )}
                    <Link
                      to={`/marketplace/${listing.id}`}
                      className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-brand-purple hover:text-brand-purple dark:border-white/10 dark:text-neutral-300"
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
