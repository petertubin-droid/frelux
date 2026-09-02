import { useState, useEffect } from "react";
import {
  Loader2,
  Plus,
  Save,
  X,
  Trash2,
  Edit,
  GripVertical,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchStageTemplates } from "@/lib/project-intelligence";
import type { DbProjectStageTemplate } from "@/types/database";
import { Button } from "@/components/ui/shadcn/button";

export default function AdminProjectStages() {
  const [stages, setStages] = useState<DbProjectStageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DbProjectStageTemplate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    stage_key: "",
    stage_name: "",
    description: "",
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchStageTemplates()
      .then((data) => {
        setStages(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!form.stage_key || !form.stage_name) return;
    const { error } = await supabase
      .from("project_stage_templates")
      .upsert(form, { onConflict: "stage_key" });
    if (error) {
      alert(error.message);
      return;
    }
    setShowForm(false);
    fetchStageTemplates().then(setStages);
    setForm({
      stage_key: "",
      stage_name: "",
      description: "",
      sort_order: 0,
      is_active: true,
    });
  }

  async function handleDelete(id: string) {
    if (confirm("Delete this stage template?")) {
      await supabase.from("project_stage_templates").delete().eq("id", id);
      fetchStageTemplates().then(setStages);
    }
  }

  const inputCls =
    "w-full rounded-lg border bg-background px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-primary/50 outline-none";
  const labelCls = "block text-sm font-medium mb-1";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Project Stages</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage configurable project progress stage templates.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm({
              stage_key: "",
              stage_name: "",
              description: "",
              sort_order: stages.length + 1,
              is_active: true,
            });
            setEditing(null);
            setShowForm(true);
          }}
          className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" />{" "}
          Add Stage
        </Button>
      </div>

      {showForm && (
        <div
          className="rounded-2xl border bg-card p-6 shadow-lg space-y-4"
          style={{ animation: "fadeInUp 0.3s ease-out" }}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{editing ? "Edit" : "Add"} Stage</h3>
            <Button
              onClick={() => setShowForm(false)}
              className="rounded-lg p-1.5 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Stage Key *</label>
              <input
                className={inputCls}
                value={form.stage_key}
                onChange={(e) =>
                  setForm({ ...form, stage_key: e.target.value })
                }
                placeholder="e.g. inspection"
                disabled={!!editing}
              />
            </div>
            <div>
              <label className={labelCls}>Stage Name *</label>
              <input
                className={inputCls}
                value={form.stage_name}
                onChange={(e) =>
                  setForm({ ...form, stage_name: e.target.value })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Description</label>
              <input
                className={inputCls}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Sort Order</label>
              <input
                type="number"
                className={inputCls}
                value={form.sort_order}
                onChange={(e) =>
                  setForm({ ...form, sort_order: parseInt(e.target.value) })
                }
              />
            </div>
          </div>
          <Button
            onClick={handleSave}
            className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Save className="h-4 w-4 group-hover:scale-110 transition-transform" />{" "}
            Save
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && (
        <div className="space-y-2">
          {stages.map((stage, _i) => (
            <div
              key={stage.id}
              className="group flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    #{stage.sort_order}
                  </span>
                  <h3 className="font-semibold">{stage.stage_name}</h3>
                </div>
                {stage.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {stage.description}
                  </p>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  onClick={() => {
                    setEditing(stage);
                    setForm({
                      stage_key: stage.stage_key,
                      stage_name: stage.stage_name,
                      description: stage.description || "",
                      sort_order: stage.sort_order,
                      is_active: stage.is_active,
                    });
                    setShowForm(true);
                  }}
                  className="rounded-lg p-2 hover:bg-muted transition-all hover:scale-110"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => handleDelete(stage.id)}
                  className="rounded-lg p-2 hover:bg-destructive/10 transition-all hover:scale-110"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
