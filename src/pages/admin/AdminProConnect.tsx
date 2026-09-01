import { useEffect, useState, useCallback } from "react";
import { AdminModal } from "@/components/admin/AdminModal";
import { supabase } from "@/lib/supabase";
import {
  Ban,
  Eye,
  Search,
  Check,
  X,
  FileWarning,
  Award,
  Shield,
  Phone,
  KeyRound,
  AlertCircle,
  Hash,
  Bot,
  Plus,
  Trash2,
  Save,
  FileText,
} from "lucide-react";
import {
  AdminButton,
  AdminIconButton,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  AdminTabButton,
} from "@/components/admin/AdminUi";
import type {
  DbProProfile,
  DbProReport,
  DbProVerificationRequest,
  DbProSettings,
  DbProVerificationDocument,
} from "@/types/pro-connect";
import { classNames } from "@/lib/utils";
import {
  adminApproveVerification,
  adminRejectVerification,
  adminRequestMoreInfo,
  adminSuspendVerification,
  adminReinstateVerification,
  adminAwardProLevel,
  adminRevokeProLevel,
  getAllVerificationRequests,
  fetchProSettings,
  updateProSettings,
  getAdminVerificationDocuments,
  createAdminSignedUrlForDocument,
} from "@/lib/pro-connect";
import {
  adminGetNinSubmissions,
  adminApproveNin,
  adminRejectNin,
  fetchChannelCategories,
  fetchChannels,
  type NinSubmission,
} from "@/lib/worker-channels";
import type {
  DbWorkerChannel,
  DbWorkerChannelCategory,
  DbWorkerModerationConfig,
} from "@/types/worker-channels";

type Tab =
  | "professionals"
  | "verification"
  | "kyc"
  | "reports"
  | "reviews"
  | "channels"
  | "moderation"
  | "settings";

export default function AdminProConnect() {
  const [tab, setTab] = useState<Tab>("professionals");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-neutral-900 dark:text-white">
        Pro Connect Management
      </h1>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-neutral-200 dark:border-white/10">
        {(
          [
            ["professionals", "Professionals"],
            ["verification", "Verification"],
            ["kyc", "KYC / NIN"],
            ["reports", "Reports"],
            ["reviews", "Reviews"],
            ["channels", "Channels"],
            ["moderation", "Moderation"],
            ["settings", "Settings"],
          ] as const
        ).map(([key, label]) => (
          <AdminTabButton
            key={key}
            active={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
          </AdminTabButton>
        ))}
      </div>

      {tab === "professionals" && <AdminProfessionalsTab />}
      {tab === "verification" && <AdminVerificationTab />}
      {tab === "kyc" && <AdminKycTab />}
      {tab === "reports" && <AdminReportsTab />}
      {tab === "reviews" && <AdminReviewsTab />}
      {tab === "channels" && <AdminChannelsTab />}
      {tab === "moderation" && <AdminModerationTab />}
      {tab === "settings" && <AdminSettingsTab />}
    </div>
  );
}

// =========================================================
// PROFESSIONALS TAB
// =========================================================
function AdminProfessionalsTab() {
  const [profiles, setProfiles] = useState<DbProProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pro_profiles")
      .select("*")
      .order("created_at DESC");
    setProfiles((data || []) as DbProProfile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  async function updateVerification(
    profileId: string,
    status: "unverified" | "pending" | "verified" | "suspended",
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("pro_profiles")
      .update({ verification_status: status })
      .eq("id", profileId);
    await supabase
      .from("pro_verification_logs")
      .insert({ profile_id: profileId, admin_id: user.id, new_status: status });
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

  const filtered = profiles.filter(
    (p) =>
      !search ||
      p.display_name.toLowerCase().includes(search.toLowerCase()) ||
      p.business_name?.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg bg-neutral-100 dark:bg-white/5"
          />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <p className="rounded-lg border border-neutral-200 py-8 text-center text-sm text-neutral-400 dark:border-white/5 dark:text-neutral-500">
        No professionals found.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500"
          />
          <AdminInput
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
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-purple/10 text-sm font-medium text-brand-purple dark:text-brand-purple-lighter">
                {p.display_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  {p.display_name}
                </p>
                <p className="text-xs text-neutral-500">
                  {p.business_name || "No business"} · {p.rating_avg.toFixed(1)}{" "}
                  / 5 ({p.rating_count})
                  {p.pro_level && (
                    <span className="ml-2 text-amber-500">• FRELUX Pro</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={classNames(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                  p.verification_status === "verified"
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : p.verification_status === "pending"
                      ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                      : p.verification_status === "rejected"
                        ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                        : p.verification_status === "more_info"
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                          : p.verification_status === "suspended"
                            ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                            : "bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-500",
                )}
              >
                {p.verification_status.replace("_", " ")}
              </span>
              <AdminSelect
                value={p.verification_status}
                onChange={(e) =>
                  updateVerification(
                    p.id,
                    e.target.value as
                      "unverified" | "pending" | "verified" | "suspended",
                  )
                }
                className="rounded-lg border border-neutral-200 px-2 py-1 text-xs dark:border-white/10 dark:bg-brand-navy"
              >
                <option value="unverified">Unverified</option>
                <option value="pending">Pending</option>
                <option value="verified">Verify</option>
                <option value="suspended">Suspend</option>
              </AdminSelect>
              {!p.pro_level ? (
                <AdminIconButton
                  variant="ghost"
                  onClick={() => handleAwardProLevel(p.id)}
                  title="Award FRELUX Pro"
                  className="rounded-lg p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                >
                  <Award aria-hidden="true" className="h-4 w-4" />
                </AdminIconButton>
              ) : (
                <AdminIconButton
                  variant="danger"
                  onClick={() => handleRevokeProLevel(p.id)}
                  title="Revoke FRELUX Pro"
                  className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <Ban aria-hidden="true" className="h-4 w-4" />
                </AdminIconButton>
              )}
              <a
                href={`/pro-connect/${p.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-1.5 text-neutral-500 hover:text-brand-purple"
              >
                <Eye aria-hidden="true" className="h-4 w-4" />
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
  const [filter, setFilter] = useState<string>("pending");
  const [selectedRequest, setSelectedRequest] =
    useState<DbProVerificationRequest | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [moreInfoText, setMoreInfoText] = useState("");
  const [_viewingDocs, setViewingDocs] =
    useState<DbProVerificationRequest | null>(null);
  const [_documents, setDocuments] = useState<DbProVerificationDocument[]>([]);
  const [_docsLoading, setDocsLoading] = useState(false);
  const [_signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getAllVerificationRequests(
      filter === "all" ? undefined : filter,
    );
    setRequests(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(profileId: string, requestId: string) {
    await adminApproveVerification(
      profileId,
      requestId,
      actionNotes || undefined,
    );
    setActionNotes("");
    setSelectedRequest(null);
    load();
  }

  async function handleReject(profileId: string, requestId: string) {
    await adminRejectVerification(
      profileId,
      requestId,
      rejectionReason || undefined,
      actionNotes || undefined,
    );
    setRejectionReason("");
    setActionNotes("");
    setSelectedRequest(null);
    load();
  }

  async function handleMoreInfo(profileId: string, requestId: string) {
    await adminRequestMoreInfo(
      profileId,
      requestId,
      moreInfoText,
      actionNotes || undefined,
    );
    setMoreInfoText("");
    setActionNotes("");
    setSelectedRequest(null);
    load();
  }

  async function handleSuspend(profileId: string) {
    await adminSuspendVerification(profileId, actionNotes || undefined);
    setActionNotes("");
    setSelectedRequest(null);
    load();
  }

  async function handleReinstate(profileId: string) {
    await adminReinstateVerification(profileId, actionNotes || undefined);
    setActionNotes("");
    setSelectedRequest(null);
    load();
  }

  async function handleViewDocs(req: DbProVerificationRequest) {
    setViewingDocs(req);
    setDocsLoading(true);
    setSignedUrls({});
    const docs = await getAdminVerificationDocuments(req.profile_id);
    setDocuments(docs);
    // Create signed URLs for each document
    const urls: Record<string, string> = {};
    for (const doc of docs) {
      const url = await createAdminSignedUrlForDocument(doc.storage_path);
      if (url) urls[doc.id] = url;
    }
    setSignedUrls(urls);
    setDocsLoading(false);
  }

  return (
    <div>
      {/* Filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {["pending", "approved", "rejected", "more_info", "all"].map((f) => (
          <AdminButton
            key={f}
            onClick={() => setFilter(f)}
            className={classNames(
              "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
              filter === f
                ? "bg-brand-purple text-white"
                : "bg-neutral-100 text-neutral-500 hover:text-neutral-700 dark:bg-white/5 dark:text-neutral-500",
            )}
          >
            {f.replace("_", " ")}
          </AdminButton>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg bg-neutral-100 dark:bg-white/5"
            />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <p className="rounded-lg border border-neutral-200 py-8 text-center text-sm text-neutral-400 dark:border-white/5 dark:text-neutral-500">
          No verification requests found.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {requests.map((req) => {
            const profile = (
              req as unknown as {
                profile?: {
                  display_name: string;
                  slug: string;
                  business_name: string | null;
                };
              }
            ).profile;
            return (
              <div
                key={req.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={classNames(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          req.request_type === "identity"
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                            : req.request_type === "contact"
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
                        )}
                      >
                        {req.request_type}
                      </span>
                      <span
                        className={classNames(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          req.status === "pending"
                            ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                            : req.status === "approved"
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : req.status === "rejected"
                                ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                                : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
                        )}
                      >
                        {req.status.replace("_", " ")}
                      </span>
                    </div>
                    {profile && (
                      <p className="mt-2 text-sm font-medium text-neutral-900 dark:text-white">
                        {profile.display_name}{" "}
                        {profile.business_name && `· ${profile.business_name}`}
                      </p>
                    )}
                    {req.professional_name && (
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                        Name: {req.professional_name}
                      </p>
                    )}
                    {req.identity_document_type && (
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                        ID Type:{" "}
                        <span className="capitalize">
                          {req.identity_document_type.replace(/_/g, " ")}
                        </span>
                      </p>
                    )}
                    {req.years_experience != null && (
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                        Experience: {req.years_experience} years
                      </p>
                    )}
                    <p className="mt-1 text-xs text-neutral-500">
                      Submitted:{" "}
                      {new Date(req.submitted_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    {req.admin_notes && (
                      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
                        Admin notes: {req.admin_notes}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {profile && (
                      <a
                        href={`/pro-connect/${profile.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-1.5 text-neutral-500 hover:text-brand-purple"
                        title="View profile"
                      >
                        <Eye aria-hidden="true" className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => handleViewDocs(req)}
                      className="rounded-lg p-1.5 text-neutral-500 hover:text-brand-purple"
                      title="View verification documents"
                    >
                      <FileText aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Actions */}
                {req.status === "pending" && (
                  <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-white/5">
                    {selectedRequest?.id === req.id ? (
                      <div className="space-y-3">
                        <AdminInput
                          type="text"
                          value={actionNotes}
                          onChange={(e) => setActionNotes(e.target.value)}
                          placeholder="Admin notes (optional)"
                          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-white/10 dark:bg-brand-navy"
                        />
                        <AdminInput
                          type="text"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Rejection reason (if rejecting)"
                          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-white/10 dark:bg-brand-navy"
                        />
                        <AdminInput
                          type="text"
                          value={moreInfoText}
                          onChange={(e) => setMoreInfoText(e.target.value)}
                          placeholder="What additional info is needed? (if requesting more info)"
                          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-white/10 dark:bg-brand-navy"
                        />
                        <div className="flex flex-wrap gap-2">
                          <AdminButton
                            variant="success"
                            onClick={() =>
                              handleApprove(req.profile_id, req.id)
                            }
                            className="text-xs"
                          >
                            <Check
                              aria-hidden="true"
                              className="mr-1 inline h-3.5 w-3.5"
                            />
                            Approve
                          </AdminButton>
                          <AdminButton
                            variant="danger"
                            onClick={() => handleReject(req.profile_id, req.id)}
                            className="text-xs bg-red-500 border-red-500 text-white hover:bg-red-600"
                          >
                            <X className="mr-1 inline h-3.5 w-3.5" />
                            Reject
                          </AdminButton>
                          <AdminButton
                            variant="secondary"
                            onClick={() =>
                              handleMoreInfo(req.profile_id, req.id)
                            }
                            className="text-xs text-blue-600 dark:text-blue-400"
                          >
                            <FileWarning
                              aria-hidden="true"
                              className="mr-1 inline h-3.5 w-3.5"
                            />
                            Request Info
                          </AdminButton>
                          <AdminButton
                            variant="secondary"
                            onClick={() => setSelectedRequest(null)}
                            className="text-xs"
                          >
                            Cancel
                          </AdminButton>
                        </div>
                      </div>
                    ) : (
                      <AdminButton
                        variant="link"
                        onClick={() => {
                          setSelectedRequest(req);
                          setActionNotes("");
                          setRejectionReason("");
                          setMoreInfoText("");
                        }}
                        className="text-sm font-medium"
                      >
                        Review Request →
                      </AdminButton>
                    )}
                  </div>
                )}

                {/* Reinstation/Suspension for non-pending */}
                {req.status === "approved" && (
                  <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-white/5">
                    <AdminButton
                      variant="danger"
                      onClick={() => handleSuspend(req.profile_id)}
                      className="text-xs"
                    >
                      Suspend Verification
                    </AdminButton>
                  </div>
                )}
                {req.status === "rejected" && (
                  <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-white/5">
                    <AdminButton
                      variant="success"
                      onClick={() => handleReinstate(req.profile_id)}
                      className="text-xs bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 hover:bg-emerald-100"
                    >
                      Reinstate
                    </AdminButton>
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
// KYC / NIN TAB
// =========================================================
function AdminKycTab() {
  const [submissions, setSubmissions] = useState<NinSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [selectedNin, setSelectedNin] = useState<NinSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [resultMsg, setResultMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await adminGetNinSubmissions(filter);
    setSubmissions(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(profileId: string) {
    setProcessing(true);
    setResultMsg("");
    const result = await adminApproveNin(profileId);
    setProcessing(false);
    if (result.success) {
      setResultMsg("NIN approved — worker auto-verified to Tier 2!");
      setSelectedNin(null);
      load();
    } else {
      setResultMsg("Error: " + result.message);
    }
  }

  async function handleReject(profileId: string) {
    if (!rejectReason.trim()) return;
    setProcessing(true);
    setResultMsg("");
    const result = await adminRejectNin(profileId, rejectReason.trim());
    setProcessing(false);
    if (result.success) {
      setResultMsg("NIN rejected");
      setRejectReason("");
      setSelectedNin(null);
      load();
    } else {
      setResultMsg("Error: " + result.message);
    }
  }

  return (
    <div>
      {/* Info banner */}
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-brand-purple/20 bg-brand-purple/5 p-4 text-sm">
        <Shield
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-brand-purple"
        />
        <div>
          <p className="font-medium text-brand-navy dark:text-white">
            NIN Verification Review
          </p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-300">
            Review NIN submissions from workers. Approving auto-verifies them to
            Tier 2 (FRELUX Verified) and logs the NIN with a profile snapshot
            for future reference in case of reports.
          </p>
        </div>
      </div>

      {resultMsg && (
        <div
          className={`mb-4 rounded-lg p-3 text-sm ${resultMsg.startsWith("Error") ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"}`}
        >
          {resultMsg}
        </div>
      )}

      {/* Filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {["pending", "verified", "rejected", "all"].map((f) => (
          <AdminButton
            key={f}
            onClick={() => setFilter(f)}
            className={classNames(
              "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
              filter === f
                ? "bg-brand-purple text-white"
                : "bg-neutral-100 text-neutral-500 hover:text-neutral-700 dark:bg-white/5 dark:text-neutral-500",
            )}
          >
            {f}
          </AdminButton>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-lg bg-neutral-100 dark:bg-white/5"
            />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <p className="rounded-lg border border-neutral-200 py-8 text-center text-sm text-neutral-400 dark:border-white/5 dark:text-neutral-500">
          No NIN submissions found.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {submissions.map((sub) => (
            <div
              key={sub.profile_id}
              className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <KeyRound
                      aria-hidden="true"
                      className="h-4 w-4 text-brand-purple"
                    />
                    <span className="font-medium text-neutral-900 dark:text-white">
                      {sub.display_name}
                    </span>
                    {sub.business_name && (
                      <span className="text-sm text-neutral-500">
                        · {sub.business_name}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 dark:bg-white/5">
                      <span className="text-xs text-neutral-500">NIN:</span>
                      <span className="font-mono text-sm font-bold text-neutral-900 dark:text-white">
                        {sub.nin_number}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 dark:bg-white/5">
                      <span className="text-xs text-neutral-500">
                        Category:
                      </span>
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        {sub.category_name ?? "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 dark:bg-white/5">
                      <Phone
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-neutral-500"
                      />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        {sub.mobile_number ?? sub.phone_number ?? "N/A"}
                      </span>
                      {sub.mobile_otp_verified && (
                        <Check
                          aria-hidden="true"
                          className="h-3.5 w-3.5 text-emerald-500"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 dark:bg-white/5">
                      <span className="text-xs text-neutral-500">
                        Registered:
                      </span>
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        {new Date(sub.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={classNames(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        sub.nin_verified
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : sub.verification_status === "rejected"
                            ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                            : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
                      )}
                    >
                      {sub.nin_verified
                        ? "NIN Verified"
                        : sub.verification_status === "rejected"
                          ? "Rejected"
                          : "Pending Review"}
                    </span>
                    {sub.mobile_otp_verified && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                        Mobile Verified
                      </span>
                    )}
                  </div>
                </div>

                <a
                  href={`/pro-connect/${sub.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-1.5 text-neutral-500 hover:text-brand-purple"
                >
                  <Eye aria-hidden="true" className="h-4 w-4" />
                </a>
              </div>

              {/* Actions for pending */}
              {!sub.nin_verified && sub.verification_status !== "rejected" && (
                <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-white/5">
                  {selectedNin?.profile_id === sub.profile_id ? (
                    <div className="space-y-3">
                      <AdminInput
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Rejection reason (if rejecting)"
                        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-white/10 dark:bg-brand-navy"
                      />
                      <div className="flex flex-wrap gap-2">
                        <AdminButton
                          variant="success"
                          onClick={() => handleApprove(sub.profile_id)}
                          disabled={processing}
                          className="text-xs"
                        >
                          <Check
                            aria-hidden="true"
                            className="mr-1 inline h-3.5 w-3.5"
                          />
                          {processing
                            ? "Processing..."
                            : "Confirm & Auto-Verify"}
                        </AdminButton>
                        <AdminButton
                          variant="danger"
                          onClick={() => handleReject(sub.profile_id)}
                          disabled={processing || !rejectReason.trim()}
                          className="text-xs bg-red-500 border-red-500 text-white hover:bg-red-600"
                        >
                          <X className="mr-1 inline h-3.5 w-3.5" />
                          Reject NIN
                        </AdminButton>
                        <AdminButton
                          variant="secondary"
                          onClick={() => {
                            setSelectedNin(null);
                            setRejectReason("");
                          }}
                          className="text-xs"
                        >
                          Cancel
                        </AdminButton>
                      </div>
                      <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                        <AlertCircle
                          aria-hidden="true"
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                        />
                        <p>
                          Approving will auto-verify this worker to Tier 2 and
                          save their NIN + profile snapshot to the audit log for
                          future reference.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <AdminButton
                      variant="secondary"
                      onClick={() => setSelectedNin(sub)}
                      className="rounded-lg border-brand-purple/30 text-brand-purple text-xs hover:bg-brand-purple/5"
                    >
                      Review NIN →
                    </AdminButton>
                  )}
                </div>
              )}

              {/* Already verified badge */}
              {sub.nin_verified && (
                <div className="mt-4 border-t border-neutral-100 pt-3 dark:border-white/5">
                  <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                    <Check aria-hidden="true" className="h-4 w-4" />
                    <span>
                      NIN verified — worker has Tier 2 access. NIN + profile
                      snapshot saved to audit log.
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
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
  const [workerReports, setWorkerReports] = useState<
    {
      id: string;
      reporter_id: string;
      reported_user_id: string;
      channel_id: string | null;
      reason: string;
      description: string | null;
      status: string;
      created_at: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [reportSubTab, setReportSubTab] = useState<"pro" | "worker">("pro");
  const [ninDetail, setNinDetail] = useState<Record<string, unknown> | null>(
    null,
  );
  const [ninDetailLoading, setNinDetailLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [proData, workerData] = await Promise.all([
        supabase.from("pro_reports").select("*").order("created_at DESC"),
        supabase.from("worker_reports").select("*").order("created_at DESC"),
      ]);
      setReports((proData.data || []) as DbProReport[]);
      setWorkerReports((workerData.data || []) as typeof workerReports);
      setLoading(false);
    })();
  }, []);

  async function resolveProReport(
    reportId: string,
    status: "resolved" | "dismissed",
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("pro_reports")
      .update({
        status,
        resolved_by: user?.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", reportId);
    const { data } = await supabase
      .from("pro_reports")
      .select("*")
      .order("created_at DESC");
    setReports((data || []) as DbProReport[]);
  }

  async function resolveWorkerReport(
    reportId: string,
    status: "resolved" | "dismissed",
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("worker_reports")
      .update({
        status,
        resolved_by: user?.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", reportId);
    const { data } = await supabase
      .from("worker_reports")
      .select("*")
      .order("created_at DESC");
    setWorkerReports((data || []) as typeof workerReports);
  }

  async function viewNinDetails(reportId: string) {
    setNinDetailLoading(true);
    setNinDetail(null);
    const { data } = await supabase.rpc("admin_get_worker_report_details", {
      p_report_id: reportId,
    });
    setNinDetail(data as Record<string, unknown> | null);
    setNinDetailLoading(false);
  }

  if (loading)
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg bg-neutral-100 dark:bg-white/5"
          />
        ))}
      </div>
    );

  return (
    <div>
      {/* Sub-tabs */}
      <div className="mb-4 flex gap-2">
        <AdminButton
          onClick={() => setReportSubTab("pro")}
          className={classNames(
            "rounded-full px-3 py-1 text-xs font-medium",
            reportSubTab === "pro"
              ? "bg-brand-purple text-white"
              : "bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-500",
          )}
        >
          Pro Connect Reports ({reports.length})
        </AdminButton>
        <AdminButton
          onClick={() => setReportSubTab("worker")}
          className={classNames(
            "rounded-full px-3 py-1 text-xs font-medium",
            reportSubTab === "worker"
              ? "bg-brand-purple text-white"
              : "bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-500",
          )}
        >
          Worker Channel Reports ({workerReports.length})
        </AdminButton>
      </div>

      {reportSubTab === "pro" && reports.length === 0 && (
        <p className="rounded-lg border border-neutral-200 py-8 text-center text-sm text-neutral-400 dark:border-white/5 dark:text-neutral-500">
          No Pro Connect reports filed.
        </p>
      )}

      {reportSubTab === "pro" && reports.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-white/5 dark:bg-brand-navy-mid"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium capitalize text-neutral-600 dark:bg-white/5 dark:text-neutral-300">
                    {r.report_type}
                  </span>
                  <p className="mt-2 text-sm font-medium text-neutral-900 dark:text-white">
                    {r.reason}
                  </p>
                  {r.description && (
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
                      {r.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-neutral-500">
                    {new Date(r.created_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={classNames(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                      r.status === "open"
                        ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                        : r.status === "resolved"
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-500",
                    )}
                  >
                    {r.status}
                  </span>
                  {r.status === "open" && (
                    <>
                      <AdminButton
                        variant="success"
                        onClick={() => resolveProReport(r.id, "resolved")}
                        className="text-xs py-1"
                      >
                        Resolve
                      </AdminButton>
                      <AdminButton
                        variant="secondary"
                        onClick={() => resolveProReport(r.id, "dismissed")}
                        className="text-xs py-1"
                      >
                        Dismiss
                      </AdminButton>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {reportSubTab === "worker" && workerReports.length === 0 && (
        <p className="rounded-lg border border-neutral-200 py-8 text-center text-sm text-neutral-400 dark:border-white/5 dark:text-neutral-500">
          No worker channel reports filed.
        </p>
      )}

      {reportSubTab === "worker" && workerReports.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {workerReports.map((wr) => (
            <div
              key={wr.id}
              className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-white/5 dark:bg-brand-navy-mid"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium capitalize text-red-600 dark:bg-red-500/10 dark:text-red-400">
                      {wr.reason}
                    </span>
                    <span
                      className={classNames(
                        "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        wr.status === "pending"
                          ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                          : wr.status === "resolved"
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-500",
                      )}
                    >
                      {wr.status}
                    </span>
                  </div>
                  {wr.description && (
                    <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                      {wr.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-neutral-500">
                    {new Date(wr.created_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <AdminButton
                    variant="secondary"
                    onClick={() => viewNinDetails(wr.id)}
                    className="rounded-lg border-brand-purple/30 text-brand-purple text-xs hover:bg-brand-purple/5"
                  >
                    View NIN Details
                  </AdminButton>
                  {wr.status === "pending" && (
                    <>
                      <AdminButton
                        variant="success"
                        onClick={() => resolveWorkerReport(wr.id, "resolved")}
                        className="text-xs py-1"
                      >
                        Resolve
                      </AdminButton>
                      <AdminButton
                        variant="secondary"
                        onClick={() => resolveWorkerReport(wr.id, "dismissed")}
                        className="text-xs py-1"
                      >
                        Dismiss
                      </AdminButton>
                    </>
                  )}
                </div>
              </div>

              {/* NIN details popover */}
              {ninDetail &&
                (ninDetail as Record<string, unknown>).report_id === wr.id && (
                  <div className="mt-4 rounded-lg border border-brand-purple/20 bg-brand-purple/5 p-4">
                    {ninDetailLoading ? (
                      <p className="text-sm text-neutral-500">Loading...</p>
                    ) : (
                      <>
                        <p className="mb-2 text-sm font-semibold text-brand-purple">
                          NIN Verification Reference
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-neutral-500">
                              Reported User
                            </p>
                            <p className="font-medium text-neutral-900 dark:text-white">
                              {String(
                                (ninDetail as Record<string, unknown>)
                                  .reported_name ?? "N/A",
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500">NIN</p>
                            <p className="font-mono font-bold text-neutral-900 dark:text-white">
                              {String(
                                (ninDetail as Record<string, unknown>)
                                  .nin_number ?? "Not on file",
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500">
                              NIN Verified
                            </p>
                            <p className="font-medium">
                              {(ninDetail as Record<string, unknown>)
                                .nin_verified
                                ? "✓ Yes"
                                : "✗ No"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500">
                              Verified At
                            </p>
                            <p className="font-medium text-neutral-700 dark:text-neutral-300">
                              {(ninDetail as Record<string, unknown>)
                                .nin_verified_at
                                ? new Date(
                                    String(
                                      (ninDetail as Record<string, unknown>)
                                        .nin_verified_at,
                                    ),
                                  ).toLocaleDateString("en-GB")
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                        {(ninDetail as Record<string, unknown>).nin_history && (
                          <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-white/10">
                            <p className="mb-1 text-xs font-semibold text-neutral-500">
                              Verification History:
                            </p>
                            <pre className="overflow-x-auto text-xs text-neutral-500 dark:text-neutral-500">
                              {JSON.stringify(
                                (ninDetail as Record<string, unknown>)
                                  .nin_history,
                                null,
                                2,
                              )}
                            </pre>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================
// REVIEWS TAB
// =========================================================
function AdminReviewsTab() {
  const [reviews, setReviews] = useState<
    {
      id: string;
      rating: number;
      review_text: string | null;
      is_hidden: boolean;
      is_verified_review: boolean;
      professional_id: string;
      created_at: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pro_reviews")
        .select("*")
        .order("created_at DESC")
        .limit(50);
      setReviews((data || []) as typeof reviews);
      setLoading(false);
    })();
  }, []);

  async function toggleHidden(reviewId: string, hidden: boolean) {
    await supabase
      .from("pro_reviews")
      .update({ is_hidden: !hidden })
      .eq("id", reviewId);
    setReviews(
      reviews.map((r) =>
        r.id === reviewId ? { ...r, is_hidden: !hidden } : r,
      ),
    );
  }

  if (loading)
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg bg-neutral-100 dark:bg-white/5"
          />
        ))}
      </div>
    );
  if (reviews.length === 0)
    return (
      <p className="rounded-lg border border-neutral-200 py-8 text-center text-sm text-neutral-400 dark:border-white/5 dark:text-neutral-500">
        No reviews to moderate.
      </p>
    );

  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <div
          key={r.id}
          className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Award
                    key={s}
                    className={
                      s <= r.rating
                        ? "h-4 w-4 fill-amber-400 text-amber-400"
                        : "h-4 w-4 text-neutral-200 dark:text-neutral-700"
                    }
                  />
                ))}
                <span className="text-xs text-neutral-500">
                  {new Date(r.created_at).toLocaleDateString("en-GB")}
                </span>
                {r.is_hidden && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
                    Hidden
                  </span>
                )}
                {r.is_verified_review && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    Verified Review
                  </span>
                )}
              </div>
              {r.review_text && (
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                  {r.review_text}
                </p>
              )}
            </div>
            <AdminButton
              variant={r.is_hidden ? "success" : "danger"}
              onClick={() => toggleHidden(r.id, r.is_hidden)}
              className="rounded-lg px-3 py-1.5 text-xs"
            >
              {r.is_hidden ? "Unhide" : "Hide"}
            </AdminButton>
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

  if (loading || !settings)
    return (
      <div className="h-32 animate-pulse rounded-lg bg-neutral-100 dark:bg-white/5" />
    );

  return (
    <div className="max-w-2xl space-y-6">
      {/* Badge descriptions */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/5 dark:bg-brand-navy-mid">
        <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">
          Verification Badge Descriptions
        </h3>
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Contact Verified description
            </span>
            <AdminTextarea
              value={settings.contact_verified_description}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  contact_verified_description: e.target.value,
                })
              }
              rows={2}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              FRELUX Verified description
            </span>
            <AdminTextarea
              value={settings.frelux_verified_description}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  frelux_verified_description: e.target.value,
                })
              }
              rows={2}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              FRELUX Pro description
            </span>
            <AdminTextarea
              value={settings.pro_level_description}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  pro_level_description: e.target.value,
                })
              }
              rows={2}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Verification disclaimer
            </span>
            <AdminTextarea
              value={settings.verification_disclaimer}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  verification_disclaimer: e.target.value,
                })
              }
              rows={2}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
          </label>
        </div>
      </div>

      {/* Pro Level requirements */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/5 dark:bg-brand-navy-mid">
        <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">
          FRELUX Pro Eligibility Requirements
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Minimum reviews
            </span>
            <AdminInput
              type="number"
              value={settings.pro_level_min_reviews}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  pro_level_min_reviews: parseInt(e.target.value) || 0,
                })
              }
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Minimum rating
            </span>
            <AdminInput
              type="number"
              step="0.1"
              value={settings.pro_level_min_rating}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  pro_level_min_rating: parseFloat(e.target.value) || 0,
                })
              }
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Min portfolio items
            </span>
            <AdminInput
              type="number"
              value={settings.pro_level_min_portfolio_items}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  pro_level_min_portfolio_items: parseInt(e.target.value) || 0,
                })
              }
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Min profile age (days)
            </span>
            <AdminInput
              type="number"
              value={settings.pro_level_min_profile_age_days}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  pro_level_min_profile_age_days: parseInt(e.target.value) || 0,
                })
              }
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
          </label>
        </div>
      </div>

      {/* Save button */}
      <AdminButton
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2.5"
      >
        {saving ? "Saving..." : saved ? "✓ Saved" : "Save Settings"}
      </AdminButton>
    </div>
  );
}

// =========================================================
// CHANNELS TAB — Manage worker channels & categories
// =========================================================
function AdminChannelsTab() {
  const [categories, setCategories] = useState<DbWorkerChannelCategory[]>([]);
  const [channels, setChannels] = useState<DbWorkerChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingChannel, setEditingChannel] = useState<DbWorkerChannel | null>(
    null,
  );
  const [editingCategory, setEditingCategory] =
    useState<DbWorkerChannelCategory | null>(null);

  const [channelForm, setChannelForm] = useState({
    name: "",
    slug: "",
    description: "",
    region: "National",
    icon: "Hash",
    is_official: false,
    is_active: true,
    category_id: "",
    sort_order: 0,
  });
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "MessageSquareWarning",
    is_active: true,
    sort_order: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [cats, chs] = await Promise.all([
      fetchChannelCategories(),
      fetchChannels(),
    ]);
    setCategories(cats);
    setChannels(chs);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEditChannel(ch: DbWorkerChannel) {
    setEditingChannel(ch);
    setChannelForm({
      name: ch.name,
      slug: ch.slug,
      description: ch.description || "",
      region: ch.region || "National",
      icon: ch.icon || "Hash",
      is_official: ch.is_official,
      is_active: ch.is_active,
      category_id: ch.category_id || "",
      sort_order: ch.sort_order,
    });
    setShowChannelForm(true);
  }

  function startNewChannel() {
    setEditingChannel(null);
    setChannelForm({
      name: "",
      slug: "",
      description: "",
      region: "National",
      icon: "Hash",
      is_official: false,
      is_active: true,
      category_id: categories[0]?.id || "",
      sort_order: channels.length,
    });
    setShowChannelForm(true);
  }

  async function saveChannel() {
    const slug =
      channelForm.slug ||
      channelForm.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const payload = {
      name: channelForm.name.trim(),
      slug,
      description: channelForm.description.trim() || null,
      region: channelForm.region.trim() || null,
      icon: channelForm.icon.trim() || null,
      is_official: channelForm.is_official,
      is_active: channelForm.is_active,
      category_id: channelForm.category_id || null,
      sort_order: channelForm.sort_order,
    };
    if (editingChannel) {
      const { error } = await supabase
        .from("worker_channels")
        .update(payload)
        .eq("id", editingChannel.id);
      if (error) {
        console.error("Update channel error:", error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("worker_channels").insert(payload);
      if (error) {
        console.error("Insert channel error:", error.message);
        return;
      }
    }
    setShowChannelForm(false);
    setEditingChannel(null);
    load();
  }

  async function deleteChannel(id: string) {
    if (
      !confirm("Delete this channel? All messages and members will be removed.")
    )
      return;
    const { error } = await supabase
      .from("worker_channels")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Delete channel error:", error.message);
      return;
    }
    load();
  }

  function startEditCategory(cat: DbWorkerChannelCategory) {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      icon: cat.icon || "MessageSquareWarning",
      is_active: cat.is_active,
      sort_order: cat.sort_order,
    });
    setShowCategoryForm(true);
  }

  function startNewCategory() {
    setEditingCategory(null);
    setCategoryForm({
      name: "",
      slug: "",
      description: "",
      icon: "MessageSquareWarning",
      is_active: true,
      sort_order: categories.length,
    });
    setShowCategoryForm(true);
  }

  async function saveCategory() {
    const slug =
      categoryForm.slug ||
      categoryForm.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const payload = {
      name: categoryForm.name.trim(),
      slug,
      description: categoryForm.description.trim() || null,
      icon: categoryForm.icon.trim() || null,
      is_active: categoryForm.is_active,
      sort_order: categoryForm.sort_order,
    };
    if (editingCategory) {
      const { error } = await supabase
        .from("worker_channel_categories")
        .update(payload)
        .eq("id", editingCategory.id);
      if (error) {
        console.error("Update category error:", error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("worker_channel_categories")
        .insert(payload);
      if (error) {
        console.error("Insert category error:", error.message);
        return;
      }
    }
    setShowCategoryForm(false);
    setEditingCategory(null);
    load();
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category? Channels in it will be uncategorized."))
      return;
    const { error } = await supabase
      .from("worker_channel_categories")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Delete category error:", error.message);
      return;
    }
    load();
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg bg-neutral-100 dark:bg-white/5"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Categories section */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
            Channel Categories
          </h3>
          <AdminButton onClick={startNewCategory} className="text-xs py-1">
            <Plus aria-hidden="true" className="h-3.5 w-3.5" /> New Category
          </AdminButton>
        </div>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-2.5 dark:border-white/5 dark:bg-brand-navy-mid"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  {cat.name}
                </p>
                <p className="text-xs text-neutral-500">
                  /{cat.slug} · {cat.is_active ? "Active" : "Inactive"}
                </p>
              </div>
              <div className="flex gap-1">
                <AdminIconButton
                  variant="ghost"
                  onClick={() => startEditCategory(cat)}
                >
                  <Eye aria-hidden="true" className="h-4 w-4" />
                </AdminIconButton>
                <AdminIconButton
                  variant="ghost"
                  onClick={() => deleteCategory(cat.id)}
                  className="rounded-lg p-1.5 text-red-400 hover:text-red-600"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </AdminIconButton>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-sm text-neutral-500">No categories yet.</p>
          )}
        </div>
      </div>

      {/* Channels section */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
            Worker Channels
          </h3>
          <AdminButton onClick={startNewChannel} className="text-xs py-1">
            <Plus aria-hidden="true" className="h-3.5 w-3.5" /> New Channel
          </AdminButton>
        </div>
        <div className="space-y-2">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-2.5 dark:border-white/5 dark:bg-brand-navy-mid"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Hash
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-brand-purple dark:text-brand-purple-lighter"
                  />
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                    {ch.name}
                  </p>
                  {ch.is_official && (
                    <span className="rounded-full bg-brand-purple/10 px-2 py-0.5 text-[10px] font-medium text-brand-purple">
                      Official
                    </span>
                  )}
                  {!ch.is_active && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-500">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  /{ch.slug} · {ch.region || "National"} ·{" "}
                  {ch.member_count ?? 0} members
                  {ch.category && ` · ${ch.category.name}`}
                </p>
              </div>
              <div className="flex gap-1">
                <AdminIconButton
                  variant="ghost"
                  onClick={() => startEditChannel(ch)}
                >
                  <Eye aria-hidden="true" className="h-4 w-4" />
                </AdminIconButton>
                <AdminIconButton
                  variant="ghost"
                  onClick={() => deleteChannel(ch.id)}
                  className="rounded-lg p-1.5 text-red-400 hover:text-red-600"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </AdminIconButton>
              </div>
            </div>
          ))}
          {channels.length === 0 && (
            <p className="text-sm text-neutral-500">No channels yet.</p>
          )}
        </div>
      </div>

      {/* Channel form modal */}
      {showChannelForm && (
        <AdminModal
          open
          onClose={() => setShowChannelForm(false)}
          title={editingChannel ? "Edit Channel" : "New Channel"}
          maxWidth="max-w-lg"
        >
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Name
              </span>
              <AdminInput
                type="text"
                value={channelForm.name}
                onChange={(e) =>
                  setChannelForm({ ...channelForm, name: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Slug (auto-generated if empty)
              </span>
              <AdminInput
                type="text"
                value={channelForm.slug}
                onChange={(e) =>
                  setChannelForm({ ...channelForm, slug: e.target.value })
                }
                placeholder="e.g. lagos-price-watch"
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Description
              </span>
              <AdminTextarea
                value={channelForm.description}
                onChange={(e) =>
                  setChannelForm({
                    ...channelForm,
                    description: e.target.value,
                  })
                }
                rows={2}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                  Region
                </span>
                <AdminInput
                  type="text"
                  value={channelForm.region}
                  onChange={(e) =>
                    setChannelForm({ ...channelForm, region: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                  Icon (lucide name)
                </span>
                <AdminInput
                  type="text"
                  value={channelForm.icon}
                  onChange={(e) =>
                    setChannelForm({ ...channelForm, icon: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Category
              </span>
              <AdminSelect
                value={channelForm.category_id}
                onChange={(e) =>
                  setChannelForm({
                    ...channelForm,
                    category_id: e.target.value,
                  })
                }
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </AdminSelect>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Sort order
              </span>
              <AdminInput
                type="number"
                value={channelForm.sort_order}
                onChange={(e) =>
                  setChannelForm({
                    ...channelForm,
                    sort_order: parseInt(e.target.value) || 0,
                  })
                }
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
              />
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <AdminInput
                  type="checkbox"
                  checked={channelForm.is_official}
                  onChange={(e) =>
                    setChannelForm({
                      ...channelForm,
                      is_official: e.target.checked,
                    })
                  }
                />
                Official FRELUX channel
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <AdminInput
                  type="checkbox"
                  checked={channelForm.is_active}
                  onChange={(e) =>
                    setChannelForm({
                      ...channelForm,
                      is_active: e.target.checked,
                    })
                  }
                />
                Active
              </label>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <AdminButton onClick={saveChannel}>
              <Save aria-hidden="true" className="h-4 w-4" /> Save
            </AdminButton>
            <AdminButton
              variant="secondary"
              onClick={() => setShowChannelForm(false)}
            >
              Cancel
            </AdminButton>
          </div>
        </AdminModal>
      )}

      {/* Category form modal */}
      {showCategoryForm && (
        <AdminModal
          open
          onClose={() => setShowCategoryForm(false)}
          title={editingCategory ? "Edit Category" : "New Category"}
          maxWidth="max-w-md"
        >
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Name
              </span>
              <AdminInput
                type="text"
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Slug (auto-generated if empty)
              </span>
              <AdminInput
                type="text"
                value={categoryForm.slug}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, slug: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Description
              </span>
              <AdminInput
                type="text"
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    description: e.target.value,
                  })
                }
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                  Icon (lucide name)
                </span>
                <AdminInput
                  type="text"
                  value={categoryForm.icon}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, icon: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                  Sort order
                </span>
                <AdminInput
                  type="number"
                  value={categoryForm.sort_order}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      sort_order: parseInt(e.target.value) || 0,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
              <AdminInput
                type="checkbox"
                checked={categoryForm.is_active}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    is_active: e.target.checked,
                  })
                }
              />
              Active
            </label>
          </div>
          <div className="mt-5 flex gap-2">
            <AdminButton onClick={saveCategory}>
              <Save aria-hidden="true" className="h-4 w-4" /> Save
            </AdminButton>
            <AdminButton
              variant="secondary"
              onClick={() => setShowCategoryForm(false)}
            >
              Cancel
            </AdminButton>
          </div>
        </AdminModal>
      )}
    </div>
  );
}

// =========================================================
// MODERATION TAB — AI bot configuration
// =========================================================
function AdminModerationTab() {
  const [config, setConfig] = useState<DbWorkerModerationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [bannedWordsText, setBannedWordsText] = useState("");
  const [bannedPatternsText, setBannedPatternsText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("worker_moderation_config")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("Load moderation config error:", error.message);
    }
    if (data) {
      setConfig(data as DbWorkerModerationConfig);
      setBannedWordsText((data.banned_words ?? []).join(", "));
      setBannedPatternsText((data.banned_patterns ?? []).join("\n"));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    const bannedWords = bannedWordsText
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);
    const bannedPatterns = bannedPatternsText
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);
    const { error } = await supabase
      .from("worker_moderation_config")
      .update({
        is_enabled: config.is_enabled,
        auto_remove_threshold: config.auto_remove_threshold,
        auto_flag_threshold: config.auto_flag_threshold,
        banned_words: bannedWords,
        banned_patterns: bannedPatterns,
        warning_message: config.warning_message,
        ai_provider: config.ai_provider,
        ai_model: config.ai_model,
      })
      .eq("id", config.id);
    setSaving(false);
    if (error) {
      console.error("Save moderation config error:", error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg bg-neutral-100 dark:bg-white/5"
          />
        ))}
      </div>
    );
  }

  if (!config) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-500/20 dark:bg-amber-500/10">
        <Bot
          aria-hidden="true"
          className="mx-auto mb-3 h-8 w-8 text-amber-500"
        />
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
          No moderation config found.
        </p>
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
          Run the Phase 30 migration to seed the default config.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Status banner */}
      <div
        className={classNames(
          "flex items-center gap-3 rounded-xl border p-4",
          config.is_enabled
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
            : "border-neutral-200 bg-neutral-50 dark:border-white/5 dark:bg-white/5",
        )}
      >
        <Bot
          className={classNames(
            "h-5 w-5",
            config.is_enabled ? "text-emerald-500" : "text-neutral-500",
          )}
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-900 dark:text-white">
            AI Moderation Bot: {config.is_enabled ? "Active" : "Disabled"}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            {config.is_enabled
              ? `Using ${config.ai_provider} / ${config.ai_model} — messages are auto-checked on send.`
              : "All messages will pass through without moderation."}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <AdminInput
            type="checkbox"
            checked={config.is_enabled}
            onChange={(e) =>
              setConfig({ ...config, is_enabled: e.target.checked })
            }
            className="h-4 w-4 rounded border-neutral-300"
          />
          {config.is_enabled ? "Enabled" : "Disabled"}
        </label>
      </div>

      {/* Thresholds */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/5 dark:bg-brand-navy-mid">
        <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">
          Auto-Action Thresholds
        </h3>
        <p className="mb-4 text-xs text-neutral-500">
          AI scores messages 0.0 (safe) to 1.0 (harmful). Set thresholds for
          automatic flagging and removal.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Auto-flag threshold (0.0–1.0)
            </span>
            <AdminInput
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={config.auto_flag_threshold}
              onChange={(e) =>
                setConfig({
                  ...config,
                  auto_flag_threshold: parseFloat(e.target.value) || 0,
                })
              }
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
            <span className="mt-1 block text-[11px] text-neutral-500">
              Messages scoring ≥ this are flagged for review.
            </span>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Auto-remove threshold (0.0–1.0)
            </span>
            <AdminInput
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={config.auto_remove_threshold}
              onChange={(e) =>
                setConfig({
                  ...config,
                  auto_remove_threshold: parseFloat(e.target.value) || 0,
                })
              }
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
            <span className="mt-1 block text-[11px] text-neutral-500">
              Messages scoring ≥ this are removed automatically.
            </span>
          </label>
        </div>
      </div>

      {/* Banned words & patterns */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/5 dark:bg-brand-navy-mid">
        <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">
          Banned Words & Patterns
        </h3>
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Banned words (comma-separated)
            </span>
            <AdminTextarea
              value={bannedWordsText}
              onChange={(e) => setBannedWordsText(e.target.value)}
              rows={3}
              placeholder="e.g. scam, fraud, idiot, ..."
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
            <span className="mt-1 block text-[11px] text-neutral-500">
              Messages containing these are instantly removed (score = 1.0).
            </span>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Banned regex patterns (one per line)
            </span>
            <AdminTextarea
              value={bannedPatternsText}
              onChange={(e) => setBannedPatternsText(e.target.value)}
              rows={3}
              placeholder="e.g. \b\d{10}\b (phone number spam)"
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm font-mono dark:border-white/10 dark:bg-brand-navy"
            />
            <span className="mt-1 block text-[11px] text-neutral-500">
              Each line is a regex pattern. Matching messages are instantly
              removed.
            </span>
          </label>
        </div>
      </div>

      {/* AI Provider settings */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/5 dark:bg-brand-navy-mid">
        <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">
          AI Provider Settings
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Provider
            </span>
            <AdminSelect
              value={config.ai_provider}
              onChange={(e) =>
                setConfig({ ...config, ai_provider: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="local">Local / Heuristic only</option>
            </AdminSelect>
            <span className="mt-1 block text-[11px] text-neutral-500">
              If set to "Local", only heuristic rules apply (no API calls).
            </span>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Model
            </span>
            <AdminInput
              type="text"
              value={config.ai_model}
              onChange={(e) =>
                setConfig({ ...config, ai_model: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
            <span className="mt-1 block text-[11px] text-neutral-500">
              e.g. gpt-4o-mini, claude-3-haiku. Set via OPENAI_API_KEY env var.
            </span>
          </label>
        </div>
      </div>

      {/* Warning message */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/5 dark:bg-brand-navy-mid">
        <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">
          Warning Message (shown to users)
        </h3>
        <AdminTextarea
          value={config.warning_message}
          onChange={(e) =>
            setConfig({ ...config, warning_message: e.target.value })
          }
          rows={2}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
        />
        <span className="mt-1 block text-[11px] text-neutral-500">
          Posted as a system message in the channel when content is removed.
        </span>
      </div>

      {/* Save button */}
      <AdminButton
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2.5"
      >
        <Save aria-hidden="true" className="h-4 w-4" />
        {saving ? "Saving..." : saved ? "✓ Saved" : "Save Moderation Settings"}
      </AdminButton>
    </div>
  );
}
