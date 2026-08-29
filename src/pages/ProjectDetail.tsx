import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  TrendingUp,
  ClipboardList,
  FileText,
  Brain,
  Image as CheckCircle2,
  Circle,
  Loader2,
  Plus,
  Trash2,
  DollarSign,
  Sparkles,
  Calculator,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useSeo } from "@/lib/seo";
import { supabase } from "@/lib/supabase";
import {
  ShoppingItemWithActual,
  fetchProjectCalculations,
  fetchShoppingListWithActual,
  calculateShoppingTotals,
  fetchProjectProgressStages,
  fetchStageTemplates,
  initProjectProgress,
  updateProgressStage,
  calculateProgressPercentage,
} from "@/lib/project-intelligence";
import type {
  DbContractorProject,
  DbProjectCalculation,
  DbProjectProgressStage,
  DbProjectStageTemplate,
} from "@/types/database";

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

      const [calcs, shopping, progress, templates] = await Promise.all([
        fetchProjectCalculations(id),
        fetchShoppingListWithActual(id),
        fetchProjectProgressStages(id),
        fetchStageTemplates(),
      ]);
      setCalculations(calcs);
      setShoppingItems(shopping);
      setStages(progress);
      setStageTemplates(templates);
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
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                  tab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                }`}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
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
                <button
                  onClick={() => setTab("shopping")}
                  className="group inline-flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-600 hover:bg-amber-500/20 transition-all hover:scale-105"
                >
                  <ClipboardList className="h-4 w-4 group-hover:scale-110 transition-transform" />{" "}
                  View Shopping List
                </button>
                <button
                  onClick={() => setTab("progress")}
                  className="group inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-600 hover:bg-emerald-500/20 transition-all hover:scale-105"
                >
                  <CheckCircle2 className="h-4 w-4 group-hover:scale-110 transition-transform" />{" "}
                  Track Progress
                </button>
                <Link
                  to="/paint-comparison"
                  className="group inline-flex items-center gap-2 rounded-lg bg-purple-500/10 px-4 py-2.5 text-sm font-medium text-purple-600 hover:bg-purple-500/20 transition-all hover:scale-105"
                >
                  <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />{" "}
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
                      <button
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
                      </button>
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
                          <button
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
                          </button>
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
                <button
                  onClick={handleInitProgress}
                  className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" />{" "}
                  Enable Tracking
                </button>
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
                    <button
                      onClick={() =>
                        handleToggleStage(stage.id, stage.is_completed)
                      }
                      className={`mt-0.5 flex-shrink-0 rounded-full border-2 transition-all duration-300 hover:scale-110 ${stage.is_completed ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/30 hover:border-primary"}`}
                    >
                      <CheckCircle2
                        className={`h-6 w-6 transition-all ${stage.is_completed ? "text-white scale-100" : "text-transparent scale-0"}`}
                      />
                    </button>
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
            <p className="text-sm text-muted-foreground">
              Create professional estimates and share them securely with your
              clients for approval.
            </p>
          </div>
        )}

        {/* AI Assistant tab */}
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
                <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />{" "}
                Open AI Assistant
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
