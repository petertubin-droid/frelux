import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Check, X, Star, Clock, MapPin, Wallet,
  Calendar, Plus, ShieldCheck, MessageSquare, AlertTriangle,
} from 'lucide-react';
import {
  fetchOrder, fetchMilestones, updateMilestone, approveMilestone,
  updateOrderStatus, submitOrderReview, createMilestone,
} from '@/lib/marketplace';
import { useAuth } from '@/lib/auth';
import type { DbMarketplaceOrder, DbMarketplaceMilestone } from '@/types/marketplace';
import { ORDER_STATUS_LABELS, PROJECT_TYPE_LABELS } from '@/types/marketplace';
import { classNames } from '@/lib/utils';
import { useSeo } from '@/lib/seo';

const STATUS_FLOW = ['pending_start', 'in_progress', 'client_review', 'completed'];
const STATUS_COLORS: Record<string, string> = {
  pending_start: 'bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-400',
  in_progress: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  client_review: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  completed: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  disputed: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  cancelled: 'bg-neutral-100 text-neutral-400',
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  useSeo({ description: 'FRELUX marketplace', title: 'Order Details — FRELUX Marketplace', canonicalPath: `/marketplace/orders/${id}` });

  const [order, setOrder] = useState<DbMarketplaceOrder | null>(null);
  const [milestones, setMilestones] = useState<DbMarketplaceMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [o, m] = await Promise.all([fetchOrder(id), fetchMilestones(id)]);
      setOrder(o);
      setMilestones(m);
    } catch {
      navigate('/marketplace');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;

  const isClient = order?.client_id === user.id;
  const isPro = !isClient;
  const canAdvance = order?.status === 'pending_start' || order?.status === 'in_progress';

  async function handleAdvanceStatus() {
    if (!order) return;
    setSubmitting(true);
    try {
      const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1] || 'completed';
      await updateOrderStatus(order.id, nextStatus);
      load();
    } catch { /* ignore */ } finally {
      setSubmitting(false);
    }
  }

  async function handleApproveMilestone(milestoneId: string) {
    await approveMilestone(milestoneId);
    load();
  }

  async function handleUpdateMilestone(milestoneId: string, status: string) {
    await updateMilestone(milestoneId, { status: status as DbMarketplaceMilestone['status'] });
    load();
  }

  async function handleAddMilestone() {
    if (!order || !newMilestoneTitle.trim()) return;
    setSubmitting(true);
    try {
      await createMilestone({
        order_id: order.id,
        title: newMilestoneTitle.trim(),
        sort_order: milestones.length + 1,
      });
      setNewMilestoneTitle('');
      setShowMilestoneForm(false);
      load();
    } catch { /* ignore */ } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitReview() {
    if (!order) return;
    setSubmitting(true);
    try {
      await submitOrderReview(order.id, isClient ? 'client' : 'pro', reviewRating, reviewText);
      setShowReviewForm(false);
      load();
    } catch { /* ignore */ } finally {
      setSubmitting(false);
    }
  }

  if (loading || !order) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-brand-navy">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <button onClick={() => navigate('/marketplace')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-purple dark:text-neutral-400">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Order header */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-white/5 dark:bg-brand-navy-mid">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-neutral-400">{order.order_number}</span>
                <span className={classNames('rounded-md px-2 py-0.5 text-xs font-semibold', STATUS_COLORS[order.status])}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>
              <h1 className="mt-2 text-lg font-bold text-neutral-900 dark:text-white">
                {order.listing?.title || 'Untitled Job'}
              </h1>
              <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                {PROJECT_TYPE_LABELS[order.listing?.project_type || 'painting']}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold text-brand-navy dark:text-white">
                ₦{order.agreed_price.toLocaleString()}
              </p>
              {order.agreed_timeline_days && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  <Calendar className="mr-0.5 inline h-3 w-3" /> {order.agreed_timeline_days} days
                </p>
              )}
            </div>
          </div>

          {/* Participant info */}
          <div className="mt-4 flex items-center gap-3 border-t border-neutral-100 pt-4 dark:border-white/5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-purple/10">
              {order.pro_profile?.profile_image_url ? (
                <img src={order.pro_profile.profile_image_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-brand-purple">
                  {order.pro_profile?.display_name?.charAt(0) ?? '?'}
                </span>
              )}
            </div>
            <div>
              <Link to={`/pro-connect/${order.pro_profile?.slug}`} className="text-sm font-semibold text-neutral-900 hover:text-brand-purple dark:text-white">
                {order.pro_profile?.business_name || order.pro_profile?.display_name}
              </Link>
              {order.pro_profile?.verification_status === 'verified' && (
                <span className="ml-1 inline-flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </span>
              )}
            </div>
            <div className="ml-auto">
              <Link
                to="/pro-connect/messages"
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-brand-purple hover:text-brand-purple dark:border-white/10 dark:text-neutral-300"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Message
              </Link>
            </div>
          </div>

          {/* Payment status */}
          <div className="mt-3 flex items-center gap-2 text-xs">
            <Wallet className="h-3.5 w-3.5 text-neutral-400" />
            <span className="text-neutral-500 dark:text-neutral-400">Payment: </span>
            <span className={classNames(
              'font-semibold capitalize',
              order.payment_status === 'unpaid' ? 'text-neutral-400' : 'text-emerald-600 dark:text-emerald-400'
            )}>
              {order.payment_status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Status advancement */}
        {canAdvance && (isClient || isPro) && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Current status: <span className="font-semibold text-neutral-700 dark:text-white">{ORDER_STATUS_LABELS[order.status]}</span>
            </p>
            <button
              onClick={handleAdvanceStatus}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white hover:bg-brand-purple-dark disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isPro ? 'Mark Progress' : 'Advance Status'}
            </button>
          </div>
        )}

        {/* Milestones */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Milestones ({milestones.length})
            </h2>
            {isPro && canAdvance && (
              <button
                onClick={() => setShowMilestoneForm(!showMilestoneForm)}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-purple"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            )}
          </div>

          {showMilestoneForm && (
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                placeholder="Milestone title..."
                className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
              />
              <button
                onClick={handleAddMilestone}
                disabled={submitting || !newMilestoneTitle.trim()}
                className="rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white hover:bg-brand-purple-dark disabled:opacity-50"
              >
                Add
              </button>
            </div>
          )}

          {milestones.length === 0 ? (
            <p className="rounded-xl border border-neutral-200 bg-white p-4 text-center text-sm text-neutral-400 dark:border-white/5 dark:bg-brand-navy-mid">
              No milestones yet.
            </p>
          ) : (
            <div className="space-y-2">
              {milestones.map((m, idx) => (
                <div
                  key={m.id}
                  className={classNames(
                    'rounded-lg border bg-white p-3 dark:bg-brand-navy-mid',
                    m.status === 'approved' ? 'border-emerald-300 dark:border-emerald-500/30' : 'border-neutral-200 dark:border-white/5'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={classNames(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                        m.status === 'approved' ? 'bg-emerald-500 text-white' :
                        m.status === 'in_progress' ? 'bg-amber-500 text-white' :
                        'bg-neutral-200 text-neutral-500 dark:bg-white/10 dark:text-neutral-400'
                      )}>
                        {m.status === 'approved' ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                      </span>
                      <span className="text-sm font-medium text-neutral-900 dark:text-white">{m.title}</span>
                    </div>
                    {m.status !== 'approved' && m.status !== 'rejected' && (
                      <div className="flex items-center gap-1">
                        {isPro && m.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateMilestone(m.id, 'in_progress')}
                            className="rounded-md border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-600 hover:text-amber-600 dark:border-white/10 dark:text-neutral-300"
                          >
                            Start
                          </button>
                        )}
                        {isClient && m.status === 'in_progress' && (
                          <button
                            onClick={() => handleApproveMilestone(m.id)}
                            className="inline-flex items-center gap-0.5 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700"
                          >
                            <Check className="h-3 w-3" /> Approve
                          </button>
                        )}
                      </div>
                    )}
                    {m.status === 'approved' && (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        ✓ Done
                      </span>
                    )}
                  </div>
                  {m.expected_date && (
                    <p className="mt-1 ml-8 text-[10px] text-neutral-400 dark:text-neutral-500">
                      <Calendar className="mr-0.5 inline h-2.5 w-2.5" />
                      Expected: {new Date(m.expected_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reviews */}
        {order.status === 'completed' && (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Reviews
            </h2>
            <div className="space-y-3">
              {/* Client review */}
              {order.client_rating ? (
                <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Client</span>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={classNames('h-3.5 w-3.5', i < order.client_rating! ? 'fill-amber-400 text-amber-400' : 'text-neutral-300')} />
                    ))}
                  </div>
                  {order.client_review && <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{order.client_review}</p>}
                </div>
              ) : isClient && !showReviewForm ? (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="w-full rounded-lg border border-dashed border-neutral-200 p-4 text-sm font-medium text-neutral-500 hover:border-brand-purple hover:text-brand-purple dark:border-white/10 dark:text-neutral-400"
                >
                  Leave a review for the pro worker
                </button>
              ) : null}

              {/* Pro review */}
              {order.pro_rating && (
                <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Pro Worker</span>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={classNames('h-3.5 w-3.5', i < order.pro_rating! ? 'fill-amber-400 text-amber-400' : 'text-neutral-300')} />
                    ))}
                  </div>
                  {order.pro_review && <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{order.pro_review}</p>}
                </div>
              )}
            </div>

            {/* Review form */}
            {showReviewForm && (
              <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  {isClient ? 'Review the Pro Worker' : 'Review the Client'}
                </h3>
                <div className="mt-2 flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button key={i} onClick={() => setReviewRating(i + 1)}>
                      <Star className={classNames('h-6 w-6 transition-colors', i < reviewRating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300 dark:text-neutral-600')} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your experience..."
                  rows={3}
                  className="mt-3 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleSubmitReview}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white hover:bg-brand-purple-dark disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                    Submit Review
                  </button>
                  <button
                    onClick={() => setShowReviewForm(false)}
                    className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 dark:border-white/10 dark:text-neutral-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dispute button */}
        {(order.status === 'in_progress' || order.status === 'client_review') && (
          <div className="mt-6">
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10">
              <AlertTriangle className="h-4 w-4" /> Report a Problem
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
