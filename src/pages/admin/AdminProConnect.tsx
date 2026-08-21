import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Ban, Eye, Star, Search, Check, X, FileWarning, Award } from 'lucide-react';
import type { DbProProfile, DbProReport, DbProVerificationRequest, DbProSettings } from '@/types/pro-connect';
import { classNames } from '@/lib/utils';
import {
  adminApproveVerification, adminRejectVerification, adminRequestMoreInfo,
  adminSuspendVerification, adminReinstateVerification,
  adminAwardProLevel, adminRevokeProLevel,
  getAllVerificationRequests, fetchProSettings, updateProSettings,
} from '@/lib/pro-connect';

type Tab = 'professionals' | 'verification' | 'reports' | 'reviews' | 'settings';

export default function AdminProConnect() {
  const [tab, setTab] = useState<Tab>('professionals');

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-neutral-900 dark:text-white">Pro Connect Management</h1>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-neutral-200 dark:border-white/10">
        {([
          ['professionals', 'Professionals'],
          ['verification', 'Verification'],
          ['reports', 'Reports'],
          ['reviews', 'Reviews'],
          ['settings', 'Settings'],
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

      {tab === 'professionals' && <AdminProfessionalsTab />}
      {tab === 'verification' && <AdminVerificationTab />}
      {tab === 'reports' && <AdminReportsTab />}
      {tab === 'reviews' && <AdminReviewsTab />}
      {tab === 'settings' && <AdminSettingsTab />}
    </div>
  );
}

// =========================================================
// PROFESSIONALS TAB
// =========================================================
function AdminProfessionalsTab() {
  const [profiles, setProfiles] = useState<DbProProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('pro_profiles').select('*').order('created_at DESC');
    setProfiles((data || []) as DbProProfile[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  async function updateVerification(profileId: string, status: 'unverified' | 'pending' | 'verified' | 'suspended') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('pro_profiles').update({ verification_status: status }).eq('id', profileId);
    await supabase.from('pro_verification_logs').insert({ profile_id: profileId, admin_id: user.id, new_status: status });
    loadProfiles();
  }

  async function handleAwardProLevel(profileId: string) {
    await adminAwardProLevel(profileId);
    loadProfiles();
  }

  async function handleRevokeProLevel(profileId: string) {
    await adminRevokeProLevel(profileId);
    loadProfiles();
  }

  const filtered = profiles.filter((p) =>
    !search || p.display_name.toLowerCase().includes(search.toLowerCase()) || p.business_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-neutral-100 dark:bg-white/5" />)}</div>;
  }

  if (filtered.length === 0) {
    return <p className="rounded-lg border border-neutral-200 py-8 text-center text-sm text-neutral-400 dark:border-white/5 dark:text-neutral-500">No professionals found.</p>;
  }

  return (
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
      <div className="space-y-3">
        {filtered.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-purple/10 text-sm font-medium text-brand-purple dark:text-brand-purple-lighter">
                {p.display_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">{p.display_name}</p>
                <p className="text-xs text-neutral-400">
                  {p.business_name || 'No business'} · {p.rating_avg.toFixed(1)} ★ ({p.rating_count})
                  {p.pro_level && <span className="ml-2 text-amber-500">★ FRELUX Pro</span>}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={classNames(
                'rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                p.verification_status === 'verified' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                p.verification_status === 'pending' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                p.verification_status === 'rejected' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' :
                p.verification_status === 'more_info' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' :
                p.verification_status === 'suspended' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' :
                'bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-400'
              )}>
                {p.verification_status.replace('_', ' ')}
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
              {!p.pro_level ? (
                <button onClick={() => handleAwardProLevel(p.id)} title="Award FRELUX Pro" className="rounded-lg p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10">
                  <Award className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={() => handleRevokeProLevel(p.id)} title="Revoke FRELUX Pro" className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                  <Ban className="h-4 w-4" />
                </button>
              )}
              <a href={`/pro-connect/${p.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1.5 text-neutral-400 hover:text-brand-purple">
                <Eye className="h-4 w-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================
// VERIFICATION CENTER TAB
// =========================================================
function AdminVerificationTab() {
  const [requests, setRequests] = useState<DbProVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');
  const [selectedRequest, setSelectedRequest] = useState<DbProVerificationRequest | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [moreInfoText, setMoreInfoText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getAllVerificationRequests(filter === 'all' ? undefined : filter);
    setRequests(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(profileId: string, requestId: string) {
    await adminApproveVerification(profileId, requestId, actionNotes || undefined);
    setActionNotes('');
    setSelectedRequest(null);
    load();
  }

  async function handleReject(profileId: string, requestId: string) {
    await adminRejectVerification(profileId, requestId, rejectionReason || undefined, actionNotes || undefined);
    setRejectionReason('');
    setActionNotes('');
    setSelectedRequest(null);
    load();
  }

  async function handleMoreInfo(profileId: string, requestId: string) {
    await adminRequestMoreInfo(profileId, requestId, moreInfoText, actionNotes || undefined);
    setMoreInfoText('');
    setActionNotes('');
    setSelectedRequest(null);
    load();
  }

  async function handleSuspend(profileId: string) {
    await adminSuspendVerification(profileId, actionNotes || undefined);
    setActionNotes('');
    setSelectedRequest(null);
    load();
  }

  async function handleReinstate(profileId: string) {
    await adminReinstateVerification(profileId, actionNotes || undefined);
    setActionNotes('');
    setSelectedRequest(null);
    load();
  }

  return (
    <div>
      {/* Filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {['pending', 'approved', 'rejected', 'more_info', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={classNames(
              'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
              filter === f ? 'bg-brand-purple text-white' : 'bg-neutral-100 text-neutral-500 hover:text-neutral-700 dark:bg-white/5 dark:text-neutral-400'
            )}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-neutral-100 dark:bg-white/5" />)}</div>
      ) : requests.length === 0 ? (
        <p className="rounded-lg border border-neutral-200 py-8 text-center text-sm text-neutral-400 dark:border-white/5 dark:text-neutral-500">
          No verification requests found.
        </p>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const profile = (req as unknown as { profile?: { display_name: string; slug: string; business_name: string | null } }).profile;
            return (
              <div key={req.id} className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/5 dark:bg-brand-navy-mid">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={classNames(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        req.request_type === 'identity' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' :
                        req.request_type === 'contact' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                        'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                      )}>
                        {req.request_type}
                      </span>
                      <span className={classNames(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        req.status === 'pending' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                        req.status === 'approved' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                        req.status === 'rejected' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' :
                        'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                      )}>
                        {req.status.replace('_', ' ')}
                      </span>
                    </div>
                    {profile && (
                      <p className="mt-2 text-sm font-medium text-neutral-900 dark:text-white">
                        {profile.display_name} {profile.business_name && `· ${profile.business_name}`}
                      </p>
                    )}
                    {req.professional_name && (
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Name: {req.professional_name}</p>
                    )}
                    {req.identity_document_type && (
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        ID Type: <span className="capitalize">{req.identity_document_type.replace(/_/g, ' ')}</span>
                      </p>
                    )}
                    {req.years_experience != null && (
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Experience: {req.years_experience} years</p>
                    )}
                    <p className="mt-1 text-xs text-neutral-400">
                      Submitted: {new Date(req.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {req.admin_notes && (
                      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Admin notes: {req.admin_notes}</p>
                    )}
                  </div>
                  {profile && (
                    <a href={`/pro-connect/${profile.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1.5 text-neutral-400 hover:text-brand-purple">
                      <Eye className="h-4 w-4" />
                    </a>
                  )}
                </div>

                {/* Actions */}
                {req.status === 'pending' && (
                  <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-white/5">
                    {selectedRequest?.id === req.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={actionNotes}
                          onChange={(e) => setActionNotes(e.target.value)}
                          placeholder="Admin notes (optional)"
                          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-white/10 dark:bg-brand-navy"
                        />
                        <input
                          type="text"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Rejection reason (if rejecting)"
                          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-white/10 dark:bg-brand-navy"
                        />
                        <input
                          type="text"
                          value={moreInfoText}
                          onChange={(e) => setMoreInfoText(e.target.value)}
                          placeholder="What additional info is needed? (if requesting more info)"
                          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-white/10 dark:bg-brand-navy"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => handleApprove(req.profile_id, req.id)} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white">
                            <Check className="mr-1 inline h-3.5 w-3.5" />Approve
                          </button>
                          <button onClick={() => handleReject(req.profile_id, req.id)} className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white">
                            <X className="mr-1 inline h-3.5 w-3.5" />Reject
                          </button>
                          <button onClick={() => handleMoreInfo(req.profile_id, req.id)} className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 dark:border-blue-500/20 dark:text-blue-400">
                            <FileWarning className="mr-1 inline h-3.5 w-3.5" />Request Info
                          </button>
                          <button onClick={() => setSelectedRequest(null)} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-300">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setSelectedRequest(req); setActionNotes(''); setRejectionReason(''); setMoreInfoText(''); }}
                        className="text-sm font-medium text-brand-purple dark:text-brand-purple-lighter"
                      >
                        Review Request →
                      </button>
                    )}
                  </div>
                )}

                {/* Reinstation/Suspension for non-pending */}
                {req.status === 'approved' && (
                  <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-white/5">
                    <button
                      onClick={() => handleSuspend(req.profile_id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 dark:border-red-500/20 dark:text-red-400"
                    >
                      Suspend Verification
                    </button>
                  </div>
                )}
                {req.status === 'rejected' && (
                  <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-white/5">
                    <button
                      onClick={() => handleReinstate(req.profile_id)}
                      className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:border-emerald-500/20 dark:text-emerald-400"
                    >
                      Reinstate
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =========================================================
// REPORTS TAB
// =========================================================
function AdminReportsTab() {
  const [reports, setReports] = useState<DbProReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('pro_reports').select('*').order('created_at DESC');
      setReports((data || []) as DbProReport[]);
      setLoading(false);
    })();
  }, []);

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

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-neutral-100 dark:bg-white/5" />)}</div>;

  if (reports.length === 0) {
    return <p className="rounded-lg border border-neutral-200 py-8 text-center text-sm text-neutral-400 dark:border-white/5 dark:text-neutral-500">No reports filed.</p>;
  }

  return (
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
                  <button onClick={() => resolveReport(r.id, 'resolved')} className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-medium text-white">Resolve</button>
                  <button onClick={() => resolveReport(r.id, 'dismissed')} className="rounded-lg border border-neutral-200 px-3 py-1 text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-300">Dismiss</button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// =========================================================
// REVIEWS TAB
// =========================================================
function AdminReviewsTab() {
  const [reviews, setReviews] = useState<{ id: string; rating: number; review_text: string | null; is_hidden: boolean; is_verified_review: boolean; professional_id: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('pro_reviews').select('*').order('created_at DESC').limit(50);
      setReviews((data || []) as typeof reviews);
      setLoading(false);
    })();
  }, []);

  async function toggleHidden(reviewId: string, hidden: boolean) {
    await supabase.from('pro_reviews').update({ is_hidden: !hidden }).eq('id', reviewId);
    setReviews(reviews.map((r) => r.id === reviewId ? { ...r, is_hidden: !hidden } : r));
  }

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100 dark:bg-white/5" />)}</div>;
  if (reviews.length === 0) return <p className="rounded-lg border border-neutral-200 py-8 text-center text-sm text-neutral-400 dark:border-white/5 dark:text-neutral-500">No reviews to moderate.</p>;

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
                {r.is_verified_review && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">Verified Review</span>}
              </div>
              {r.review_text && <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{r.review_text}</p>}
            </div>
            <button
              onClick={() => toggleHidden(r.id, r.is_hidden)}
              className={classNames('rounded-lg px-3 py-1.5 text-xs font-medium', r.is_hidden ? 'bg-emerald-500 text-white' : 'border border-red-200 text-red-600 dark:border-red-500/20')}
            >
              {r.is_hidden ? 'Unhide' : 'Hide'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// =========================================================
// SETTINGS TAB
// =========================================================
function AdminSettingsTab() {
  const [settings, setSettings] = useState<DbProSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await fetchProSettings();
      setSettings(s);
      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    await updateProSettings(settings);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading || !settings) return <div className="h-32 animate-pulse rounded-lg bg-neutral-100 dark:bg-white/5" />;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Badge descriptions */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/5 dark:bg-brand-navy-mid">
        <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">Verification Badge Descriptions</h3>
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Contact Verified description</span>
            <textarea
              value={settings.contact_verified_description}
              onChange={(e) => setSettings({ ...settings, contact_verified_description: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">FRELUX Verified description</span>
            <textarea
              value={settings.frelux_verified_description}
              onChange={(e) => setSettings({ ...settings, frelux_verified_description: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">FRELUX Pro description</span>
            <textarea
              value={settings.pro_level_description}
              onChange={(e) => setSettings({ ...settings, pro_level_description: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Verification disclaimer</span>
            <textarea
              value={settings.verification_disclaimer}
              onChange={(e) => setSettings({ ...settings, verification_disclaimer: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
          </label>
        </div>
      </div>

      {/* Pro Level requirements */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/5 dark:bg-brand-navy-mid">
        <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">FRELUX Pro Eligibility Requirements</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Minimum reviews</span>
            <input
              type="number"
              value={settings.pro_level_min_reviews}
              onChange={(e) => setSettings({ ...settings, pro_level_min_reviews: parseInt(e.target.value) || 0 })}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Minimum rating</span>
            <input
              type="number"
              step="0.1"
              value={settings.pro_level_min_rating}
              onChange={(e) => setSettings({ ...settings, pro_level_min_rating: parseFloat(e.target.value) || 0 })}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Min portfolio items</span>
            <input
              type="number"
              value={settings.pro_level_min_portfolio_items}
              onChange={(e) => setSettings({ ...settings, pro_level_min_portfolio_items: parseInt(e.target.value) || 0 })}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Min profile age (days)</span>
            <input
              type="number"
              value={settings.pro_level_min_profile_age_days}
              onChange={(e) => setSettings({ ...settings, pro_level_min_profile_age_days: parseInt(e.target.value) || 0 })}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
          </label>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-brand-purple px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Settings'}
      </button>
    </div>
  );
}
