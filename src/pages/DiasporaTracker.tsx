/**
 * Diaspora Site Tracker: the owner's project list.
 *
 * A Nigerian owner abroad lands here, sees every project they hold or are party
 * to, with their own role on each, and can open one to the workspace. Projects
 * that do not exist are shown as an empty state rather than sample data.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Loader2, Plus, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/shadcn/button";
import { useSeo } from "@/lib/seo";
import {
  createProject,
  fetchMyTrackedProjects,
  fetchPlanLimits,
  type TrackedProject,
} from "@/lib/diaspora/queries";
import { ROLE_LABELS } from "@/lib/diaspora/permissions";

// Stored keys must match user_projects_project_type_check; the label is display only.
const PROJECT_TYPES = [
  { value: "residential", label: "Residential building" },
  { value: "commercial", label: "Commercial building" },
  { value: "industrial", label: "Industrial" },
  { value: "institutional", label: "Institutional" },
  { value: "renovation", label: "Renovation" },
  { value: "land_development", label: "Land development" },
  { value: "civil_works", label: "Civil works" },
  { value: "other", label: "Other" },
] as const;

export default function DiasporaTracker() {
  useSeo({
    title: "Diaspora Site Tracker | FRELUXTOOLS",
    description:
      "Monitor a construction project in Nigeria from abroad: daily site reports, verified expense approvals, material deliveries, milestone decisions and photographic evidence, with role-based access for owners, site managers, contractors and inspectors.",
    canonicalPath: "/diaspora-tracker",
  });

  const [projects, setProjects] = useState<TrackedProject[]>([]);
  const [plans, setPlans] = useState<
    {
      plan_key: string;
      display_name: string;
      max_projects: number | null;
      max_members_per_project: number | null;
      max_storage_mb: number | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: PROJECT_TYPES[0].value as string,
    budget: "",
    start: "",
    end: "",
    description: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [list, limits] = await Promise.all([
      fetchMyTrackedProjects(),
      fetchPlanLimits(),
    ]);
    setProjects(list);
    setPlans(limits as never);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    if (form.name.trim().length < 3) {
      setError("Give the project a name of at least three characters.");
      return;
    }
    setCreating(true);
    setError(null);
    const { projectId, error: createError } = await createProject({
      name: form.name.trim(),
      projectType: form.type,
      description: form.description || undefined,
      budget: form.budget ? Number(form.budget) : null,
      currency: "NGN",
      startDate: form.start || undefined,
      endDate: form.end || undefined,
    });
    setCreating(false);
    if (createError || !projectId) {
      setError(createError ?? "The project could not be created.");
      return;
    }
    setForm({
      name: "",
      type: PROJECT_TYPES[0].value as string,
      budget: "",
      start: "",
      end: "",
      description: "",
    });
    load();
  }

  return (
    <>
      <PageHeader
        variant="tool"
        eyebrow="Remote monitoring"
        title="Diaspora Site Tracker"
        subtitle="Follow a Nigerian build from anywhere: site reports, expenditure approvals, deliveries, milestones and evidence, with a clear record of who submitted and who approved what."
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Tools", path: "/tools" },
          { label: "Diaspora Site Tracker" },
        ]}
      />

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <div className="flex gap-3 rounded-xl border border-border/70 bg-muted/40 p-4 text-sm">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
          />
          <p>
            Photographs and documents are stored privately and opened through
            short-lived links. A receipt image is evidence, not verification:
            expenditure counts as approved only when the project owner approves
            it, and that decision is recorded.
          </p>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your projects</h2>
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {!loading && projects.length === 0 && (
            <p className="rounded-xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
              No projects yet. Create one below, or accept an invitation from an
              owner who has added you to theirs.
            </p>
          )}

          <ul className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/diaspora-tracker/${p.id}`}
                  className="block rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{p.name}</p>
                    {p.role && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                        {ROLE_LABELS[p.role]}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.building_type ?? p.project_type ?? "Project"} · created{" "}
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Create a project</h2>
          <div className="grid gap-3 rounded-xl border border-border/70 bg-card p-4 sm:grid-cols-2">
            <label className="text-xs sm:col-span-2">
              <span className="text-muted-foreground">Project name</span>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Lekki duplex, phase 1"
                className="mt-1 h-10 w-full rounded-md border border-border/70 bg-background px-3 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Project type</span>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value }))
                }
                className="mt-1 h-10 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
              >
                {PROJECT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">
                Budget (NGN, optional)
              </span>
              <input
                value={form.budget}
                onChange={(e) =>
                  setForm((f) => ({ ...f, budget: e.target.value }))
                }
                inputMode="decimal"
                placeholder="Set later if you prefer"
                className="mt-1 h-10 w-full rounded-md border border-border/70 bg-background px-3 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Expected start</span>
              <input
                type="date"
                value={form.start}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start: e.target.value }))
                }
                className="mt-1 h-10 w-full rounded-md border border-border/70 bg-background px-3 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Expected completion</span>
              <input
                type="date"
                value={form.end}
                onChange={(e) =>
                  setForm((f) => ({ ...f, end: e.target.value }))
                }
                className="mt-1 h-10 w-full rounded-md border border-border/70 bg-background px-3 text-sm"
              />
            </label>
            <div className="sm:col-span-2">
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus aria-hidden="true" className="mr-1 h-4 w-4" /> Create
                    project
                  </>
                )}
              </Button>
            </div>
          </div>
          {error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </section>

        {plans.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Plan limits</h2>
            <p className="text-sm text-muted-foreground">
              Limits are read from configuration, not hardcoded. Pricing is set
              on your FRELUX plan and is not shown here.
            </p>
            <div className="overflow-x-auto rounded-xl border border-border/70">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Plan</th>
                    <th className="px-3 py-2 font-medium">Projects</th>
                    <th className="px-3 py-2 font-medium">
                      Members per project
                    </th>
                    <th className="px-3 py-2 font-medium">Storage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {plans.map((p) => (
                    <tr key={p.plan_key}>
                      <td className="px-3 py-2 font-medium">
                        {p.display_name}
                      </td>
                      <td className="px-3 py-2">
                        {p.max_projects ?? "Custom"}
                      </td>
                      <td className="px-3 py-2">
                        {p.max_members_per_project ?? "Custom"}
                      </td>
                      <td className="px-3 py-2">
                        {p.max_storage_mb
                          ? `${(p.max_storage_mb / 1000).toFixed(1)} GB`
                          : "Custom"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Building2 aria-hidden="true" className="h-3.5 w-3.5" />
          Projects created here are the same records used by FRELUX project
          tools; nothing is duplicated.
        </p>
      </div>
    </>
  );
}
