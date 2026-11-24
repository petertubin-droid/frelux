import { useEffect, useState, useCallback, type FormEvent } from "react";
import { supabase, getFunctionErrorMessage } from "@/lib/supabase";
import { maskIdentityNumber } from "@/lib/identity/mask";
import {
  AdminHeader,
  AdminCard,
  StateMessage,
  AdminSelect,
} from "@/components/admin/AdminUi";
import type { DbProfile, DbUserPaidStatus } from "@/types/database";
import { classNames } from "@/lib/utils";
import {
  Clock,
  X,
  Check,
  Plus,
  Pencil,
  Trash2,
  Search,
  Mail,
  RefreshCw,
  Users,
  Ban,
  ShieldOff,
  RotateCcw,
  Phone,
  MapPin,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import {
  resolveUserCountry,
  getCountryFlag,
  getCountryDialCode,
  COUNTRY_OPTIONS,
} from "@/lib/international/countries";
import { dialCodePlaceholder } from "@/lib/phone/msisdn";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import AdminPagination from "@/components/admin/AdminPagination";
import {
  AdminButton,
  AdminInput,
  AdminField,
} from "@/components/admin/AdminUi";
import { AdminModal } from "@/components/admin/AdminModal";
import { useLanguage } from "@/lib/i18n";

type Status = "loading" | "ready" | "error";

interface UserWithPaid extends DbProfile {
  paid_status?: DbUserPaidStatus | null;
}

const PLAN_OPTIONS = [
  { value: "basic", label: "Basic" },
  { value: "pro", label: "Pro" },
  { value: "premium", label: "Premium" },
  { value: "enterprise", label: "Enterprise" },
];

const DURATION_OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
  { value: "0", label: "Lifetime (no expiry)" },
];

export default function AdminUsers() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserWithPaid[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState("pro");
  const [editDays, setEditDays] = useState("30");
  const [saving, setSaving] = useState(false);
  // Server-side pagination - profiles grows with every signup.
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithPaid | null>(null);
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    country_code: "",
    location: "",
    nin_number: "",
    credential_suffix: "",
    credential_verified: false,
    government_id_type: "national_id",
    government_id_number: "",
    account_type: "client",
    display_name: "",
    business_name: "",
    years_experience: "",
    availability: "available",
    is_listed: false,
  });
  const [actionBusy, setActionBusy] = useState(false);
  const [kind, setKind] = useState<"all" | "pro" | "client">("all");
  const [stateFilter, setStateFilter] = useState<
    "all" | "active" | "suspended" | "revoked"
  >("all");
  const [stateTarget, setStateTarget] = useState<{
    user: UserWithPaid;
    state: "suspended" | "revoked" | "active";
  } | null>(null);
  const [stateReason, setStateReason] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    let profileQuery = supabase
      .from("profiles")
      .select("*", { count: "exact" });
    const safeSearch = search
      .trim()
      .replace(/[%,().]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (safeSearch)
      profileQuery = profileQuery.or(
        `email.ilike.%${safeSearch}%,full_name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,location.ilike.%${safeSearch}%,nin_number.ilike.%${safeSearch}%,government_id_number.ilike.%${safeSearch}%`,
      );
    if (kind !== "all")
      profileQuery = profileQuery.eq(
        "account_type",
        kind === "pro" ? "pro_worker" : "client",
      );
    if (stateFilter !== "all")
      profileQuery = profileQuery.eq("account_state", stateFilter);
    if (countryFilter !== "all")
      profileQuery = profileQuery.eq("country_code", countryFilter);
    const profilesRes = await profileQuery
      .order("created_at", { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);
    const profileError = profilesRes.error;
    const profiles = profilesRes.data;
    if (profileError) {
      setError(profileError.message);
      setStatus("error");
      return;
    }

    // Also load paid statuses, admin can read all (RLS policy added in Phase 2a)
    const profileIds = (profiles ?? []).map((profile) => profile.id);
    const { data: paidData, error: paidError } = profileIds.length
      ? await supabase
          .from("user_paid_status")
          .select("*")
          .in("user_id", profileIds)
      : { data: [], error: null };
    // paidError is OK, table might be empty or RLS might not grant admin yet
    const paidMap = new Map<string, DbUserPaidStatus>();
    if (!paidError && paidData) {
      for (const p of paidData as DbUserPaidStatus[]) {
        paidMap.set(p.user_id, p);
      }
    }

    const merged = (profiles ?? []).map((p: DbProfile) => ({
      ...p,
      paid_status: paidMap.get(p.id) ?? null,
    }));

    setUsers(merged);
    setTotal(profilesRes.count ?? 0);
    setStatus("ready");
  }, [page, pageSize, search, kind, stateFilter, countryFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSubscription(userId: string) {
    setSaving(true);
    const days = parseInt(editDays, 10);
    const paidUntil =
      days > 0
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        : null; // null = lifetime

    // Write to user_paid_status using admin upsert
    // Note: this requires the admin to have INSERT/UPDATE access via RLS
    const { error: upsertError } = await supabase
      .from("user_paid_status")
      .upsert(
        {
          user_id: userId,
          is_paid: true,
          plan: editPlan,
          paid_until: paidUntil,
          payment_provider: "admin_grant",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (upsertError) {
      setError(`Failed to update subscription: ${upsertError.message}`);
      setSaving(false);
      return;
    }

    setEditingId(null);
    setSaving(false);
    await load(); // refresh
  }

  async function revokeSubscription(userId: string) {
    if (
      !confirm(
        "Revoke this user's subscription? They will lose access to all premium features.",
      )
    )
      return;
    setSaving(true);
    const { error: updateError } = await supabase
      .from("user_paid_status")
      .upsert(
        {
          user_id: userId,
          is_paid: false,
          plan: null,
          paid_until: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (updateError) {
      setError(`Failed to revoke: ${updateError.message}`);
    } else {
      await load();
    }
    setSaving(false);
  }

  function openCreate() {
    setEditingUser(null);
    setForm({
      email: "",
      full_name: "",
      phone: "",
      country_code: "",
      location: "",
      nin_number: "",
      credential_suffix: "",
      credential_verified: false,
      government_id_type: "national_id",
      government_id_number: "",
      account_type: "client",
      display_name: "",
      business_name: "",
      years_experience: "",
      availability: "available",
      is_listed: true,
    });
    setEditorOpen(true);
  }

  async function openEdit(user: UserWithPaid) {
    setEditingUser(user);
    setForm({
      email: user.email ?? "",
      full_name: user.full_name ?? "",
      phone: user.phone ?? "",
      country_code: user.country_code ?? resolveUserCountry(user).code ?? "",
      location: user.location ?? "",
      nin_number: user.nin_number ?? "",
      credential_suffix: user.credential_suffix ?? "",
      credential_verified: Boolean(user.credential_verified_at),
      government_id_type: user.government_id_type || "national_id",
      government_id_number: user.government_id_number ?? "",
      account_type: user.account_type ?? "client",
      display_name: user.full_name ?? "",
      business_name: "",
      years_experience: "",
      availability: "available",
      is_listed: true,
    });
    setEditorOpen(true);

    try {
      const { data: pro } = await supabase
        .from("pro_profiles")
        .select(
          "display_name, business_name, years_experience, availability, is_listed",
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (pro) {
        setForm((prev) => ({
          ...prev,
          display_name: pro.display_name || prev.display_name,
          business_name: pro.business_name || "",
          years_experience:
            pro.years_experience != null ? String(pro.years_experience) : "",
          availability: pro.availability || "available",
          is_listed: pro.is_listed ?? true,
        }));
      }
    } catch {
      // Non-fatal
    }
  }

  async function saveUser(event: FormEvent) {
    event.preventDefault();
    setActionBusy(true);
    setError("");
    const { data, error: fnError } = await supabase.functions.invoke(
      "admin-user-management",
      {
        body: {
          action: editingUser ? "update" : "invite",
          userId: editingUser?.id,
          ...form,
          // Only the admin endpoint can stamp a credential verified; the server
          // clears the stamp whenever the stated suffix changes.
          credential_suffix: form.credential_suffix,
          credential_verified: form.credential_verified,
          // Professional details live on pro_profiles; the whitelist in
          // admin_update_pro_profile decides what may be written.
          pro:
            form.account_type === "pro_worker" && editingUser
              ? {
                  display_name: form.display_name,
                  business_name: form.business_name,
                  years_experience: form.years_experience || undefined,
                  availability: form.availability,
                  is_listed: form.is_listed,
                }
              : undefined,
        },
      },
    );
    setActionBusy(false);
    if (fnError || data?.error) {
      const msg = fnError
        ? await getFunctionErrorMessage(fnError)
        : data?.error;
      setError(msg || "Could not save user.");
      return;
    }
    setEditorOpen(false);
    await load();
  }

  async function deleteUser(user: UserWithPaid) {
    if (user.role === "admin") {
      setError("Admin accounts cannot be removed from this screen.");
      return;
    }
    if (
      !window.confirm(
        `Permanently delete ${user.email}? This removes the account and may cascade-delete their associated data. This cannot be undone.`,
      )
    )
      return;
    setActionBusy(true);
    setError("");
    const { data, error: fnError } = await supabase.functions.invoke(
      "admin-user-management",
      { body: { action: "delete", userId: user.id } },
    );
    setActionBusy(false);
    if (fnError || data?.error) {
      setError(data?.error || fnError?.message || "Could not delete user.");
      return;
    }
    if (users.length === 1 && page > 0) setPage(page - 1);
    else await load();
  }

  async function applyState() {
    if (!stateTarget) return;
    setActionBusy(true);
    setError("");
    const action =
      stateTarget.state === "active"
        ? "restore"
        : stateTarget.state === "suspended"
          ? "suspend"
          : "revoke";
    const { data, error: fnError } = await supabase.functions.invoke(
      "admin-user-management",
      {
        body: {
          action,
          userId: stateTarget.user.id,
          reason: stateReason,
        },
      },
    );
    setActionBusy(false);
    if (fnError || data?.error) {
      const msg = fnError
        ? await getFunctionErrorMessage(fnError)
        : data?.error;
      setError(msg || "Could not change the state.");
      return;
    }
    if (data?.warning) setError(data.warning);
    setStateTarget(null);
    setStateReason("");
    await load();
  }

  function startEdit(u: UserWithPaid) {
    setEditingId(u.id);
    setEditPlan(u.paid_status?.plan || "pro");
    setEditDays("30");
  }

  if (status === "loading")
    return (
      <>
        <AdminHeader
          title={t("User Management")}
          subtitle={t("View and manage user accounts & subscriptions.")}
        />
        <StateMessage
          type="loading"
          title={t("Loading…")}
          message="Fetching users."
        />
      </>
    );
  if (status === "error")
    return (
      <>
        <AdminHeader
          title={t("User Management")}
          subtitle={t("View and manage user accounts & subscriptions.")}
        />
        <StateMessage type="error" title={t("Error")} message={error} />
      </>
    );

  return (
    <>
      <AdminHeader
        title={t("User Management")}
        subtitle={t("Manage user accounts, subscriptions, and access.")}
        action={
          <AdminButton onClick={openCreate}>
            <Plus className="h-4 w-4" /> Invite user
          </AdminButton>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <AdminInput
            aria-label="Search users"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminSelect
            aria-label="Filter by account type"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as "all" | "pro" | "client");
              setPage(0);
            }}
          >
            <option value="all">All accounts</option>
            <option value="pro">Professionals</option>
            <option value="client">Clients</option>
          </AdminSelect>
          <AdminSelect
            aria-label="Filter by account state"
            value={stateFilter}
            onChange={(e) => {
              setStateFilter(
                e.target.value as "all" | "active" | "suspended" | "revoked",
              );
              setPage(0);
            }}
          >
            <option value="all">Any state</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="revoked">Revoked</option>
          </AdminSelect>
          <AdminSelect
            aria-label="Filter by country"
            value={countryFilter}
            onChange={(e) => {
              setCountryFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">All countries</option>
            {COUNTRY_OPTIONS.flatMap((g) => g.countries).map((c) => (
              <option key={c.code} value={c.code}>
                {getCountryFlag(c.code)} {c.name} ({c.code})
              </option>
            ))}
          </AdminSelect>
        </div>
        <div className="admin-inset flex items-center gap-2 rounded-xl px-4 py-2 text-sm">
          <Users aria-hidden="true" className="h-4 w-4 text-primary" />
          <span className="font-semibold tabular-nums">
            {total.toLocaleString()}
          </span>
          <span className="text-muted-foreground">registered users</span>
          <AdminButton
            variant="secondary"
            onClick={() => void load()}
            disabled={actionBusy}
            className="ml-2 px-2 py-1"
            title="Refresh users"
          >
            <RefreshCw className="h-4 w-4" />
          </AdminButton>
        </div>
      </div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <AdminCard>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border dark:border-border border-border">
                <th className="py-3 pr-4 font-semibold text-muted-foreground dark:text-muted-foreground">
                  {t("User")}
                </th>
                <th className="py-3 pr-4 font-semibold text-muted-foreground dark:text-muted-foreground">
                  {t("Country")}
                </th>
                <th className="py-3 pr-4 font-semibold text-muted-foreground dark:text-muted-foreground">
                  {t("Govt ID / NIN")}
                </th>
                <th className="py-3 pr-4 font-semibold text-muted-foreground dark:text-muted-foreground">
                  {t("Role")}
                </th>
                <th className="py-3 pr-4 font-semibold text-muted-foreground dark:text-muted-foreground">
                  {t("State")}
                </th>
                <th className="py-3 pr-4 font-semibold text-muted-foreground dark:text-muted-foreground">
                  {t("Subscription")}
                </th>
                <th className="py-3 pr-4 font-semibold text-muted-foreground dark:text-muted-foreground">
                  {t("Plan")}
                </th>
                <th className="py-3 pr-4 font-semibold text-muted-foreground dark:text-muted-foreground">
                  {t("Expires")}
                </th>
                <th className="py-3 pr-4 font-semibold text-muted-foreground dark:text-muted-foreground">
                  {t("Actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-8 text-center text-muted-foreground dark:text-muted-foreground"
                  >
                    {t("No users yet.")}
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isActive =
                    u.paid_status?.is_paid &&
                    (!u.paid_status?.paid_until ||
                      new Date(u.paid_status.paid_until) > new Date());
                  const isEditing = editingId === u.id;
                  const countryInfo = resolveUserCountry(u);
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-border/50 last:border-0 dark:border-border"
                    >
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-foreground">
                          {u.full_name || "Unnamed user"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {u.email}
                        </div>
                        {u.phone ? (
                          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone
                              className="h-3 w-3 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="tabular-nums">{u.phone}</span>
                          </div>
                        ) : (
                          <div className="mt-0.5 text-[11px] text-muted-foreground/60 italic">
                            No phone
                          </div>
                        )}
                        {u.location ? (
                          <div
                            className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"
                            data-testid={`user-location-${u.id}`}
                          >
                            <MapPin
                              className="h-3 w-3 shrink-0 text-brand-purple"
                              aria-hidden="true"
                            />
                            <span
                              className="truncate max-w-[200px]"
                              title={u.location}
                            >
                              {u.location}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-0.5 text-[11px] text-muted-foreground/60 italic">
                            No location
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {countryInfo.code ? (
                          <div
                            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs font-medium text-foreground dark:border-white/10 dark:bg-card"
                            title={`${countryInfo.name}${countryInfo.dialCode ? ` (+${countryInfo.dialCode})` : ""} · ${countryInfo.source === "phone" ? "inferred from phone, not recorded at signup" : "reported at signup"}`}
                            data-testid={`user-country-${u.id}`}
                          >
                            <span
                              className="text-base leading-none"
                              role="img"
                              aria-label={countryInfo.name}
                            >
                              {countryInfo.flag}
                            </span>
                            <span className="font-semibold tracking-wide">
                              {countryInfo.code}
                            </span>
                            {countryInfo.dialCode && (
                              <span className="text-muted-foreground text-[11px] tabular-nums">
                                (+{countryInfo.dialCode})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span
                            className="text-xs text-muted-foreground"
                            title="Country not recorded"
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4" data-testid={`user-id-${u.id}`}>
                        {u.country_code === "NG" || u.nin_number ? (
                          u.nin_number ? (
                            <div className="inline-flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                <ShieldCheck className="h-3 w-3 shrink-0" />
                                <span title="Masked. Open the editor to see the full NIN.">
                                  NIN: {maskIdentityNumber(u.nin_number)}
                                </span>
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                Nigeria (NIMC)
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-amber-600 dark:text-amber-400 italic">
                              Pending NIN
                            </span>
                          )
                        ) : u.government_id_number ? (
                          <div className="inline-flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 rounded-md border border-brand-purple/30 bg-brand-purple/10 px-2 py-0.5 text-xs font-semibold text-brand-purple dark:text-brand-purple/90">
                              <ShieldCheck className="h-3 w-3 shrink-0" />
                              <span>
                                {u.government_id_type
                                  ? u.government_id_type
                                      .replace(/_/g, " ")
                                      .toUpperCase()
                                  : "GOVT ID"}
                                : {maskIdentityNumber(u.government_id_number)}
                              </span>
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              International ID
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 italic">
                            No ID recorded
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={classNames(
                            "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
                            u.role === "admin"
                              ? "bg-primary/15 text-brand-purple"
                              : "bg-muted text-muted-foreground dark:bg-card-foreground/90 dark:text-muted-foreground",
                          )}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {(() => {
                          const state = u.account_state ?? "active";
                          const tone =
                            state === "active"
                              ? "bg-accent-green/15 text-accent-green"
                              : state === "suspended"
                                ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
                          return (
                            <span
                              className={classNames(
                                "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
                                tone,
                              )}
                              title={u.account_state_reason || undefined}
                            >
                              {state}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 pr-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent-green/15 px-2 py-0.5 text-xs font-semibold text-accent-green">
                            <Check aria-hidden="true" className="h-3 w-3" />{" "}
                            Active
                          </span>
                        ) : u.paid_status?.is_paid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                            <Clock aria-hidden="true" className="h-3 w-3" />{" "}
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground dark:bg-card-foreground/90">
                            <X className="h-3 w-3" /> {t("Free")}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground dark:text-muted-foreground/80">
                        {isEditing ? (
                          <AdminSelect
                            aria-label="User subscription plan"
                            value={editPlan}
                            onChange={(e) => setEditPlan(e.target.value)}
                            className="rounded-md border border-border px-2 py-1 text-xs dark:border-border border-border dark:bg-card-foreground/90"
                          >
                            {PLAN_OPTIONS.map((p) => (
                              <option key={p.value} value={p.value}>
                                {p.label}
                              </option>
                            ))}
                          </AdminSelect>
                        ) : u.paid_status?.plan ? (
                          <span className="capitalize">
                            {u.paid_status.plan}
                          </span>
                        ) : (
                          ""
                        )}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground dark:text-muted-foreground">
                        {isEditing ? (
                          <AdminSelect
                            aria-label="Subscription duration in days"
                            value={editDays}
                            onChange={(e) => setEditDays(e.target.value)}
                            className="rounded-md border border-border px-2 py-1 text-xs dark:border-border border-border dark:bg-card-foreground/90"
                          >
                            {DURATION_OPTIONS.map((d) => (
                              <option key={d.value} value={d.value}>
                                {d.label}
                              </option>
                            ))}
                          </AdminSelect>
                        ) : u.paid_status?.paid_until ? (
                          new Date(
                            u.paid_status.paid_until,
                          ).toLocaleDateString()
                        ) : u.paid_status?.is_paid ? (
                          "Lifetime"
                        ) : (
                          ""
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <AdminButton
                              onClick={() => saveSubscription(u.id)}
                              disabled={saving}
                              className="text-xs py-1"
                            >
                              {saving ? "Saving…" : "Save"}
                            </AdminButton>
                            <AdminButton
                              variant="secondary"
                              onClick={() => setEditingId(null)}
                              className="text-xs py-1"
                            >
                              {t("Cancel")}
                            </AdminButton>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <AdminButton
                              variant="secondary"
                              onClick={() => startEdit(u)}
                              className="text-xs py-1 text-brand-purple hover:bg-primary/5"
                            >
                              <PremiumBadge
                                size="xs"
                                minimal
                                className="mr-1"
                              />
                              {isActive ? "Extend" : "Grant"}
                            </AdminButton>
                            <AdminButton
                              variant="secondary"
                              onClick={() => openEdit(u)}
                              disabled={actionBusy || u.role === "admin"}
                              className="px-2.5 py-1.5"
                              title={
                                u.role === "admin"
                                  ? "Admin accounts are protected"
                                  : "Edit user"
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="sr-only">Edit user</span>
                            </AdminButton>
                            {(u.account_state ?? "active") === "active" && (
                              <AdminButton
                                variant="secondary"
                                onClick={() => {
                                  setStateReason("");
                                  setStateTarget({
                                    user: u,
                                    state: "suspended",
                                  });
                                }}
                                disabled={actionBusy || u.role === "admin"}
                                className="px-2.5 py-1.5"
                                title="Suspend this account"
                              >
                                <Ban className="h-3.5 w-3.5" />
                                <span className="sr-only">
                                  Suspend {u.full_name || u.email}
                                </span>
                              </AdminButton>
                            )}
                            {(u.account_state ?? "active") !== "revoked" && (
                              <AdminButton
                                variant="secondary"
                                onClick={() => {
                                  setStateReason("");
                                  setStateTarget({ user: u, state: "revoked" });
                                }}
                                disabled={actionBusy || u.role === "admin"}
                                className="px-2.5 py-1.5"
                                title="Revoke this account"
                              >
                                <ShieldOff className="h-3.5 w-3.5" />
                                <span className="sr-only">
                                  Revoke {u.full_name || u.email}
                                </span>
                              </AdminButton>
                            )}
                            {(u.account_state ?? "active") !== "active" && (
                              <AdminButton
                                variant="secondary"
                                onClick={() => {
                                  setStateReason("");
                                  setStateTarget({ user: u, state: "active" });
                                }}
                                disabled={actionBusy || u.role === "admin"}
                                className="px-2.5 py-1.5"
                                title="Restore access"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span className="sr-only">
                                  Restore {u.full_name || u.email}
                                </span>
                              </AdminButton>
                            )}
                            <AdminButton
                              variant="danger"
                              onClick={() => void deleteUser(u)}
                              disabled={actionBusy || u.role === "admin"}
                              className="px-2.5 py-1.5"
                              title={
                                u.role === "admin"
                                  ? "Admin accounts are protected"
                                  : "Delete user"
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Delete user</span>
                            </AdminButton>
                            {isActive && (
                              <AdminButton
                                variant="danger"
                                onClick={() => revokeSubscription(u.id)}
                                disabled={saving}
                                className="text-xs py-1"
                              >
                                {t("Revoke")}
                              </AdminButton>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>
      <AdminModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editingUser ? "Edit user" : "Invite user"}
        description="Manage basic user profile details."
        maxWidth="max-w-xl"
      >
        <form onSubmit={saveUser} className="space-y-4">
          <AdminField
            label="Email address"
            hint={
              editingUser
                ? "Changing the email updates the account sign-in address."
                : "The user will receive an invitation email."
            }
          >
            <AdminInput
              type="email"
              required
              autoComplete="email"
              value={form.email}
              disabled={!!editingUser}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </AdminField>
          <AdminField label="Full name">
            <AdminInput
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </AdminField>
          <AdminField
            label="Registered country"
            hint="Choose the user's reported registration country; this is not independently verified."
          >
            <AdminSelect
              required
              value={form.country_code}
              onChange={(e) =>
                setForm({ ...form, country_code: e.target.value })
              }
            >
              <option value="">Unset</option>
              {COUNTRY_OPTIONS.flatMap((g) => g.countries).map((c) => (
                <option key={c.code} value={c.code}>
                  {getCountryFlag(c.code)} {c.name} ({c.code}){" "}
                  {getCountryDialCode(c.code)
                    ? `+${getCountryDialCode(c.code)}`
                    : ""}
                </option>
              ))}
            </AdminSelect>
          </AdminField>
          <AdminField label="Mobile / Phone number">
            <AdminInput
              type="tel"
              required
              value={form.phone}
              placeholder={
                form.country_code
                  ? dialCodePlaceholder(form.country_code)
                  : "Select country first"
              }
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </AdminField>
          <AdminField
            label="Location (City, State / Region)"
            hint="Required for both Client and Pro accounts to ensure localized pricing and contractor dispatch."
          >
            <AdminInput
              value={form.location}
              placeholder="e.g. Lagos, Nigeria or Austin, Texas"
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </AdminField>
          <AdminField
            label="Professional credential suffix"
            hint="Prints after the reviewer's name on documents, and only while you have verified it."
          >
            <AdminInput
              value={form.credential_suffix}
              maxLength={60}
              placeholder="e.g. FNSE, COREN R.12345"
              onChange={(e) =>
                setForm({
                  ...form,
                  credential_suffix: e.target.value,
                  // A changed claim is an unchecked claim: drop the stamp.
                  credential_verified: false,
                })
              }
            />
            <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                aria-label="Credential verified"
                checked={form.credential_verified}
                onChange={(e) =>
                  setForm({ ...form, credential_verified: e.target.checked })
                }
              />
              I verified this credential against the register
            </label>
          </AdminField>
          {form.country_code === "NG" ? (
            <AdminField
              label="National Identification Number (NIN)"
              hint="11-digit official Nigerian identity number (NIMC standard)."
            >
              <AdminInput
                value={form.nin_number}
                maxLength={11}
                placeholder="11-digit NIN (e.g. 12345678901)"
                onChange={(e) =>
                  setForm({
                    ...form,
                    nin_number: e.target.value.replace(/\D/g, "").slice(0, 11),
                  })
                }
              />
            </AdminField>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AdminField label="Government ID Type">
                <AdminSelect
                  value={form.government_id_type}
                  onChange={(e) =>
                    setForm({ ...form, government_id_type: e.target.value })
                  }
                >
                  <option value="national_id">National ID Card</option>
                  <option value="passport">International Passport</option>
                  <option value="drivers_license">Driver's License</option>
                  <option value="voters_card">Voter's Card</option>
                  <option value="tax_id">Tax ID (TIN / SSN)</option>
                </AdminSelect>
              </AdminField>
              <AdminField label="Government ID Number">
                <AdminInput
                  value={form.government_id_number}
                  placeholder="e.g. P12345678 or DL-892301"
                  maxLength={30}
                  onChange={(e) =>
                    setForm({ ...form, government_id_number: e.target.value })
                  }
                />
              </AdminField>
            </div>
          )}
          <AdminField label="Account type">
            <AdminSelect
              value={form.account_type}
              onChange={(e) =>
                setForm({ ...form, account_type: e.target.value })
              }
            >
              <option value="client">Client</option>
              <option value="pro_worker">Professional</option>
            </AdminSelect>
          </AdminField>
          {form.account_type === "pro_worker" && (
            <>
              <AdminField
                label="Professional name"
                hint="Shown in the directory instead of the account name."
              >
                <AdminInput
                  value={form.display_name}
                  onChange={(e) =>
                    setForm({ ...form, display_name: e.target.value })
                  }
                />
              </AdminField>
              <AdminField label="Business name">
                <AdminInput
                  value={form.business_name}
                  onChange={(e) =>
                    setForm({ ...form, business_name: e.target.value })
                  }
                />
              </AdminField>
              <AdminField label="Years of experience">
                <AdminInput
                  inputMode="numeric"
                  value={form.years_experience}
                  onChange={(e) =>
                    setForm({ ...form, years_experience: e.target.value })
                  }
                />
              </AdminField>
              <AdminField label="Availability">
                <AdminSelect
                  value={form.availability}
                  onChange={(e) =>
                    setForm({ ...form, availability: e.target.value })
                  }
                >
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="unavailable">Unavailable</option>
                </AdminSelect>
              </AdminField>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.is_listed}
                  onChange={(e) =>
                    setForm({ ...form, is_listed: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-border"
                />
                List this professional in the directory
              </label>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <AdminButton
              variant="secondary"
              onClick={() => setEditorOpen(false)}
            >
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={actionBusy}>
              {actionBusy ? (
                "Saving…"
              ) : editingUser ? (
                "Save changes"
              ) : (
                <>
                  <Mail className="h-4 w-4" /> Send invite
                </>
              )}
            </AdminButton>
          </div>
        </form>
      </AdminModal>
      <AdminModal
        open={!!stateTarget}
        onClose={() => setStateTarget(null)}
        title={
          stateTarget?.state === "suspended"
            ? "Suspend account"
            : stateTarget?.state === "revoked"
              ? "Revoke account"
              : "Restore access"
        }
        description={
          stateTarget?.state === "active"
            ? "The person can sign in again. A suspended professional stays unlisted until you verify them."
            : "The person is signed out and blocked from signing in. Their records, orders and contracts are kept."
        }
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {stateTarget?.user.full_name || stateTarget?.user.email}
          </p>
          {stateTarget?.state !== "active" && (
            <AdminField
              label="Reason"
              hint="Kept in the account history. At least 3 characters."
            >
              <AdminInput
                value={stateReason}
                onChange={(e) => setStateReason(e.target.value)}
                placeholder="Why is this account being closed?"
              />
            </AdminField>
          )}
          <div className="flex justify-end gap-2">
            <AdminButton
              variant="secondary"
              onClick={() => setStateTarget(null)}
            >
              Cancel
            </AdminButton>
            <AdminButton
              onClick={() => void applyState()}
              disabled={
                actionBusy ||
                (stateTarget?.state !== "active" &&
                  stateReason.trim().length < 3)
              }
            >
              {actionBusy ? "Saving…" : "Confirm"}
            </AdminButton>
          </div>
        </div>
      </AdminModal>
      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-300">
        <p className="font-semibold">{t("Subscription Management")}</p>
        <p className="mt-1">
          Grant, extend, or revoke premium access for any user. Paid subscribers
          get access to all FRELUX engineering tools, calculators, and AI
          features. Granting access requires the admin RLS policy on{" "}
          <code className="rounded bg-blue-100 px-1 dark:bg-blue-900/40">
            user_paid_status
          </code>{" "}
          table.
        </p>
      </div>
      <AdminPagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(0);
        }}
      />
    </>
  );
}
