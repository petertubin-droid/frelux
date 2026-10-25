/**
 * SaveToProjectButton, reusable component for saving any calculator result
 * to a Project Workspace project or local device storage.
 * Works with any calculator result shape, just needs a title, type, and the raw data.
 */
import { useState, useEffect, useCallback } from "react";
import {
  FolderPlus,
  Loader2,
  Check,
  X,
  Folder,
  Save,
  Smartphone,
  LogIn,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { saveCalculationToProject } from "@/lib/project-intelligence";
import { saveLocalProject } from "@/lib/local-projects";
import { trackProjectSaveWithRewards } from "@/lib/rewards-integration";
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
  /** Raw calculation input data, stored as-is for audit trail */
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
  /** Compact mode, smaller button */
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
const PROJECT_TYPE_MAP: Record<string, DbContractorProject["project_type"]> = {
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
    if (showModal && user) loadProjects();
  }, [showModal, user, loadProjects]);

  function handleSaveIntentAndSignIn() {
    try {
      const pendingPayload = {
        calculatorType,
        calculatorSlug,
        calcTitle: calcTitle || `${calculatorSlug} calculation`,
        calcData,
        resultSummary,
        materials,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(
        "frelux_pending_calc_save",
        JSON.stringify(pendingPayload),
      );
    } catch (e) {
      if (import.meta.env.DEV)
        console.error("Failed to store pending calc intent:", e);
    }
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = `/login/?redirect=${encodeURIComponent(currentPath)}`;
  }

  // Check if we just authenticated and have a pending calculation to save
  useEffect(() => {
    if (!user) return;
    try {
      const savedRaw = sessionStorage.getItem("frelux_pending_calc_save");
      if (!savedRaw) return;
      const parsed = JSON.parse(savedRaw);
      // Ensure it is fresh (< 60 minutes) and matches this calculator slug/type
      if (Date.now() - (parsed.timestamp || 0) < 60 * 60 * 1000) {
        if (
          parsed.calculatorSlug === calculatorSlug ||
          parsed.calculatorType === calculatorType
        ) {
          setShowModal(true);
          // Retain pending payload until save or modal dismissal so hydrated values are preserved
          toast({
            title: "Ready to save!",
            message: "Choose a project to sync your pending calculation.",
            type: "info",
          });
        }
      } else {
        sessionStorage.removeItem("frelux_pending_calc_save");
      }
    } catch {
      sessionStorage.removeItem("frelux_pending_calc_save");
    }
  }, [user, calculatorSlug, calculatorType, toast]);

  function handleSaveLocalOnly() {
    const title = calcTitle || `${calculatorSlug} calculation`;
    const localTypeMap: Record<
      string,
      | "paint_calc"
      | "cost_estimate"
      | "screeding_calc"
      | "tile_calc"
      | "pop_calc"
      | "wall_finishing"
    > = {
      paint: "paint_calc",
      screeding: "screeding_calc",
      pop_ceiling: "pop_calc",
      tile: "tile_calc",
      cost: "cost_estimate",
      finish: "wall_finishing",
      tyrolene: "wall_finishing",
    };
    saveLocalProject(title, localTypeMap[mappedType] || "cost_estimate", {
      calcData,
      resultSummary,
      materials,
    });
    toast({
      title: "Calculation saved to device!",
      message: "View it anytime under My Projects.",
      type: "success",
    });
    setShowModal(false);
  }

  async function handleSave() {
    if (!user) {
      handleSaveLocalOnly();
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
      trackProjectSaveWithRewards();
      sessionStorage.removeItem("frelux_pending_calc_save");
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
    if (!user) {
      handleSaveLocalOnly();
      return;
    }
    if (!newProjectName.trim()) return;
    setSaving(true);
    try {
      const { data: proj, error: projErr } = await supabase
        .from("contractor_projects")
        .insert({
          name: newProjectName.trim(),
          project_type: PROJECT_TYPE_MAP[mappedType] || "multi_trade",
          building_type: "residential",
          status: "draft",
          user_id: user.id,
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
      trackProjectSaveWithRewards();
      sessionStorage.removeItem("frelux_pending_calc_save");
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

            {!user ? (
              <div className="space-y-4 py-2">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                  <Smartphone className="mx-auto h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold text-sm">Guest Mode</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    You can save this calculation directly to your device
                    storage right now, or sign in to sync with cloud projects.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5">
                  <Button
                    variant="ghost"
                    onClick={handleSaveLocalOnly}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all"
                  >
                    <Save className="h-4 w-4" /> Save to This Device
                  </Button>
                  <button
                    type="button"
                    onClick={handleSaveIntentAndSignIn}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted transition-all text-center"
                  >
                    <LogIn className="h-4 w-4" /> Sign In to Sync with Cloud
                  </button>
                </div>
              </div>
            ) : loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : showNewProject ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Create a new project to save this calculation to.
                </p>
                <label
                  htmlFor="save-to-project-new-name"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  Project name
                </label>
                <input
                  id="save-to-project-new-name"
                  aria-describedby="save-to-project-new-name-hint"
                  className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-primary/50 outline-none"
                  placeholder="Project name (e.g. 3-Bedroom House)"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  autoFocus
                />
                <p
                  id="save-to-project-new-name-hint"
                  className="text-xs text-muted-foreground"
                >
                  e.g. 3-Bedroom House
                </p>
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
                      className={`group flex h-auto w-full items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 hover:shadow-md ${
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
