import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Users,
  Eye,
  Loader2,
  Send,
  Check,
  X,
  ShieldCheck,
  Briefcase,
  Calendar,
} from "lucide-react";
import {
  fetchListing,
  fetchBidsForListing,
  createBid,
  updateBidStatus,
  incrementListingView,
} from "@/lib/marketplace";
import { useAuth } from "@/lib/auth";
import type {
  DbMarketplaceListing,
  DbMarketplaceBid,
} from "@/types/marketplace";
import {
  PROJECT_TYPE_LABELS,
  LISTING_STATUS_LABELS,
} from "@/types/marketplace";
import { classNames } from "@/lib/utils";
import { useSeo } from "@/lib/seo";
import AdSlot from "@/components/ui/AdSlot";
import { getSafeError } from "@/lib/safeError";
import { Button } from "@/components/ui/shadcn/button";

function formatBudget(
  min: number | null,
  max: number | null,
  currency: string,
) {
  const sym = currency === "NGN" ? "₦" : "";
  if (min && max)
    return `${sym}${min.toLocaleString()} – ${sym}${max.toLocaleString()}`;
  if (min) return `From ${sym}${min.toLocaleString()}`;
  if (max) return `Up to ${sym}${max.toLocaleString()}`;
  return "Budget negotiable";
}

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [listing, setListing] = useState<DbMarketplaceListing | null>(null);
  const [bids, setBids] = useState<DbMarketplaceBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBidForm, setShowBidForm] = useState(false);
  const [bidPrice, setBidPrice] = useState("");
  const [bidTimeline, setBidTimeline] = useState("");
  const [bidMessage, setBidMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [viewIncremented, setViewIncremented] = useState(false);

  useSeo({
    title:
      listing?.seo_title ||
      listing?.title ||
      "Job Details — FRELUX Marketplace",
    description:
      listing?.seo_description ||
      (listing?.description
        ? listing.description.slice(0, 160)
        : "View this construction job listing on FRELUX Marketplace and submit your bid."),
    canonicalPath: `/marketplace/${id}`,
    noIndex: false,
    structuredData: listing
      ? {
          "@context": "https://schema.org",
          "@type": "JobPosting",
          title: listing.title,
          description: listing.description || listing.title,
          datePosted: listing.created_at,
          ...(listing.budget_min
            ? {
                baseSalary: {
                  "@type": "MonetaryAmount",
                  currency: listing.currency,
                  minValue: listing.budget_min,
                  ...(listing.budget_max
                    ? { maxValue: listing.budget_max }
                    : {}),
                },
              }
            : {}),
          ...(listing.location_city || listing.location_state
            ? {
                jobLocation: {
                  "@type": "Place",
                  address: {
                    addressLocality: listing.location_city || "",
                    addressRegion: listing.location_state || "",
                    addressCountry: "NG",
                  },
                },
              }
            : {}),
        }
      : undefined,
  });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [l, b] = await Promise.all([
        fetchListing(id),
        fetchBidsForListing(id),
      ]);
      setListing(l);
      setBids(b);
      if (!viewIncremented) {
        incrementListingView(id).catch(() => {});
        setViewIncremented(true);
      }
    } catch {
      navigate("/marketplace");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, viewIncremented]);

  useEffect(() => {
    load();
  }, [load]);

  const isOwner = listing && user && listing.user_id === user.id;
  const listingStatus = listing?.status;
  const isOpen = listingStatus === "open";

  async function handleBidSubmit() {
    if (!user || !profile) {
      navigate("/pro-connect/register");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      // Get pro profile
      const { supabase } = await import("@/lib/supabase");
      const { data: proProfile } = await supabase
        .from("pro_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!proProfile) {
        navigate("/pro-connect/register");
        return;
      }
      await createBid({
        listing_id: id!,
        pro_profile_id: proProfile.id,
        proposed_price: parseFloat(bidPrice),
        proposed_timeline_days: bidTimeline ? parseInt(bidTimeline) : undefined,
        cover_message: bidMessage,
      });
      setShowBidForm(false);
      setBidPrice("");
      setBidTimeline("");
      setBidMessage("");
      load();
    } catch (e) {
      setError(getSafeError(e, "Failed to submit bid"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAcceptBid(bidId: string) {
    setSubmitting(true);
    try {
      await updateBidStatus(bidId, "accepted");
      load();
    } catch {
      setError("Failed to accept bid");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRejectBid(bidId: string) {
    try {
      await updateBidStatus(bidId, "rejected", "Declined by client");
      load();
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2
          aria-hidden="true"
          className="h-6 w-6 animate-spin text-brand-purple"
        />
      </div>
    );
  }

  if (!listing) return null;

  return (
    <div className="min-h-screen bg-muted/50 dark:bg-background">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Back */}
        <Button variant="ghost"
          onClick={() => navigate("/marketplace")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-purple dark:text-muted-foreground"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to
          Marketplace
        </Button>

        {/* Header card */}
        <div className="rounded-xl border border-border bg-card p-6 dark:border-white/5 dark:bg-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-brand-purple">
                  {PROJECT_TYPE_LABELS[listing.project_type]}
                </span>
                <span
                  className={classNames(
                    "rounded-md px-2 py-1 text-xs font-semibold",
                    isOpen
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground dark:bg-white/5 dark:text-muted-foreground",
                  )}
                >
                  {LISTING_STATUS_LABELS[listing.status]}
                </span>
                {listing.urgency === "urgent" && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                    <Clock aria-hidden="true" className="h-3 w-3" /> Urgent
                  </span>
                )}
              </div>
              <h1 className="mt-3 text-xl font-bold text-foreground dark:text-primary-foreground sm:text-2xl">
                {listing.title}
              </h1>
              {listing.description && (
                <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground/80">
                  {listing.description}
                </p>
              )}
            </div>
          </div>

          {/* Posted by */}
          {listing.client && (
            <div className="mt-4 flex items-center gap-3 border-t border-border/50 pt-4 dark:border-white/5">
              <div className="h-10 w-10 overflow-hidden rounded-full bg-muted dark:bg-white/5">
                {listing.client.avatar_url ? (
                  <img
                    src={listing.client.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-brand-purple">
                    {(listing.client.full_name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                  Posted by
                </p>
                <p className="text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
                  {listing.client.full_name || "Anonymous"}
                </p>
                {listing.client.marketplace_id && (
                  <p className="text-[10px] tracking-wider text-muted-foreground">
                    {listing.client.marketplace_id}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Meta grid */}
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Budget
              </p>
              <p className="text-sm font-bold text-foreground dark:text-primary-foreground">
                {formatBudget(
                  listing.budget_min,
                  listing.budget_max,
                  listing.currency,
                )}
              </p>
            </div>
            {listing.location_state && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Location
                </p>
                <p className="inline-flex items-center gap-1 text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
                  <MapPin aria-hidden="true" className="h-3 w-3" />
                  {[listing.location_city, listing.location_state]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            )}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Bids
              </p>
              <p className="inline-flex items-center gap-1 text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
                <Users aria-hidden="true" className="h-3 w-3" />{" "}
                {listing.bid_count}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Views
              </p>
              <p className="inline-flex items-center gap-1 text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
                <Eye aria-hidden="true" className="h-3 w-3" />{" "}
                {listing.view_count}
              </p>
            </div>
          </div>

          {/* Scope summary if available */}
          {listing.scope_summary &&
            Object.keys(listing.scope_summary).length > 0 && (
              <div className="mt-4 rounded-lg bg-muted/50 p-4 dark:bg-white/5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Project Scope
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(listing.scope_summary).map(([key, val]) => (
                    <span
                      key={key}
                      className="rounded-md bg-card px-2 py-1 text-xs font-medium text-muted-foreground dark:bg-background dark:text-muted-foreground/80"
                    >
                      {key}: {String(val)}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* Owner actions */}
          {isOwner && isOpen && (
            <div className="mt-4 flex gap-2 border-t border-border/50 pt-4 dark:border-white/5">
              <Link
                to={`/marketplace/my-listings`}
                className="text-xs font-medium text-brand-purple hover:text-brand-purple-dark"
              >
                Manage listing →
              </Link>
            </div>
          )}
        </div>

        {/* Bids section */}
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground dark:text-primary-foreground">
              Bids ({bids.length})
            </h2>
            {!isOwner && isOpen && user && (
              <Button variant="ghost"
                onClick={() => setShowBidForm(!showBidForm)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Send aria-hidden="true" className="h-4 w-4" /> Place a Bid
              </Button>
            )}
            {!user && isOpen && (
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Sign in to bid
              </Link>
            )}
          </div>

          {/* Bid form */}
          {showBidForm && (
            <div className="mb-4 rounded-xl border border-border bg-card p-5 dark:border-white/5 dark:bg-card">
              <h3 className="text-sm font-bold text-foreground dark:text-primary-foreground">
                Submit Your Bid
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                    Your Price (₦)
                  </label>
                  <input
                    type="number"
                    value={bidPrice}
                    onChange={(e) => setBidPrice(e.target.value)}
                    placeholder="e.g. 150000"
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                    Timeline (days)
                  </label>
                  <input
                    type="number"
                    value={bidTimeline}
                    onChange={(e) => setBidTimeline(e.target.value)}
                    placeholder="e.g. 7"
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                  Cover Message
                </label>
                <textarea
                  value={bidMessage}
                  onChange={(e) => setBidMessage(e.target.value)}
                  placeholder="Tell the client why you're the right fit for this job..."
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                />
              </div>
              {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
              <div className="mt-3 flex gap-2">
                <Button variant="default"
                  onClick={handleBidSubmit}
                  disabled={submitting || !bidPrice || !bidMessage}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold hover:/90 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                  ) : (
                    <Send aria-hidden="true" className="h-4 w-4" />
                  )}
                  Submit Bid
                </Button>
                <Button variant="ghost"
                  onClick={() => setShowBidForm(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground dark:border-white/10 dark:text-muted-foreground/80"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Bids list */}
          {bids.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center dark:border-white/5 dark:bg-card">
              <Users
                aria-hidden="true"
                className="mx-auto h-8 w-8 text-muted-foreground/80 dark:text-muted-foreground"
              />
              <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                No bids yet. Be the first to bid!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bids.map((bid) => (
                <div
                  key={bid.id}
                  className={classNames(
                    "rounded-xl border bg-card p-4 dark:bg-card",
                    bid.status === "accepted"
                      ? "border-emerald-300 dark:border-emerald-500/30"
                      : "border-border dark:border-white/5",
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Pro info */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        {bid.pro_profile?.profile_image_url ? (
                          <img
                            src={bid.pro_profile.profile_image_url}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-brand-purple">
                            {bid.pro_profile?.display_name?.charAt(0) ?? "?"}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/pro-connect/${bid.pro_profile?.slug}`}
                            className="text-sm font-bold text-foreground hover:text-brand-purple dark:text-primary-foreground"
                          >
                            {bid.pro_profile?.business_name ||
                              bid.pro_profile?.display_name}
                          </Link>
                          {bid.pro_profile?.verification_status ===
                            "verified" && (
                            <ShieldCheck
                              aria-hidden="true"
                              className="h-4 w-4 text-emerald-500"
                            />
                          )}
                        </div>
                        {bid.pro_profile && (
                          <div className="flex items-center gap-3 text-xs text-muted-foreground dark:text-muted-foreground">
                            {bid.pro_profile.rating_avg > 0 && (
                              <span className="inline-flex items-center gap-0.5">
                                <span className="text-amber-400 text-xs">
                                  ★
                                </span>
                                {bid.pro_profile.rating_avg.toFixed(1)} (
                                {bid.pro_profile.rating_count})
                              </span>
                            )}
                            <span className="inline-flex items-center gap-0.5">
                              <Briefcase className="h-3 w-3" />{" "}
                              {bid.pro_profile.project_count} projects
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-left sm:text-right">
                      <p className="text-lg font-extrabold text-foreground dark:text-primary-foreground">
                        ₦{bid.proposed_price.toLocaleString()}
                      </p>
                      {bid.proposed_timeline_days && (
                        <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                          <Calendar
                            aria-hidden="true"
                            className="mr-0.5 inline h-3 w-3"
                          />{" "}
                          {bid.proposed_timeline_days} days
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Cover message */}
                  {bid.cover_message && (
                    <p className="mt-3 text-sm text-muted-foreground dark:text-muted-foreground/80">
                      {bid.cover_message}
                    </p>
                  )}

                  {/* Status / actions */}
                  <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3 dark:border-white/5">
                    {bid.status === "accepted" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <Check aria-hidden="true" className="h-4 w-4" />{" "}
                        Accepted
                      </span>
                    ) : bid.status === "rejected" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                        <X aria-hidden="true" className="h-4 w-4" /> Rejected
                      </span>
                    ) : bid.status === "withdrawn" ? (
                      <span className="text-xs font-semibold text-muted-foreground">
                        Withdrawn
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                        Pending ·{" "}
                        {new Date(bid.created_at).toLocaleDateString()}
                      </span>
                    )}

                    {isOwner && isOpen && bid.status === "pending" && (
                      <div className="flex gap-2">
                        <Button variant="ghost"
                          onClick={() => handleRejectBid(bid.id)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-red-300 hover:text-red-500 dark:border-white/10 dark:text-muted-foreground/80"
                        >
                          Decline
                        </Button>
                        <Button variant="ghost"
                          onClick={() => handleAcceptBid(bid.id)}
                          disabled={submitting}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <Check aria-hidden="true" className="h-3.5 w-3.5" />{" "}
                          Accept
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <AdSlot slotKey="marketplace_sidebar" className="mt-8" />
    </div>
  );
}
