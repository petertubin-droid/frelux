import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  MapPin,
  Award,
  ShieldCheck,
  Briefcase,
  Globe,
  MessageSquare,
  Flag,
  ChevronLeft,
} from "lucide-react";
import {
  getProProfileBySlug,
  getProProfileServices,
  getProProfileLocations,
  getProPortfolio,
  getProReviews,
  getOrCreateConversation,
  createReport,
  createReview,
} from "@/lib/pro-connect";
import type {
  DbProProfile,
  DbProService,
  DbProLocation,
  DbProPortfolioItem,
  DbProReview,
} from "@/types/pro-connect";
import { useAuth } from "@/lib/auth";
import { classNames } from "@/lib/utils";
import { useSeo } from "@/lib/seo";
import { VerificationBadge } from "@/components/pro-connect/VerificationBadge";
import { getVerificationTier, verificationTierInfo } from "@/types/pro-connect";
import {
  getPublicCredentials,
  fetchProSettings as getProSettings,
} from "@/lib/pro-connect";
import type { DbProCredentialPublic, DbProSettings } from "@/types/pro-connect";

const availabilityConfig = {
  available: {
    label: "Available for work",
    color: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  busy: {
    label: "Currently busy",
    color: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  unavailable: {
    label: "Temporarily unavailable",
    color: "text-muted-foreground dark:text-muted-foreground",
    dot: "bg-muted-foreground/40",
  },
};

export default function ProConnectProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState<DbProProfile | null>(null);
  const [services, setServices] = useState<DbProService[]>([]);
  const [locations, setLocations] = useState<DbProLocation[]>([]);
  const [portfolio, setPortfolio] = useState<DbProPortfolioItem[]>([]);
  const [reviews, setReviews] = useState<DbProReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<DbProCredentialPublic[]>([]);
  const [proSettings, setProSettings] = useState<DbProSettings | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const p = await getProProfileBySlug(slug);
      if (!p) {
        setLoading(false);
        return;
      }
      setProfile(p);
      const [svc, loc, port, rev] = await Promise.all([
        getProProfileServices(p.id),
        getProProfileLocations(p.id),
        getProPortfolio(p.id),
        getProReviews(p.id),
      ]);
      setServices(svc.map((s) => s.service).filter(Boolean) as DbProService[]);
      setLocations(
        loc.map((l) => l.location).filter(Boolean) as DbProLocation[],
      );
      setPortfolio(port);
      setReviews(rev);
      // Load public credentials and settings
      const [creds, settings] = await Promise.all([
        getPublicCredentials(p.id),
        getProSettings(),
      ]);
      setCredentials(creds);
      setProSettings(settings);
      setLoading(false);
    })();
  }, [slug]);

  async function handleMessage() {
    if (!user) {
      navigate("/login?redirect=" + encodeURIComponent(`/pro-connect/${slug}`));
      return;
    }
    if (!profile) return;
    const convo = await getOrCreateConversation(profile.id);
    if (convo) {
      navigate(`/messages/${convo.id}`);
    }
  }

  useSeo({
    title:
      profile?.seo_title ||
      (profile
        ? `${profile.display_name}${profile.business_name ? " — " + profile.business_name : ""} | FRELUX Pro Connect`
        : "Professional Profile | FRELUX Pro Connect"),
    description:
      profile?.seo_description ||
      profile?.bio?.slice(0, 160) ||
      "View this professional's profile on FRELUX Pro Connect — services, portfolio, reviews, and contact information.",
    canonicalPath: profile ? `/pro-connect/${profile.slug}` : "/pro-connect",
    noIndex: false,
    ogType: "profile",
    structuredData: profile
      ? {
          "@context": "https://schema.org",
          "@type": "Person",
          name: profile.business_name || profile.display_name,
          description: profile.bio || undefined,
          ...(profile.verification_status === "verified"
            ? {
                hasCredential: {
                  "@type": "EducationalOccupationalCredential",
                  name: "FRELUX Verified Professional",
                },
              }
            : {}),
          ...(profile.slug
            ? { url: `${window.location.origin}/pro-connect/${profile.slug}` }
            : {}),
        }
      : undefined,
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="h-96 animate-pulse rounded-xl bg-muted dark:bg-card" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground dark:text-primary-foreground">
          Professional not found
        </h1>
        <p className="mt-2 text-muted-foreground dark:text-muted-foreground">
          This profile may have been removed or is no longer available.
        </p>
        <Link
          to="/pro-connect"
          className="mt-6 inline-block text-brand-purple dark:text-brand-purple-lighter"
        >
          ← Back to directory
        </Link>
      </div>
    );
  }

  const avail = availabilityConfig[profile.availability];
  const isOwner = user?.id === profile.user_id;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Back link */}
      <Link
        to="/pro-connect"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-purple dark:text-muted-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to directory
      </Link>

      {/* Header card */}
      <div className="rounded-2xl border border-border bg-card p-6 dark:border-white/5 dark:bg-card">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="relative shrink-0">
            {profile.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt={profile.display_name}
                className="h-24 w-24 rounded-2xl object-cover ring-2 ring-border/50 dark:ring-white/10"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary-light/10 text-3xl font-semibold text-brand-purple dark:text-brand-purple-lighter">
                {profile.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            {getVerificationTier(profile) > 0 && (
              <div className="absolute -bottom-2 -right-2 rounded-full bg-card p-1 dark:bg-card">
                {verificationTierInfo[getVerificationTier(profile)].icon ===
                  "shield" && (
                  <ShieldCheck
                    aria-hidden="true"
                    className="h-6 w-6 text-blue-500"
                  />
                )}
                {verificationTierInfo[getVerificationTier(profile)].icon ===
                  "award" && (
                  <Award
                    aria-hidden="true"
                    className="h-6 w-6 fill-amber-400 text-amber-400"
                  />
                )}
                {verificationTierInfo[getVerificationTier(profile)].icon ===
                  "check" && (
                  <ShieldCheck
                    aria-hidden="true"
                    className="h-6 w-6 text-emerald-500"
                  />
                )}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground dark:text-primary-foreground">
                  {profile.display_name}
                </h1>
                {profile.business_name && (
                  <p className="mt-1 text-muted-foreground dark:text-muted-foreground">
                    {profile.business_name}
                  </p>
                )}
                <div className="mt-2">
                  <VerificationBadge profile={profile} size="md" />
                </div>
              </div>
              {!isOwner && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-muted-foreground dark:hover:bg-white/5"
                  title="Report this profile"
                >
                  <Flag className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Meta */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              {profile.rating_count > 0 && (
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium text-card-foreground dark:text-muted-foreground/60">
                    {profile.rating_avg.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">
                    ({profile.rating_count} reviews)
                  </span>
                </div>
              )}
              <div
                className={classNames("flex items-center gap-1.5", avail.color)}
              >
                <span
                  className={classNames("h-2 w-2 rounded-full", avail.dot)}
                />
                <span className="font-medium">{avail.label}</span>
              </div>
              {profile.years_experience && (
                <div className="flex items-center gap-1.5 text-muted-foreground dark:text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  <span>{profile.years_experience} years experience</span>
                </div>
              )}
              {profile.website_url && (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-brand-purple dark:text-brand-purple-lighter"
                >
                  <Globe aria-hidden="true" className="h-4 w-4" />
                  <span>Website</span>
                </a>
              )}
            </div>

            {/* Location */}
            {locations.length > 0 && (
              <div className="mt-3 flex flex-wrap items-start gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
                <MapPin
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <div className="flex flex-wrap gap-1.5">
                  {locations.slice(0, 5).map((l, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-muted px-2 py-0.5 text-xs dark:bg-white/5"
                    >
                      {[l.area, l.city, l.state].filter(Boolean).join(", ")}
                    </span>
                  ))}
                  {locations.length > 5 && (
                    <span className="text-xs text-muted-foreground">
                      +{locations.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* CTA */}
            {!isOwner && (
              <button
                onClick={handleMessage}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <MessageSquare className="h-4 w-4" />
                Message this professional
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Verification & Trust */}
      {getVerificationTier(profile) > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-6 dark:border-white/5 dark:bg-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground dark:text-primary-foreground">
            Verification
          </h2>
          <div className="flex flex-wrap items-start gap-4">
            {profile.contact_verified_at && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10">
                <ShieldCheck
                  aria-hidden="true"
                  className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                />
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Contact Verified
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                    Email & phone confirmed
                  </p>
                </div>
              </div>
            )}
            {profile.identity_verified_at && (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 dark:bg-blue-500/10">
                <ShieldCheck
                  aria-hidden="true"
                  className="h-4 w-4 text-blue-600 dark:text-blue-400"
                />
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                    FRELUX Verified
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                    Identity & profile reviewed
                  </p>
                </div>
              </div>
            )}
            {profile.pro_level && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-500/10">
                <Award className="h-4 w-4 fill-amber-400 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    FRELUX Pro
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                    Top-rated professional
                  </p>
                </div>
              </div>
            )}
          </div>
          {proSettings?.verification_disclaimer && (
            <p className="mt-4 text-xs text-muted-foreground dark:text-muted-foreground italic">
              {proSettings.verification_disclaimer}
            </p>
          )}
        </section>
      )}

      {/* Credentials (regulated professions) */}
      {credentials.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-foreground dark:text-primary-foreground">
            Professional Credentials
          </h2>
          <div className="space-y-2">
            {credentials.map((cred) => (
              <div
                key={cred.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 dark:border-white/5 dark:bg-card"
              >
                <div>
                  <p className="text-sm font-medium text-foreground dark:text-primary-foreground">
                    {cred.professional_body}
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                    {cred.credential_type}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                  Verified
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* About */}
      {profile.bio && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-foreground dark:text-primary-foreground">
            About
          </h2>
          <p className="whitespace-pre-line text-muted-foreground dark:text-muted-foreground/80">
            {profile.bio}
          </p>
        </section>
      )}

      {/* Services */}
      {services.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-foreground dark:text-primary-foreground">
            Services
          </h2>
          <div className="flex flex-wrap gap-2">
            {services.map((s) => (
              <span
                key={s.id}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-card-foreground dark:border-white/10 dark:bg-card dark:text-muted-foreground/60"
              >
                {s.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Portfolio */}
      {portfolio.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-foreground dark:text-primary-foreground">
            Portfolio
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {portfolio.map((item) =>
              item.image_urls.map((url, i) => (
                <button
                  key={item.id + "-" + i}
                  onClick={() => setActiveImage(url)}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-border dark:border-white/5"
                >
                  <img
                    src={url}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="absolute bottom-2 left-2 right-2 text-left text-xs font-medium text-primary-foreground">
                      {item.title}
                    </p>
                  </div>
                </button>
              )),
            )}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground dark:text-primary-foreground">
            Reviews {profile.rating_count > 0 && `(${profile.rating_count})`}
          </h2>
          {user && !isOwner && (
            <button
              onClick={() => setShowReviewModal(true)}
              className="text-sm font-medium text-brand-purple dark:text-brand-purple-lighter"
            >
              Write a review
            </button>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="rounded-xl border border-border bg-card py-8 text-center text-muted-foreground dark:border-white/5 dark:bg-card dark:text-muted-foreground">
            No reviews yet. Be the first to review this professional.
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-xl border border-border bg-card p-5 dark:border-white/5 dark:bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Award
                        key={s}
                        className={classNames(
                          "h-4 w-4",
                          s <= review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/60 dark:text-card-foreground",
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {review.is_verified_review && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                      <ShieldCheck aria-hidden="true" className="h-3 w-3" />
                      Verified Project Review
                    </span>
                  )}
                </div>
                {review.review_text && (
                  <p className="mt-3 text-sm text-muted-foreground dark:text-muted-foreground/80">
                    {review.review_text}
                  </p>
                )}
                {review.professional_response && (
                  <div className="mt-4 rounded-lg bg-muted/50 p-4 dark:bg-white/5">
                    <p className="mb-1 text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                      Professional's response:
                    </p>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground/80">
                      {review.professional_response}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Image lightbox */}
      {activeImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setActiveImage(null)}
        >
          <img
            src={activeImage}
            alt="Portfolio image"
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}

      {/* Report modal */}
      {showReportModal && profile && (
        <ReportModal
          targetType="profile"
          targetId={profile.id}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* Review modal */}
      {showReviewModal && profile && (
        <ReviewModal
          professionalId={profile.id}
          onClose={() => setShowReviewModal(false)}
          onSubmitted={() => {
            setShowReviewModal(false);
            // Refresh reviews
            (async () => {
              const rev = await getProReviews(profile.id);
              setReviews(rev);
            })();
          }}
        />
      )}
    </div>
  );
}

// -- Report Modal --
function ReportModal({
  targetType,
  targetId,
  onClose,
}: {
  targetType: "profile" | "review" | "message" | "portfolio";
  targetId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reportReasons = [
    "Fake or misleading profile",
    "Inappropriate content",
    "Scam or fraud",
    "Spam",
    "Harassment",
    "Other",
  ];

  async function handleSubmit() {
    setSubmitting(true);
    await createReport({
      report_type: targetType,
      target_id: targetId,
      reason,
      description: description || undefined,
    });
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(onClose, 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card p-6 dark:bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="text-center py-8">
            <p className="text-card-foreground dark:text-muted-foreground/60">
              Report submitted. Our team will review it.
            </p>
          </div>
        ) : (
          <>
            <h3 className="mb-4 text-lg font-semibold text-foreground dark:text-primary-foreground">
              Report this profile
            </h3>
            <div className="space-y-3">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background"
              >
                <option value="">Select a reason</option>
                {reportReasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details (optional)"
                rows={3}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background"
              />
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground dark:border-white/10 dark:text-muted-foreground/80"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason || submitting}
                className="flex-1 rounded-lg bg-red-500 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// -- Review Modal --
function ReviewModal({
  professionalId,
  onClose,
  onSubmitted,
}: {
  professionalId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    const ok = await createReview(
      professionalId,
      rating,
      reviewText || undefined,
    );
    if (ok) {
      onSubmitted();
    } else {
      setError(
        "Unable to submit review. You may have already reviewed this professional.",
      );
    }
    setSubmitting(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card p-6 dark:bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-foreground dark:text-primary-foreground">
          Write a review
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setRating(s)} className="p-1">
                  <Award
                    className={classNames(
                      "h-7 w-7 transition-colors",
                      s <= rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/80 dark:text-muted-foreground",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience working with this professional..."
            rows={4}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground dark:border-white/10 dark:text-muted-foreground/80"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit review"}
          </button>
        </div>
      </div>
    </div>
  );
}
