import { useEffect, useState } from "react";
import { Mail, Trash2, CheckCircle2, Archive, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  AdminHeader,
  AdminButton,
  StateMessage,
  AdminIconButton,
} from "@/components/admin/AdminUi";
import { AdminModal } from "@/components/admin/AdminModal";
import AdminPagination from "@/components/admin/AdminPagination";
import { classNames } from "@/lib/utils";

interface PartnershipInquiry {
  id: string;
  name: string;
  email: string;
  company: string | null;
  interest: string;
  message: string;
  status: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  new: "bg-accent-yellow/20 text-accent-yellow",
  reviewed: "bg-blue-100 text-blue-700",
  responded: "bg-accent-green/15 text-accent-green",
  archived: "bg-muted text-muted-foreground",
};

const INTEREST_LABELS: Record<string, string> = {
  investor: "Investor relations",
  partner: "Strategic partnership",
  collaborator: "Collaboration",
  other: "Other",
};

export default function AdminPartnershipInquiries() {
  const [items, setItems] = useState<PartnershipInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<PartnershipInquiry | null>(null);
  // Server-side pagination — inquiries accumulate with every submission.
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  async function load() {
    setLoading(true);
    setError(null);
    const [list, count] = await Promise.all([
      supabase
        .from("partnership_inquiries")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1),
      supabase
        .from("partnership_inquiries")
        .select("*", { count: "exact", head: true }),
    ]);
    if (list.error) setError(list.error.message);
    if (count.error) setError(count.error.message);
    setItems((list.data ?? []) as PartnershipInquiry[]);
    setTotal(count.count ?? list.data?.length ?? 0);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [page, pageSize]);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from("partnership_inquiries")
      .update({ status })
      .eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
    setViewing((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
  }

  async function del(id: string) {
    if (!confirm("Delete this inquiry? This cannot be undone.")) return;
    const { error } = await supabase
      .from("partnership_inquiries")
      .delete()
      .eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setItems((prev) => prev.filter((m) => m.id !== id));
    setViewing(null);
  }

  return (
    <>
      <AdminHeader
        title="Partnership Inquiries"
        subtitle="Submissions from the public Partners page: investors, strategic partners and collaborators."
      />
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {loading ? (
        <StateMessage
          type="loading"
          title="Loading…"
          message="Fetching partnership inquiries."
        />
      ) : items.length === 0 ? (
        <StateMessage
          type="empty"
          title="No inquiries"
          message="Partnership inquiries from the /partners form will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="card p-3">
              <div className="flex min-w-0 items-start gap-3">
                <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground truncate">
                      {item.name}
                      {item.company ? ` · ${item.company}` : ""}
                    </h3>
                    <span
                      className={classNames(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                        STATUS_STYLES[item.status] ?? STATUS_STYLES.new,
                      )}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground dark:text-muted-foreground">
                    {INTEREST_LABELS[item.interest] ?? item.interest} ·{" "}
                    {item.email} · {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <AdminButton
                  variant="secondary"
                  onClick={() => {
                    setViewing(item);
                    if (item.status === "new")
                      updateStatus(item.id, "reviewed");
                  }}
                >
                  <Mail className="h-3.5 w-3.5" /> View
                </AdminButton>
                <AdminIconButton
                  variant="danger"
                  type="button"
                  onClick={() => del(item.id)}
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </AdminIconButton>
              </div>
            </div>
          ))}
        </div>
      )}
      <AdminPagination
        page={page}
        pageSize={pageSize}
        total={total}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(0);
        }}
      />
      {viewing && (
        <AdminModal
          open
          onClose={() => setViewing(null)}
          title={`${viewing.name}${viewing.company ? ` · ${viewing.company}` : ""}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-1 text-sm text-muted-foreground dark:text-muted-foreground">
            <p>
              <span className="font-semibold text-card-foreground dark:text-muted-foreground/80">
                Interest:
              </span>{" "}
              {INTEREST_LABELS[viewing.interest] ?? viewing.interest}
            </p>
            <p>
              <span className="font-semibold text-card-foreground dark:text-muted-foreground/80">
                From:
              </span>{" "}
              {viewing.email}
            </p>
            <p>
              <span className="font-semibold text-card-foreground dark:text-muted-foreground/80">
                Date:
              </span>{" "}
              {new Date(viewing.created_at).toLocaleString()}
            </p>
          </div>
          <div className="mt-4 whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm text-card-foreground dark:bg-card-foreground/90 dark:text-muted-foreground/60">
            {viewing.message}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            <a
              href={`mailto:${viewing.email}?subject=${encodeURIComponent("Frelux partnerships")}`}
            >
              <AdminButton variant="secondary">
                <Mail className="h-4 w-4" /> Reply by email
              </AdminButton>
            </a>
            {viewing.status !== "responded" && (
              <AdminButton
                variant="secondary"
                onClick={() => updateStatus(viewing.id, "responded")}
              >
                <CheckCircle2 className="h-4 w-4" /> Mark responded
              </AdminButton>
            )}
            {viewing.status !== "archived" && (
              <AdminButton
                variant="secondary"
                onClick={() => updateStatus(viewing.id, "archived")}
              >
                <Archive className="h-4 w-4" /> Archive
              </AdminButton>
            )}
          </div>
        </AdminModal>
      )}
    </>
  );
}
