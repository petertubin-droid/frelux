import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ThumbsUp, Eye, Plus, Trash2, Briefcase, MapPin, Settings, Hash } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  getMyProProfile, getProProfileServices, getProProfileLocations,
  getProPortfolio, getProReviews, addPortfolioItem, deletePortfolioItem,
} from '@/lib/pro-connect';
import type { DbProProfile, DbProService, DbProLocation, DbProPortfolioItem, DbProReview, DbProConversation } from '@/types/pro-connect';
import { supabase } from '@/lib/supabase';
import { classNames } from '@/lib/utils';
import {
  checkProLevelEligibility,
} from '@/lib/pro-connect';
import type { DbProVerificationRequest } from '@/types/pro-connect';

export default function ProConnectDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<DbProProfile | null>(null);
  const [services, setServices] = useState<DbProService[]>([]);
  const [locations, setLocations] = useState<DbProLocation[]>([]);
  const [portfolio, setPortfolio] = useState<DbProPortfolioItem[]>([]);
  const [reviews, setReviews] = useState<DbProReview[]>([]);
  const [conversations, setConversations] = useState<DbProConversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [verificationRequests, setVerificationRequests] = useState<DbProVerificationRequest[]>([]);
  const [proLevelEligible, setProLevelEligible] = useState(false);
  const [showVerificationForm, setShowVerificationForm] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const p = await getMyProProfile(user.id);
      if (!p) {
        setLoading(false);
        return;
      }
      setProfile(p);
      const [svc, loc, port, rev, convos, unread] = await Promise.all([
        getProProfileServices(p.id),
        getProProfileLocations(p.id),
        getProPortfolio(p.id),
        getProReviews(p.id),
        getMyConversations(),
        getUnreadCount(),
      ]);
      setServices(svc.map((s) => s.service).filter(Boolean) as DbProService[]);
      setLocations(loc.map((l) => l.location).filter(Boolean) as DbProLocation[]);
      setPortfolio(port);
      setReviews(rev);
      setConversations(convos);
      setUnreadCount(unread);
      const [verifReqs, eligible] = await Promise.all([
        getMyVerificationRequests(p.id),
        checkProLevelEligibility(p.id),
      ]);
      setVerificationRequests(verifReqs);
      setProLevelEligible(eligible);
      setLoading(false);
    })();
  }, [user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Sign in to access your dashboard</h1>
        <Link to="/login?redirect=/pro-connect/dashboard" className="mt-4 inline-block text-brand-purple dark:text-brand-purple-lighter">Sign in</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="h-32 animate-pulse rounded-xl bg-neutral-100 dark:bg-brand-navy-mid" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">No professional profile found</h1>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400">Create your professional profile to get started.</p>
        <Link to="/pro-connect/register" className="mt-6 inline-block rounded-lg bg-brand-purple px-6 py-3 text-sm font-semibold text-white">
          Create Professional Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Quick Links */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link to="/worker-channels" className="inline-flex items-center gap-1.5 rounded-lg border border-brand-purple/20 bg-brand-purple/5 px-3 py-1.5 text-sm font-medium text-brand-purple transition-colors hover:bg-brand-purple/10">
          <Hash className="h-4 w-4" />
          Worker Channels
        </Link>
        <Link to="/messages" className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5">
          <MessageSquare className="h-4 w-4" />
          Messages
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Professional Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Manage your profile, portfolio, and conversations</p>
        </div>
        <Link
          to={`/pro-connect/${profile.slug}`}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 dark:border-white/10 dark:text-neutral-200"
        >
          <Eye className="h-4 w-4" />
          View public profile
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid">
          <div className="flex items-center gap-2 text-neutral-400 dark:text-neutral-500">
            <ThumbsUp className="h-4 w-4" />
            <span className="text-xs">Rating</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">
            {profile.rating_avg.toFixed(1)}
          </p>
          <p className="text-xs text-neutral-400">{profile.rating_count} reviews</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid">
          <div className="flex items-center gap-2 text-neutral-400 dark:text-neutral-500">
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs">Messages</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">
            {unreadCount > 0 ? unreadCount : conversations.length}
          </p>
          <p className="text-xs text-neutral-400">{unreadCount > 0 ? 'unread' : 'conversations'}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid">
          <div className="flex items-center gap-2 text-neutral-400 dark:text-neutral-500">
            <Eye className="h-4 w-4" />
            <span className="text-xs">Listed</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">
            {profile.is_listed ? 'Yes' : 'No'}
          </p>
          <p className="text-xs text-neutral-400 capitalize">{profile.verification_status}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid">
          <div className="flex items-center gap-2 text-neutral-400 dark:text-neutral-500">
            <Briefcase className="h-4 w-4" />
            <span className="text-xs">Experience</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">
            {profile.years_experience || 0} yrs
          </p>
          <p className="text-xs text-neutral-400">{portfolio.length} portfolio items</p>
        </div>
      </div>

      {/* Profile status */}
      <div className="mb-8 rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/5 dark:bg-brand-navy-mid">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">{profile.display_name}</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{profile.business_name || 'No business name set'}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={classNames(
                'rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                profile.availability === 'available'
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : profile.availability === 'busy'
                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                    : 'bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-400'
              )}>
                {profile.availability}
              </span>
              {profile.verification_status === 'verified' && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  Verified
                </span>
              )}
            </div>
          </div>
          <Link
            to="/pro-connect/register"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-600 hover:border-brand-purple hover:text-brand-purple dark:border-white/10 dark:text-neutral-300"
          >
            <Settings className="h-4 w-4" />
            Edit Profile
          </Link>
        </div>

        {/* Services */}
        {services.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">Services</p>
            <div className="flex flex-wrap gap-1.5">
              {services.map((s) => (
                <span key={s.id} className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-white/5 dark:text-neutral-300">
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Locations */}
        {locations.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">Service Areas</p>
            <div className="flex flex-wrap gap-1.5">
              {locations.map((l, i) => (
                <span key={i} className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-white/5 dark:text-neutral-300">
                  <MapPin className="mr-1 inline h-3 w-3" />
                  {[l.area, l.city, l.state].filter(Boolean).join(', ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>


      {/* Verification Status */}
      <div className="mb-8 rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/5 dark:bg-brand-navy-mid">
        <h2 className="mb-4 text-base font-semibold text-neutral-900 dark:text-white">Verification Status</h2>
        <div className="flex flex-wrap items-start gap-4">
          {/* Contact Verified */}
          <div className={classNames(
            'flex items-center gap-2 rounded-lg px-3 py-2',
            profile.contact_verified_at
              ? 'bg-emerald-50 dark:bg-emerald-500/10'
              : 'bg-neutral-50 dark:bg-white/5'
          )}>
            <div className={classNames(
              'flex h-8 w-8 items-center justify-center rounded-full',
              profile.contact_verified_at ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-neutral-200 text-neutral-400 dark:bg-white/5'
            )}>
              <span className="text-xs font-bold">{profile.contact_verified_at ? '✓' : '1'}</span>
            </div>
            <div>
              <p className={classNames('text-sm font-medium', profile.contact_verified_at ? 'text-emerald-700 dark:text-emerald-400' : 'text-neutral-500 dark:text-neutral-400')}>
                Contact Verified
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                {profile.contact_verified_at ? 'Verified ' + new Date(profile.contact_verified_at).toLocaleDateString('en-GB') : 'Email & phone confirmation'}
              </p>
            </div>
          </div>

          {/* FRELUX Verified */}
          <div className={classNames(
            'flex items-center gap-2 rounded-lg px-3 py-2',
            profile.identity_verified_at
              ? 'bg-blue-50 dark:bg-blue-500/10'
              : 'bg-neutral-50 dark:bg-white/5'
          )}>
            <div className={classNames(
              'flex h-8 w-8 items-center justify-center rounded-full',
              profile.identity_verified_at ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-neutral-200 text-neutral-400 dark:bg-white/5'
            )}>
              <span className="text-xs font-bold">{profile.identity_verified_at ? '✓' : '2'}</span>
            </div>
            <div>
              <p className={classNames('text-sm font-medium', profile.identity_verified_at ? 'text-blue-700 dark:text-blue-400' : 'text-neutral-500 dark:text-neutral-400')}>
                FRELUX Verified
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                {profile.identity_verified_at ? 'Identity verified' : 'Identity & profile review'}
              </p>
            </div>
          </div>

          {/* FRELUX Pro */}
          <div className={classNames(
            'flex items-center gap-2 rounded-lg px-3 py-2',
            profile.pro_level
              ? 'bg-amber-50 dark:bg-amber-500/10'
              : 'bg-neutral-50 dark:bg-white/5'
          )}>
            <div className={classNames(
              'flex h-8 w-8 items-center justify-center rounded-full',
              profile.pro_level ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-neutral-200 text-neutral-400 dark:bg-white/5'
            )}>
              <span className="text-xs font-bold">{profile.pro_level ? '✓' : '3'}</span>
            </div>
            <div>
              <p className={classNames('text-sm font-medium', profile.pro_level ? 'text-amber-700 dark:text-amber-400' : 'text-neutral-500 dark:text-neutral-400')}>
                FRELUX Pro
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                {profile.pro_level ? 'Top professional' : proLevelEligible ? 'Eligible — contact admin' : 'Build your reputation'}
              </p>
            </div>
          </div>
        </div>

        {/* Verification status message */}
        <div className="mt-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Status: <span className={classNames(
              'font-medium capitalize',
              profile.verification_status === 'verified' ? 'text-emerald-600 dark:text-emerald-400' :
              profile.verification_status === 'pending' ? 'text-amber-600 dark:text-amber-400' :
              profile.verification_status === 'rejected' ? 'text-red-600 dark:text-red-400' :
              profile.verification_status === 'more_info' ? 'text-blue-600 dark:text-blue-400' :
              profile.verification_status === 'suspended' ? 'text-red-600 dark:text-red-400' :
              'text-neutral-500'
            )}>{profile.verification_status.replace('_', ' ')}</span>
          </p>
          {profile.verification_status === 'more_info' && verificationRequests[0]?.more_info_request && (
            <div className="mt-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-500/10">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                <strong>Action needed:</strong> {verificationRequests[0].more_info_request}
              </p>
            </div>
          )}
          {profile.verification_status === 'rejected' && verificationRequests[0]?.rejection_reason && (
            <div className="mt-2 rounded-lg bg-red-50 p-3 dark:bg-red-500/10">
              <p className="text-sm text-red-700 dark:text-red-400">
                <strong>Reason:</strong> {verificationRequests[0].rejection_reason}
              </p>
            </div>
          )}
        </div>

        {/* Request verification button */}
        {(profile.verification_status === 'unverified' || profile.verification_status === 'rejected' || profile.verification_status === 'more_info') && (
          <button
            onClick={() => setShowVerificationForm(!showVerificationForm)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-purple px-4 py-2.5 text-sm font-semibold text-white"
          >
            Request Verification
          </button>
        )}
      </div>

      {/* Portfolio management */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Portfolio</h2>
          <button
            onClick={() => setShowPortfolioForm(!showPortfolioForm)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-purple px-3 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>

        {showPortfolioForm && (
          <PortfolioForm
            profileId={profile.id}
            onAdded={() => {
              setShowPortfolioForm(false);
              (async () => {
                const port = await getProPortfolio(profile.id);
                setPortfolio(port);
              })();
            }}
          />
        )}

        {portfolio.length === 0 ? (
          <p className="rounded-xl border border-neutral-200 bg-white py-8 text-center text-sm text-neutral-400 dark:border-white/5 dark:bg-brand-navy-mid dark:text-neutral-500">
            No portfolio items yet. Add your first project to showcase your work.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:grid-cols-3">
            {portfolio.map((item) => (
              <div key={item.id} className="group relative overflow-hidden rounded-xl border border-neutral-200 dark:border-white/5">
                {item.image_urls[0] && (
                  <img src={item.image_urls[0]} alt={item.title} className="aspect-square w-full object-cover" />
                )}
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{item.title}</p>
                  <p className="truncate text-xs text-neutral-400">{item.category}</p>
                </div>
                <button
                  onClick={async () => {
                    await deletePortfolioItem(item.id);
                    const port = await getProPortfolio(profile.id);
                    setPortfolio(port);
                  }}
                  className="absolute right-2 top-2 rounded-lg bg-white/80 p-1.5 text-red-500 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-brand-navy/80"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent conversations */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">Recent Conversations</h2>
        {conversations.length === 0 ? (
          <p className="rounded-xl border border-neutral-200 bg-white py-8 text-center text-sm text-neutral-400 dark:border-white/5 dark:bg-brand-navy-mid dark:text-neutral-500">
            No conversations yet. When customers message you, they'll appear here.
          </p>
        ) : (
          <div className="space-y-2">
            {conversations.slice(0, 5).map((convo) => (
              <Link
                key={convo.id}
                to={`/messages/${convo.id}`}
                className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-brand-purple/30 dark:border-white/5 dark:bg-brand-navy-mid"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    {convo.professional?.display_name || 'Customer'}
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">
                    {convo.last_message_at ? new Date(convo.last_message_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'No messages yet'}
                  </p>
                </div>
                <MessageSquare className="h-5 w-5 text-neutral-400" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Reviews */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">Reviews About You</h2>
        {reviews.length === 0 ? (
          <p className="rounded-xl border border-neutral-200 bg-white py-8 text-center text-sm text-neutral-400 dark:border-white/5 dark:bg-brand-navy-mid dark:text-neutral-500">
            No reviews yet. Reviews appear after customers work with you.
          </p>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className={s <= review.rating ? 'text-amber-400' : 'text-neutral-200 dark:text-neutral-700'}>●</span>
                  ))}
                  <span className="text-xs text-neutral-400">{new Date(review.created_at).toLocaleDateString('en-GB')}</span>
                </div>
                {review.review_text && <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{review.review_text}</p>}
                {!review.professional_response && (
                  <button
                    onClick={() => {
                      const response = prompt('Type your response:');
                      if (response) {
                        (async () => {
                          const { respondToReview } = await import('@/lib/pro-connect');
                          await respondToReview(review.id, response);
                          const rev = await getProReviews(profile.id);
                          setReviews(rev);
                        })();
                      }
                    }}
                    className="mt-2 text-xs text-brand-purple dark:text-brand-purple-lighter"
                  >
                    Respond to this review
                  </button>
                )}
                {review.professional_response && (
                  <div className="mt-3 rounded-lg bg-neutral-50 p-3 dark:bg-white/5">
                    <p className="text-xs text-neutral-400">Your response:</p>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{review.professional_response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// -- Portfolio form --
function PortfolioForm({ profileId, onAdded }: { profileId: string; onAdded: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleUpload(file: File) {
    if (!file) return;
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
    const filePath = `${profileId}/${fileName}`;

    const { error } = await supabase.storage
      .from('pro-portfolio')
      .upload(filePath, file);

    if (!error) {
      const { data } = supabase.storage.from('pro-portfolio').getPublicUrl(filePath);
      setImageUrls([...imageUrls, data.publicUrl]);
    } else {
      if (import.meta.env.DEV) console.error('Upload error:', error.message);
    }
    setUploading(false);
  }

  async function handleSubmit() {
    if (!title.trim() || imageUrls.length === 0) return;
    setSaving(true);
    await addPortfolioItem(profileId, {
      title,
      description: description || undefined,
      category: category || undefined,
      image_urls: imageUrls,
    });
    setSaving(false);
    setTitle('');
    setDescription('');
    setCategory('');
    setImageUrls([]);
    onAdded();
  }

  return (
    <div className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-white/5 dark:bg-white/5">
      <div className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Project title *"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Project description"
          rows={2}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
        />
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category (e.g. Painting, Tiling)"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
        />
        <div>
          <label className="block">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  Array.from(e.target.files).forEach(handleUpload);
                }
              }}
              className="hidden"
            />
            <span className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">
              <Plus className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload images'}
            </span>
          </label>
          {imageUrls.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {imageUrls.map((url, i) => (
                <img key={i} src={url} alt="Preview" className="h-16 w-16 rounded-lg object-cover" />
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || imageUrls.length === 0 || saving}
          className="w-full rounded-lg bg-brand-purple py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Add to portfolio'}
        </button>
      </div>
    </div>
  );
}
