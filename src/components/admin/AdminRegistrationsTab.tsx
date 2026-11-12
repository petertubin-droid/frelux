import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, UserPlus, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  AdminButton,
  AdminCard,
  StateMessage,
} from "@/components/admin/AdminUi";
import AdminPagination from "@/components/admin/AdminPagination";

/**
 * Who just joined.
 *
 * Professionals were visible only as a flat list, without dates, and client
 * accounts had no screen at all: a new pro or buyer could sit unreviewed and
 * nobody knew they had arrived. This lists both registries newest-first with the
 * signup date, so review starts from "who is new" rather than "search a name".
 *
 * One admin-only call (`admin_recent_registrations`) returns both lists and the
 * counts, so this does not read auth tables from the browser.
 */

interface ProRegistration {
  id: string;
  user_id: string;
  display_name: string | null;
  business_name: string | null;
  verification_status: string | null;
  created_at: string;
  email: string | null;
}

interface ClientRegistration {
  id: string;
  email: string | null;
  created_at: string;
}

interface Registrations {
  window_days: number;
  since: string;
  pros: ProRegistration[];
  clients: ClientRegistration[];
  pros_in_window: number;
  clients_in_window: number;
  pros_total: number;
  pros_pending: number;
  clients_total: number;
}

const WINDOWS = [7, 30, 90];

function formatWhen(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "—";
  return then.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isNew(iso: string, now = Date.now()): boolean {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return false;
  return now - then <= 7 * 86_400_000;
}

export default function AdminRegistrationsTab() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Registrations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // The register keeps growing: page it now rather than when it hurts.
  const [prosPage, setProsPage] = useState(0);
  const [clientsPage, setClientsPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: rpcError } = await supabase.rpc(
        "admin_recent_registrations",
        { p_days: days },
      );
      if (rpcError) throw rpcError;
      setData(result as Registrations);
    } catch {
      setError(
        "Registrations could not be read. If this is the first deploy, the admin_recent_registrations function still has to be applied to the database.",
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const term = search.trim().toLowerCase();

  useEffect(() => {
    setProsPage(0);
    setClientsPage(0);
  }, [term, days]);

  const pros = useMemo(
    () =>
      (data?.pros ?? []).filter(
        (pro) =>
          !term ||
          pro.display_name?.toLowerCase().includes(term) ||
          pro.business_name?.toLowerCase().includes(term) ||
          pro.email?.toLowerCase().includes(term),
      ),
    [data, term],
  );

  const clients = useMemo(
    () =>
      (data?.clients ?? []).filter(
        (client) => !term || client.email?.toLowerCase().includes(term),
      ),
    [data, term],
  );

  const pagedPros = pros.slice(
    prosPage * pageSize,
    prosPage * pageSize + pageSize,
  );
  const pagedClients = clients.slice(
    clientsPage * pageSize,
    clientsPage * pageSize + pageSize,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {WINDOWS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setDays(value)}
              aria-pressed={days === value}
              className={`min-h-8 rounded-lg px-3 text-xs font-semibold ${
                days === value
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground dark:border-white/10"
              }`}
            >
              Last {value} days
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="registration-search" className="sr-only">
            Search registrations
          </label>
          <input
            id="registration-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, business or email"
            className="min-h-9 w-full rounded-lg border border-border bg-background px-3 text-sm sm:w-64 dark:border-white/10"
          />
          <AdminButton onClick={load} disabled={loading}>
            {loading ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
            )}
            Refresh
          </AdminButton>
        </div>
      </div>

      {error && (
        <StateMessage
          type="error"
          title="Registrations unavailable"
          message={error}
        />
      )}

      {loading && !data && (
        <StateMessage
          type="loading"
          title="Reading registrations"
          message="Both the professional and client registers are read in one call."
        />
      )}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <AdminCard compact>
              <p className="admin-eyebrow">Professionals joined</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {data.pros_in_window}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.pros_total} in total · {data.pros_pending} awaiting
                verification
              </p>
            </AdminCard>
            <AdminCard compact>
              <p className="admin-eyebrow">Clients joined</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {data.clients_in_window}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.clients_total} buyer accounts in total
              </p>
            </AdminCard>
            <AdminCard compact>
              <p className="admin-eyebrow">Needs review</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {data.pros_pending}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                professionals awaiting a verification decision
              </p>
            </AdminCard>
          </div>

          <section>
            <div className="mb-2 flex items-center gap-2">
              <UserPlus
                aria-hidden="true"
                className="h-4 w-4 text-muted-foreground"
              />
              <h3 className="text-sm font-semibold text-foreground">
                Professionals ({pros.length})
              </h3>
            </div>
            {pros.length === 0 ? (
              <AdminCard compact>
                <p className="text-sm text-muted-foreground">
                  No professional signed up in this window.
                </p>
              </AdminCard>
            ) : (
              <div className="space-y-2">
                {pagedPros.map((pro) => (
                  <AdminCard key={pro.id} compact>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {pro.display_name ||
                            pro.business_name ||
                            "Unnamed profile"}
                          {isNew(pro.created_at) && (
                            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                              New
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {pro.business_name ? `${pro.business_name} · ` : ""}
                          {pro.email || "no email on file"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          Joined {formatWhen(pro.created_at)}
                        </p>
                        <p className="text-xs font-medium text-foreground">
                          {(pro.verification_status ?? "unverified").replace(
                            "_",
                            " ",
                          )}
                        </p>
                      </div>
                    </div>
                  </AdminCard>
                ))}
              </div>
            )}
            {pros.length > pageSize && (
              <AdminPagination
                page={prosPage}
                pageSize={pageSize}
                total={pros.length}
                onPageChange={setProsPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setProsPage(0);
                  setClientsPage(0);
                }}
              />
            )}
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2">
              <Users
                aria-hidden="true"
                className="h-4 w-4 text-muted-foreground"
              />
              <h3 className="text-sm font-semibold text-foreground">
                Clients ({clients.length})
              </h3>
            </div>
            {clients.length === 0 ? (
              <AdminCard compact>
                <p className="text-sm text-muted-foreground">
                  No client account was created in this window.
                </p>
              </AdminCard>
            ) : (
              <div className="space-y-2">
                {pagedClients.map((client) => (
                  <AdminCard key={client.id} compact>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-foreground">
                        {client.email || "no email on file"}
                        {isNew(client.created_at) && (
                          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                            New
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {formatWhen(client.created_at)}
                      </p>
                    </div>
                  </AdminCard>
                ))}
              </div>
            )}
            {clients.length > pageSize && (
              <AdminPagination
                page={clientsPage}
                pageSize={pageSize}
                total={clients.length}
                onPageChange={setClientsPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setClientsPage(0);
                  setProsPage(0);
                }}
              />
            )}
          </section>

          <p className="text-xs text-muted-foreground">
            Suspend, revoke, edit or delete an account in{" "}
            <a className="underline" href="/admin/users">
              Users
            </a>
            , where both registers are paginated and searchable.
          </p>
        </>
      )}
    </div>
  );
}
