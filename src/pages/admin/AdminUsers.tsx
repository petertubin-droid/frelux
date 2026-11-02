import { useEffect, useState, useCallback, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
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
} from "lucide-react";
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
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    account_type: "client",
  });
  const [actionBusy, setActionBusy] = useState(false);

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
        `email.ilike.%${safeSearch}%,full_name.ilike.%${safeSearch}%`,
      );
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
  }, [page, pageSize, search]);

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
    setForm({ email: "", full_name: "", phone: "", account_type: "client" });
    setEditorOpen(true);
  }

  function openEdit(user: UserWithPaid) {
    setEditingUser(user);
    setForm({
      email: user.email ?? "",
      full_name: user.full_name ?? "",
      phone: user.phone ?? "",
      account_type: user.account_type ?? "client",
    });
    setEditorOpen(true);
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
        },
      },
    );
    setActionBusy(false);
    if (fnError || data?.error) {
      setError(data?.error || fnError?.message || "Could not save user.");
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
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
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
                  {t("Role")}
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
                    colSpan={6}
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
          <AdminField label="Phone">
            <AdminInput
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </AdminField>
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
