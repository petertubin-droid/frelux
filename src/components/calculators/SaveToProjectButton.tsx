/**
 * SaveToProjectButton — reusable component for saving any calculator result
 * to a Project Workspace project. Does NOT modify calculator methodology.
 * Works with any calculator result shape — just needs a title, type, and the raw data.
 */
import { useState, useEffect, useCallback } from "react";
import { FolderPlus, Loader2, Check, X, Folder, Save } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { saveCalculationToProject } from "@/lib/project-intelligence";
import type {
  DbContractorProject,
  DbProjectCalculation,
} from "@/types/database";
import { Button } from "@/components/ui/shadcn/button";

export interface SaveToProjectButtonProps {
  /** Calculator type slug (paint, screeding, pop_ceiling, tile, finish, tyrolene, cost, etc.) */
  calculatorType: string;
  /** Human-readable calculator slug for the calc record */
  calculatorSlug: string;
  /** Title for the saved calculation (auto-generated if omitted) */
  calcTitle?: string;
  /** Raw calculation input data — stored as-is for audit trail */
  calcData: object;
  /** Result summary (key numbers: area, buckets, cost, etc.) */
  resultSummary: Record<string, unknown>;
  /** Materials list with name, category, quantity, unit */
  materials?: Array<{
    name: string;
    category: string;
    quantity: number;
    unit: string;
    estimated_price?: number;
  }>;
  /** Compact mode — smaller button */
  compact?: boolean;
  /** Custom label */
  label?: string;
}

const TYPE_MAP: Record<string, string> = {
  paint: "paint",
  painting: "paint",
  paint_calc: "paint",
  screeding: "screeding",
  screed: "screeding",
  screeding_calc: "screeding",
  pop_ceiling: "pop_ceiling",
  pop: "pop_ceiling",
  pop_calc: "pop_ceiling",
  tile: "tile",
  tile_calc: "tile",
  finish: "finish",
  finishing: "finish",
  finish_estimate: "finish",
  tyrolene: "tyrolene",
  tyrolene_estimate: "tyrolene",
  cost: "cost",
  cost_estimate: "cost",
  paint_estimate: "cost",
  paint_cost: "cost",
  build_to_roof: "build_to_roof",
  structural: "structural",
  foundation: "foundation",
};

const VALID_TYPES = [
  "paint",
  "screeding",
  "pop_ceiling",
  "tile",
  "finish",
  "tyrolene",
  "cost",
  "build_to_roof",
  "structural",
  "foundation",
];

// Maps calculator types to valid contractor_projects.project_type values
const PROJECT_TYPE_MAP: Record<string, string> = {
  paint: "painting",
  screeding: "screeding",
  pop_ceiling: "pop_ceiling",
  tile: "tiling",
  finish: "painting",
  tyrolene: "painting",
  cost: "painting",
  build_to_roof: "multi_trade",
  structural: "multi_trade",
  foundation: "multi_trade",
};

export default function SaveToProjectButton({
  calculatorType,
  calculatorSlug,
  calcTitle,
  calcData,
  resultSummary,
  materials,
  compact = false,
  label = "Save to Project",
}: SaveToProjectButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [projects, setProjects] = useState<DbContractorProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const mappedType =
    TYPE_MAP[calculatorType] ||
    (VALID_TYPES.includes(calculatorType) ? calculatorType : "paint");

  const loadProjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("contractor_projects")
      .select("*")
      .not("status", "eq", "archived")
      .order("updated_at", { ascending: false });
    setProjects((data || []) as DbContractorProject[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (showModal) loadProjects();
  }, [showModal, loadProjects]);

  async function handleSave() {
    if (!user) {
      toast({ title: "Please sign in to save", type: "error" });
      return;
    }
    if (!selectedProject) {
      toast({ title: "Select a project first", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const title = calcTitle || `${calculatorSlug} calculation`;
      await saveCalculationToProject({
        project_id: selectedProject,
        calculator_type: mappedType as DbProjectCalculation["calculator_type"],
        calculator_slug: calculatorSlug,
        calc_title: title,
        calc_data: calcData,
        result_summary: resultSummary,
        materials: materials || [],
      });
      toast({ title: "Calculation saved to project!", type: "success" });
      setShowModal(false);
      setSelectedProject(null);
    } catch (e) {
      toast({ title: (e as Error).message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateAndSave() {
    if (!user || !newProjectName.trim()) return;
    setSaving(true);
    try {
      const { data: proj, error: projErr } = await supabase
        .from("contractor_projects")
        .insert({
          name: newProjectName,
          project_type: PROJECT_TYPE_MAP[mappedType] || "multi_trade",
          building_type: "residential",
          status: "draft",
        })
        .select()
        .single();
      if (projErr) throw projErr;

      await saveCalculationToProject({
        project_id: proj.id,
        calculator_type: mappedType as DbProjectCalculation["calculator_type"],
        calculator_slug: calculatorSlug,
        calc_title: calcTitle || `${calculatorSlug} calculation`,
        calc_data: calcData,
        result_summary: resultSummary,
        materials: materials || [],
      });
      toast({
        title: "Project created and calculation saved!",
        type: "success",
      });
      setShowModal(false);
      setShowNewProject(false);
      setNewProjectName("");
    } catch (e) {
      toast({ title: (e as Error).message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setShowModal(true)}
        className={
          compact
            ? "group inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-all hover:scale-105"
            : "group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        }
      >
        <FolderPlus
          className={
            compact
              ? "h-3.5 w-3.5"
              : "h-4 w-4 group-hover:rotate-12 transition-transform"
          }
        />
        {label}
      </Button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "fadeInScale 0.3s ease-out" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Save className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Save to Project</h2>
              </div>
              <Button
                variant="ghost"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 hover:bg-muted transition-all hover:scale-110"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : showNewProject ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Create a new project to save this calculation to.
                </p>
                <input
                  className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-primary/50 outline-none"
                  placeholder="Project name (e.g. 3-Bedroom House)"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setShowNewProject(false)}
                    className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-all"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleCreateAndSave}
                    disabled={saving || !newProjectName.trim()}
                    className="group flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <FolderPlus className="h-4 w-4 group-hover:rotate-12 transition-transform" />{" "}
                        Create & Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : projects.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <Folder className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">
                    You don't have any projects yet.
                  </p>
                  <Button
                    variant="ghost"
                    onClick={() => setShowNewProject(true)}
                    className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
                  >
                    <FolderPlus className="h-4 w-4 group-hover:rotate-12 transition-transform" />{" "}
                    Create First Project
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select a project to save this calculation to:
                </p>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {projects.map((proj) => (
                    <Button
                      variant="ghost"
                      key={proj.id}
                      onClick={() => setSelectedProject(proj.id)}
                      className={`group flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 hover:shadow-md ${
                        selectedProject === proj.id
                          ? "border-primary bg-primary/5 shadow-md scale-[1.01]"
                          : "hover:border-primary/50"
                      }`}
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{proj.name}</h3>
                        <p className="text-xs text-muted-foreground capitalize mt-0.5">
                          {proj.project_type.replace("_", " ")} • {proj.status}
                        </p>
                      </div>
                      {selectedProject === proj.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  onClick={() => setShowNewProject(true)}
                  className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <FolderPlus className="h-4 w-4 group-hover:rotate-12 transition-transform" />{" "}
                  Create new project instead
                </Button>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setShowModal(false)}
                    className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-all"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleSave}
                    disabled={saving || !selectedProject}
                    className="group flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 group-hover:scale-110 transition-transform" />{" "}
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
    </>
  );
}
