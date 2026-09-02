import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  TrendingUp,
  ClipboardList,
  FileText,
  Brain,
  CheckCircle2,
  Images,
  Circle,
  Loader2,
  Plus,
  Trash2,
  DollarSign,
  Calculator,
  Crown,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useSeo } from "@/lib/seo";
import { supabase } from "@/lib/supabase";
import {
  ShoppingItemWithActual,
  fetchProjectCalculations,
  fetchShoppingListWithActual,
  calculateShoppingTotals,
  fetchClientEstimates,
  shareClientEstimate,
  fetchProjectProgressStages,
  fetchStageTemplates,
  initProjectProgress,
  updateProgressStage,
  calculateProgressPercentage,
} from "@/lib/project-intelligence";
import {
  fetchAttachments,
  deleteAttachment,
  uploadProjectAttachment,
} from "@/lib/contractor";
import type { DbProjectAttachment } from "@/types/database";
import type {
  DbContractorProject,
  DbProjectCalculation,
  DbProjectProgressStage,
  DbProjectStageTemplate,
  DbClientEstimate,
} from "@/types/database";
import { Button } from "@/components/ui/shadcn/button";

type Tab =
  | "overview"
  | "calculations"
  | "shopping"
  | "progress"
  | "client"
  | "gallery"
  | "ai";
const TABS: { key: Tab; label: string; icon: typeof TrendingUp }[] = [
  { key: "overview", label: "Overview", icon: TrendingUp },
  { key: "calculations", label: "Calculations", icon: Calculator },
  { key: "shopping", label: "Shopping", icon: ClipboardList },
  { key: "progress", label: "Progress", icon: CheckCircle2 },
  { key: "client", label: "Client", icon: FileText },
  { key: "gallery", label: "Gallery", icon: Images },
  { key: "ai", label: "AI Assistant", icon: Brain },
];

const fmt = (v: number) => "₦" + (v || 0).toLocaleString();

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  useSeo({
    title: "Project Details",
    description: "Manage your project details.",
    noIndex: true,
  });

  const [project, setProject] = useState<DbContractorProject | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [calculations, setCalculations] = useState<DbProjectCalculation[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItemWithActual[]>(
    [],
  );
  const [stages, setStages] = useState<DbProjectProgressStage[]>([]);
  const [stageTemplates, setStageTemplates] = useState<
    DbProjectStageTemplate[]
  >([]);
  const [attachments, setAttachments] = useState<DbProjectAttachment[]>([]);
  const [estimates, setEstimates] = useState<DbClientEstimate[]>([]);
  const [uploading, setUploading] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: proj } = await supabase
        .from("contractor_projects")
        .select("*")
        .eq("id", id)
        .single();
      if (proj) setProject(proj as DbContractorProject);
      else {
        navigate("/project-workspace");
        return;
      }

      const [calcs, shopping, progress, templates, attach, ests] =
        await Promise.all([
          fetchProjectCalculations(id),
          fetchShoppingListWithActual(id),
          fetchProjectProgressStages(id),
          fetchStageTemplates(),
          fetchAttachments(id),
          fetchClientEstimates(id),
        ]);
      setCalculations(calcs);
      setShoppingItems(shopping);
      setStages(progress);
      setStageTemplates(templates);
      setAttachments(attach);
      setEstimates(ests);
    } catch (e) {
      toast({ title: (e as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleInitProgress() {
    if (!id || !stageTemplates.length) return;
    try {
      const init = await initProjectProgress(id, stageTemplates);
      setStages(init);
      toast({ title: "Progress tracking enabled", variant: "success" });
    } catch (e) {
      toast({ title: (e as Error).message, variant: "error" });
    }
  }

  async function handleToggleStage(stageId: string, completed: boolean) {
    await updateProgressStage(stageId, { is_completed: !completed });
    setStages((prev) =>
      prev.map((s) =>
        s.id === stageId
          ? {
              ...s,
              is_completed: !completed,
              completed_at: !completed ? new Date().toISOString() : null,
            }
          : s,
      ),
    );
  }

  const shoppingTotals = calculateShoppingTotals(shoppingItems);
  const progressPercent = calculateProgressPercentage(stages);

  const _inputCls =
    "w-full rounded-lg border bg-background px-3 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none";

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  if (!project) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-7xl">
          <Link
            to="/project-workspace"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-3 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />{" "}
            Back to Workspace
          </Link>
          <div className="flex items-center justify-between py-3">
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                <span className="capitalize">
                  {project.project_type.replace("_", " ")}
                </span>
                {project.client_address && (
                  <span>• {project.client_address}</span>
                )}
                <span>
                  • Created {new Date(project.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Project Value</p>
                <p className="font-bold text-lg">
                  {fmt(project.total_project_cost)}
                </p>
              </div>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-px">
            {TABS.map((t) => (
              <Button variant="ghost"
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                  tab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                }`}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Overview tab */}
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Calculator,
                  label: "Calculations",
                  value: calculations.length,
                  color: "text-blue-500",
                },
                {
                  icon: ClipboardList,
                  label: "Shopping Items",
                  value: shoppingItems.length,
                  color: "text-amber-500",
                },
                {
                  icon: CheckCircle2,
                  label: "Progress",
                  value: progressPercent + "%",
                  color: "text-emerald-500",
                },
                {
                  icon: DollarSign,
                  label: "Est. Total",
                  value: fmt(shoppingTotals.estimatedTotal),
                  color: "text-primary",
                },
              ].map((s, i) => (
                <div
                  key={i}
                  className="group rounded-xl border bg-card p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                >
                  <s.icon
                    className={`h-5 w-5 mb-2 ${s.color} group-hover:scale-110 transition-transform`}
                  />
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
            {project.description && (
              <div className="rounded-xl border bg-card p-5">
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">
                  {project.description}
                </p>
              </div>
            )}
            <div className="rounded-xl border bg-card p-5">
              <h3 className="font-semibold mb-3">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/calculators"
                  className="group inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/20 transition-all hover:scale-105"
                >
                  <Calculator className="h-4 w-4 group-hover:scale-110 transition-transform" />{" "}
                  Add Calculation
                </Link>
                <Button variant="ghost"
                  onClick={() => setTab("shopping")}
                  className="group inline-flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-600 hover:bg-amber-500/20 transition-all hover:scale-105"
                >
                  <ClipboardList className="h-4 w-4 group-hover:scale-110 transition-transform" />{" "}
                  View Shopping List
                </Button>
                <Button variant="ghost"
                  onClick={() => setTab("progress")}
                  className="group inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-600 hover:bg-emerald-500/20 transition-all hover:scale-105"
                >
                  <CheckCircle2 className="h-4 w-4 group-hover:scale-110 transition-transform" />{" "}
                  Track Progress
                </Button>
                <Link
                  to="/paint-comparison"
                  className="group inline-flex items-center gap-2 rounded-lg bg-purple-500/10 px-4 py-2.5 text-sm font-medium text-purple-600 hover:bg-purple-500/20 transition-all hover:scale-105"
                >
                  <Crown className="h-4 w-4 group-hover:rotate-12 transition-transform" />{" "}
                  Compare Paints
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Calculations tab */}
        {tab === "calculations" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Saved Calculations</h3>
              <Link
                to="/calculators"
                className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
              >
                <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" />{" "}
                Add Calculation
              </Link>
            </div>
            {calculations.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed rounded-xl">
                <Calculator className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">
                  No calculations saved yet. Run a calculator and save the
                  result to this project.
                </p>
                <Link
                  to="/calculators"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105"
                >
                  Browse Calculators
                </Link>
              </div>
            ) : (
              <div className="grid gap-3">
                {calculations.map((calc) => (
                  <div
                    key={calc.id}
                    className="group rounded-xl border bg-card p-5 shadow-sm hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{calc.calc_title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 capitalize">
                          {calc.calculator_type.replace("_", " ")} •{" "}
                          {new Date(calc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        onClick={async () => {
                          await supabase
                            .from("project_calculations")
                            .delete()
                            .eq("id", calc.id);
                          setCalculations((prev) =>
                            prev.filter((c) => c.id !== calc.id),
                          );
                          toast({
                            title: "Calculation removed",
                            variant: "success",
                          });
                        }}
                        className="rounded-lg p-1.5 hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    {calc.materials?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {calc.materials.map((m, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-muted px-2.5 py-1 text-xs"
                          >
                            {m.name}: {m.quantity} {m.unit}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Shopping tab */}
        {tab === "shopping" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border bg-card p-5">
                <p className="text-xs text-muted-foreground mb-1">
                  Estimated Total
                </p>
                <p className="text-xl font-bold">
                  {fmt(shoppingTotals.estimatedTotal)}
                </p>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <p className="text-xs text-muted-foreground mb-1">
                  Actual Total
                </p>
                <p className="text-xl font-bold">
                  {fmt(shoppingTotals.actualTotal)}
                </p>
              </div>
              <div
                className={`rounded-xl border bg-card p-5 ${shoppingTotals.difference > 0 ? "border-red-500/30" : "border-emerald-500/30"}`}
              >
                <p className="text-xs text-muted-foreground mb-1">Difference</p>
                <p
                  className={`text-xl font-bold ${shoppingTotals.difference > 0 ? "text-red-500" : "text-emerald-500"}`}
                >
                  {shoppingTotals.difference > 0 ? "+" : ""}
                  {fmt(shoppingTotals.difference)}
                </p>
              </div>
            </div>
            {shoppingItems.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed rounded-xl">
                <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  No shopping items yet. Generate a list from your calculations.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted">
                      {[
                        "Item",
                        "Category",
                        "Qty",
                        "Unit",
                        "Est. Price",
                        "Actual Price",
                        "Status",
                      ].map((h) => (
                        <th
                          key={h}
                          className="p-3 text-left font-medium text-muted-foreground"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shoppingItems.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3 font-medium">{item.name}</td>
                        <td className="p-3 text-muted-foreground capitalize">
                          {item.category}
                        </td>
                        <td className="p-3">{item.quantity}</td>
                        <td className="p-3 text-muted-foreground">
                          {item.unit}
                        </td>
                        <td className="p-3">
                          {fmt(item.estimated_price * item.quantity)}
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            className="w-24 rounded border bg-background px-2 py-1 text-sm transition-all focus:ring-2 focus:ring-primary/50 outline-none"
                            placeholder="—"
                            defaultValue={item.actual_price || ""}
                            onBlur={async (e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                await supabase
                                  .from("project_shopping_list")
                                  .update({ actual_price: val })
                                  .eq("id", item.id);
                                setShoppingItems((prev) =>
                                  prev.map((s) =>
                                    s.id === item.id
                                      ? { ...s, actual_price: val }
                                      : s,
                                  ),
                                );
                                toast({
                                  title: "Price updated",
                                  variant: "success",
                                });
                              }
                            }}
                          />
                        </td>
                        <td className="p-3">
                          <Button variant="ghost"
                            onClick={async () => {
                              const newVal = !item.is_purchased;
                              await supabase
                                .from("project_shopping_list")
                                .update({ is_purchased: newVal })
                                .eq("id", item.id);
                              setShoppingItems((prev) =>
                                prev.map((s) =>
                                  s.id === item.id
                                    ? { ...s, is_purchased: newVal }
                                    : s,
                                ),
                              );
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all hover:scale-105 ${item.is_purchased ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}
                          >
                            {item.is_purchased ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" /> Purchased
                              </>
                            ) : (
                              <>
                                <Circle className="h-3 w-3" /> Pending
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Progress tab */}
        {tab === "progress" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Project Progress</h3>
                <p className="text-sm text-muted-foreground">
                  Track your project through each stage.
                </p>
              </div>
              {stages.length === 0 && stageTemplates.length > 0 && (
                <Button variant="ghost"
                  onClick={handleInitProgress}
                  className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" />{" "}
                  Enable Tracking
                </Button>
              )}
            </div>
            {stages.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-sm font-bold text-primary">
                    {progressPercent}%
                  </span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
            {stages.length > 0 ? (
              <div className="space-y-3">
                {stages.map((stage, i) => (
                  <div
                    key={stage.id}
                    className={`group flex items-start gap-4 rounded-xl border bg-card p-5 transition-all duration-300 hover:shadow-md ${stage.is_completed ? "border-emerald-500/30 bg-emerald-500/5" : ""}`}
                    style={{ opacity: stage.is_completed ? 0.8 : 1 }}
                  >
                    <Button variant="ghost"
                      onClick={() =>
                        handleToggleStage(stage.id, stage.is_completed)
                      }
                      className={`mt-0.5 flex-shrink-0 rounded-full border-2 transition-all duration-300 hover:scale-110 ${stage.is_completed ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/30 hover:border-primary"}`}
                    >
                      <CheckCircle2
                        className={`h-6 w-6 transition-all ${stage.is_completed ? "text-primary-foreground scale-100" : "text-transparent scale-0"}`}
                      />
                    </Button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          Stage {i + 1}
                        </span>
                        {stage.is_completed && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                            Completed
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold">{stage.stage_name}</h4>
                      {stage.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {stage.description}
                        </p>
                      )}
                      {stage.completed_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Completed on{" "}
                          {new Date(stage.completed_at).toLocaleDateString()}
                        </p>
                      )}
                      <input
                        className="mt-3 w-full rounded-lg border bg-background px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-primary/50 outline-none"
                        placeholder="Add notes for this stage..."
                        defaultValue={stage.notes || ""}
                        onBlur={async (e) => {
                          if (e.target.value !== (stage.notes || "")) {
                            await updateProgressStage(stage.id, {
                              notes: e.target.value,
                            });
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 border-2 border-dashed rounded-xl">
                <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">
                  Progress tracking not enabled for this project.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Client tab */}
        {tab === "client" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Client Estimates</h3>
              <Link
                to={`/project-workspace/${id}/client-estimate/new`}
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
              >
                <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" />{" "}
                Create Estimate
              </Link>
            </div>

            {estimates.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card p-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No estimates yet. Create your first estimate to share with
                  your client.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {estimates.map((est) => (
                  <div
                    key={est.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border bg-card p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{est.title}</p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border ${
                            est.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : est.status === "sent" || est.status === "viewed"
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                : est.status === "changes_requested"
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                  : "bg-muted text-muted-foreground border-muted"
                          }`}
                        >
                          {est.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {est.estimate_number} · {fmt(est.grand_total)}
                        {est.client_name && " · " + est.client_name}
                        {est.shared_at &&
                          " · Sent " +
                            new Date(est.shared_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {est.share_token ? (
                        <>
                          <Link
                            to={`/estimate/${est.share_token}`}
                            className="text-xs text-primary hover:underline"
                          >
                            View
                          </Link>
                          <Button
                            onClick={async () => {
                              try {
                                const url = `${window.location.origin}/estimate/${est.share_token}`;
                                await navigator.clipboard.writeText(url);
                                toast({
                                  title: "Share link copied!",
                                  variant: "success",
                                });
                              } catch {
                                toast({
                                  title: "Failed to copy link",
                                  variant: "error",
                                });
                              }
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Copy Link
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={async () => {
                            try {
                              const token = await shareClientEstimate(est.id);
                              const url = `${window.location.origin}/estimate/${token}`;
                              await navigator.clipboard.writeText(url);
                              toast({
                                title: "Share link copied!",
                                variant: "success",
                              });
                              loadData();
                            } catch (e) {
                              toast({
                                title: (e as Error).message,
                                variant: "error",
                              });
                            }
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          Share
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Assistant tab */}
        {tab === "gallery" && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Images className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Project Gallery</h3>
                </div>
                <label className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer transition-all">
                  <Plus className="h-4 w-4" />
                  {uploading ? "Uploading..." : "Upload Photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !id) return;
                      setUploading(true);
                      try {
                        const {
                          data: { user },
                        } = await supabase.auth.getUser();
                        if (!user) {
                          toast({
                            title: "Please sign in to upload",
                            variant: "error",
                          });
                          return;
                        }
                        const { data, error } = await uploadProjectAttachment(
                          id,
                          file,
                          user.id,
                        );
                        if (error) throw new Error(error);
                        if (data) setAttachments((prev) => [data, ...prev]);
                        toast({ title: "Photo uploaded", variant: "success" });
                      } catch (e) {
                        toast({
                          title: (e as Error).message,
                          variant: "error",
                        });
                      } finally {
                        setUploading(false);
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
              </div>

              {attachments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Images className="h-12 w-12 mb-3 opacity-40" />
                  <p className="text-sm">
                    No photos yet. Upload progress photos, before/after shots,
                    or project documents.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {attachments
                    .filter((a) => a.mime_type.startsWith("image/"))
                    .map((att) => (
                      <div
                        key={att.id}
                        className="group relative overflow-hidden rounded-lg border bg-muted"
                      >
                        <img
                          src={att.public_url}
                          alt={att.description || att.file_name}
                          className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                          <span className="text-xs text-primary-foreground truncate max-w-[70%]">
                            {att.file_name}
                          </span>
                          <Button
                            onClick={async () => {
                              try {
                                await deleteAttachment(att.id);
                                setAttachments((prev) =>
                                  prev.filter((a) => a.id !== att.id),
                                );
                                toast({
                                  title: "Photo deleted",
                                  variant: "success",
                                });
                              } catch (e) {
                                toast({
                                  title: (e as Error).message,
                                  variant: "error",
                                });
                              }
                            }}
                            className="rounded-md bg-destructive/80 p-1.5 text-primary-foreground hover:bg-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Non-image attachments */}
              {attachments.some((a) => !a.mime_type.startsWith("image/")) && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Other Files
                  </h4>
                  {attachments
                    .filter((a) => !a.mime_type.startsWith("image/"))
                    .map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between rounded-lg border px-4 py-3"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{att.file_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(att.file_size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={att.public_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            View
                          </a>
                          <Button
                            onClick={async () => {
                              try {
                                await deleteAttachment(att.id);
                                setAttachments((prev) =>
                                  prev.filter((a) => a.id !== att.id),
                                );
                                toast({
                                  title: "File deleted",
                                  variant: "success",
                                });
                              } catch (e) {
                                toast({
                                  title: (e as Error).message,
                                  variant: "error",
                                });
                              }
                            }}
                            className="rounded-md p-1 text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
        {tab === "ai" && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">AI Project Assistant</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Describe your project goals and the AI will help you identify
                what you need, recommend calculators, and guide you through the
                workflow.
              </p>
              <Link
                to="/ai-color-assistant"
                className="group inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/20 transition-all hover:scale-105"
              >
                <Crown className="h-4 w-4 group-hover:rotate-12 transition-transform" />{" "}
                Open AI Assistant
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
