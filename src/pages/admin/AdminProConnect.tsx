import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, Ban, Eye, Star, Search } from 'lucide-react';
import type { DbProProfile, DbProReport } from '@/types/pro-connect';
import { classNames } from '@/lib/utils';

export default function AdminProConnect() {
  const [profiles, setProfiles] = useState<DbProProfile[]>([]);
  const [reports, setReports] = useState<DbProReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'professionals' | 'reports' | 'reviews'>('professionals');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [profileRes, reportRes] = await Promise.all([
        supabase.from('pro_profiles').select('*').order('created_at DESC'),
        supabase.from('pro_reports').select('*').order('created_at DESC'),
      ]);
      setProfiles((profileRes.data || []) as DbProProfile[]);
      setReports((reportRes.data || []) as DbProReport[]);
      setLoading(false);
    })();
  }, []);

  async function updateVerification(profileId: string, status: 'unverified' | 'pending' | 'verified' | 'suspended') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Update profile
    await supabase.from('pro_profiles').update({ verification_status: status }).eq('id', profileId);

    // Log verification change
    await supabase.from('pro_verification_logs').insert({
      profile_id: profileId,
      admin_id: user.id,
      new_status: status,
    });

    // Refresh
    const { data } = await supabase.from('pro_profiles').select('*').order('created_at DESC');
    setProfiles((data || []) as DbProProfile[]);
  }

  async function resolveReport(reportId: string, status: 'resolved' | 'dismissed') {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('pro_reports').update({
      status,
      resolved_by: user?.id,
      resolved_at: new Date().toISOString(),
    }).eq('id', reportId);
    const { data } = await supabase.from('pro_reports').select('*').order('created_at DESC');
    setReports((data || []) as DbProReport[]);
  }

  const filteredProfiles = profiles.filter((p) =>
    !search || p.display_name.toLowerCase().includes(search.toLowerCase()) || p.business_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-neutral-900 dark:text-white">Pro Connect Management</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-neutral-200 dark:border-white/10">
        {([
          ['professionals', `Professionals (${profiles.length})`],
          ['reports', `Reports (${reports.filter((r) => r.status === 'open').length})`],
          ['reviews', 'Reviews'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={classNames(
              'px-4 py-2.5 text-sm font-medium transition-colors',
              tab === key
                ? 'border-b-2 border-brand-purple text-brand-purple dark:text-brand-purple-lighter'
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Professionals tab */}
      {tab === 'professionals' && (
        <div>
          <div className="mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search professionals..."
                className="w-full rounded-lg border border-neutral-200 py-2 pl-10 pr-4 text-sm dark:border-white/10 dark:bg-brand-navy"
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-neutral-100 dark:bg-white/5" />)}
            </div>
          ) : filteredProfiles.length === 0 ? (
            <p className="rounded-lg border border-neutral-200 py-8 text-center text-sm text-neutral-400 dark:border-white/5 dark:text-neutral-500">
              No professionals found.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredProfiles.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-purple/10 text-sm font-medium text-brand-purple dark:text-brand-purple-lighter">
                      {p.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">{p.display_name}</p>
                      <p className="text-xs text-neutral-400">
                        {p.business_name || 'No business'} · {p.rating_avg.toFixed(1)} ★ ({p.rating_count})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={classNames(
                      'rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                      p.verification_status === 'verified' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                      p.verification_status === 'pending' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                      p.verification_status === 'suspended' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' :
                      'bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-400'
                    )}>
                      {p.verification_status}
                    </span>
                    <select
                      value={p.verification_status}
                      onChange={(e) => updateVerification(p.id, e.target.value as 'unverified' | 'pending' | 'verified' | 'suspended')}
                      className="rounded-lg border border-neutral-200 px-2 py-1 text-xs dark:border-white/10 dark:bg-brand-navy"
                    >
                      <option value="unverified">Unverified</option>
                      <option value="pending">Pending</option>
                      <option value="verified">Verify</option>
                      <option value="suspended">Suspend</option>
                    </select>
                    <a href={`/pro-connect/${p.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1.5 text-neutral-400 hover:text-brand-purple">
                      <Eye className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reports tab */}
      {tab === 'reports' && (
        <div>
          {reports.length === 0 ? (
            <p className="rounded-lg border border-neutral-200 py-8 text-center text-sm text-neutral-400 dark:border-white/5 dark:text-neutral-500">
              No reports filed.
            </p>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium capitalize text-neutral-600 dark:bg-white/5 dark:text-neutral-300">
                        {r.report_type}
                      </span>
                      <p className="mt-2 text-sm font-medium text-neutral-900 dark:text-white">{r.reason}</p>
                      {r.description && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{r.description}</p>}
                      <p className="mt-2 text-xs text-neutral-400">{new Date(r.created_at).toLocaleDateString('en-GB')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={classNames(
                        'rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                        r.status === 'open' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' :
                        r.status === 'resolved' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                        'bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-400'
                      )}>
                        {r.status}
                      </span>
                      {r.status === 'open' && (
                        <>
                          <button onClick={() => resolveReport(r.id, 'resolved')} className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-medium text-white">
                            Resolve
                          </button>
                          <button onClick={() => resolveReport(r.id, 'dismissed')} className="rounded-lg border border-neutral-200 px-3 py-1 text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-300">
                            Dismiss
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reviews tab */}
      {tab === 'reviews' && <AdminReviewsTab />}
    </div>
  );
}

function AdminReviewsTab() {
  const [reviews, setReviews] = useState<{ id: string; rating: number; review_text: string | null; is_hidden: boolean; professional_id: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('pro_reviews')
        .select('*')
        .order('created_at DESC')
        .limit(50);
      setReviews((data || []) as typeof reviews);
      setLoading(false);
    })();
  }, []);

  async function toggleHidden(reviewId: string, hidden: boolean) {
    await supabase.from('pro_reviews').update({ is_hidden: !hidden }).eq('id', reviewId);
    setReviews(reviews.map((r) => r.id === reviewId ? { ...r, is_hidden: !hidden } : r));
  }

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100 dark:bg-white/5" />)}</div>;

  if (reviews.length === 0) {
    return <p className="rounded-lg border border-neutral-200 py-8 text-center text-sm text-neutral-400 dark:border-white/5 dark:text-neutral-500">No reviews to moderate.</p>;
  }

  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <div key={r.id} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={s <= r.rating ? 'h-4 w-4 fill-amber-400 text-amber-400' : 'h-4 w-4 text-neutral-200 dark:text-neutral-700'} />
                ))}
                <span className="text-xs text-neutral-400">{new Date(r.created_at).toLocaleDateString('en-GB')}</span>
                {r.is_hidden && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">Hidden</span>}
              </div>
              {r.review_text && <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{r.review_text}</p>}
            </div>
            <button
              onClick={() => toggleHidden(r.id, r.is_hidden)}
              className={classNames(
                'rounded-lg px-3 py-1.5 text-xs font-medium',
                r.is_hidden
                  ? 'bg-emerald-500 text-white'
                  : 'border border-red-200 text-red-600 dark:border-red-500/20'
              )}
            >
              {r.is_hidden ? 'Unhide' : 'Hide'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
