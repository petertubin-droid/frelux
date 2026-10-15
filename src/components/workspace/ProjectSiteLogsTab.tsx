import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  Users,
  Sun,
  CloudRain,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Package,
  Wrench,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  FileCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { DbContractorProject } from "@/types/database";
import type { ProjectSiteLog, MaterialUsageRecord } from "@/types/workspace";
import {
  fetchProjectSiteLogs,
  createProjectSiteLog,
  updateProjectSiteLogStatus,
} from "@/lib/workspace/workspace-service";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import { Textarea } from "@/components/ui/shadcn/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import { useToast } from "@/components/ui/Toast";

interface Props {
  project: DbContractorProject;
}

export const ProjectSiteLogsTab: React.FC<Props> = ({ project }) => {
  const { user } = useAuth();
  const { can, currentRole, activeWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [logs, setLogs] = useState<ProjectSiteLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New log form state
  const [logDate, setLogDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [shift, setShift] = useState<"day" | "night" | "weekend">("day");
  const [weatherCondition, setWeatherCondition] = useState("Clear / Sunny");
  const [temperatureCelsius, setTemperatureCelsius] = useState<string>("28");
  const [workersCount, setWorkersCount] = useState<number>(6);
  const [workPerformed, setWorkPerformed] = useState("");
  const [equipmentOnSite, setEquipmentOnSite] = useState("");
  const [safetyIncidents, setSafetyIncidents] = useState("");
  const [delaysIssues, setDelaysIssues] = useState("");

  // Material usage rows
  const [materials, setMaterials] = useState<MaterialUsageRecord[]>([
    { material_name: "", quantity: 0, unit: "units", purpose: "" },
  ]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await fetchProjectSiteLogs(project.id);
      if (error) {
        toast({
          title: "Failed to load site logs",
          message: error,
          variant: "error",
        });
      } else {
        setLogs(data);
      }
    } finally {
      setLoading(false);
    }
  }, [project.id, toast]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleAddMaterialRow = () => {
    setMaterials((prev) => [
      ...prev,
      { material_name: "", quantity: 0, unit: "bags", purpose: "" },
    ]);
  };

  const handleRemoveMaterialRow = (idx: number) => {
    setMaterials((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMaterialChange = (
    idx: number,
    field: keyof MaterialUsageRecord,
    val: unknown,
  ) => {
    setMaterials((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!workPerformed.trim()) {
      toast({
        title: "Work performed description is required",
        variant: "error",
      });
      return;
    }

    setSubmitting(true);
    try {
      const validMaterials = materials.filter(
        (m) => m.material_name.trim().length > 0 && m.quantity > 0,
      );

      const res = await createProjectSiteLog({
        project_id: project.id,
        workspace_id: project.workspace_id || activeWorkspace?.id || null,
        created_by: user.id,
        log_date: logDate,
        shift,
        weather_condition: weatherCondition || null,
        temperature_celsius: temperatureCelsius
          ? parseFloat(temperatureCelsius)
          : null,
        workers_count: Number(workersCount) || 0,
        work_performed: workPerformed.trim(),
        material_usage: validMaterials,
        equipment_on_site: equipmentOnSite.trim() || null,
        safety_incidents: safetyIncidents.trim() || null,
        delays_issues: delaysIssues.trim() || null,
        attachments: [],
        status: "submitted",
      });

      if (res.error) {
        toast({
          title: "Error submitting site log",
          message: res.error,
          variant: "error",
        });
      } else {
        toast({
          title: "Daily site log recorded successfully!",
          variant: "success",
        });
        setShowCreate(false);
        setWorkPerformed("");
        setMaterials([
          { material_name: "", quantity: 0, unit: "units", purpose: "" },
        ]);
        setEquipmentOnSite("");
        setSafetyIncidents("");
        setDelaysIssues("");
        await loadLogs();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (
    logId: string,
    status: "approved" | "rejected",
  ) => {
    const res = await updateProjectSiteLogStatus(logId, status);
    if (res.error) {
      toast({ title: "Update failed", message: res.error, variant: "error" });
    } else {
      toast({
        title: status === "approved" ? "Log Approved" : "Log Marked Rejected",
        variant: "success",
      });
      await loadLogs();
    }
  };

  const canCreateLog =
    can("canSubmitSiteLogs") ||
    project.user_id === user?.id ||
    ["owner", "project_manager", "contractor", "foreman"].includes(
      currentRole || "",
    );

  const canApproveLog =
    can("canManageMembers") ||
    project.user_id === user?.id ||
    ["owner", "project_manager"].includes(currentRole || "");

  return (
    <div className="space-y-6">
      {/* Header with summary and action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card/60">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Daily Field Site Logs
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time daily activity tracking, workforce attendance, weather
            conditions, and material consumption verified on site.
          </p>
        </div>
        {canCreateLog && (
          <Button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            {showCreate ? "Close Form" : "Record Daily Site Log"}
          </Button>
        )}
      </div>

      {/* New Log Entry Form */}
      {showCreate && (
        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-xl border border-primary/20 bg-card space-y-5 shadow-sm"
        >
          <div className="flex items-center justify-between border-b pb-3">
            <h4 className="font-semibold text-base flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" /> New Field Shift
              Report
            </h4>
            <span className="text-xs text-muted-foreground font-mono">
              Project #{project.name}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="log-date">Log Date</Label>
              <Input
                id="log-date"
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="shift">Shift</Label>
              <Select
                value={shift}
                onValueChange={(val: "day" | "night" | "weekend") =>
                  setShift(val)
                }
              >
                <SelectTrigger id="shift">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day Shift (Standard)</SelectItem>
                  <SelectItem value="night">Night Shift</SelectItem>
                  <SelectItem value="weekend">Weekend / Overtime</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="workers">Workers On Site</Label>
              <div className="relative">
                <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="workers"
                  type="number"
                  min="0"
                  className="pl-8"
                  value={workersCount}
                  onChange={(e) =>
                    setWorkersCount(parseInt(e.target.value) || 0)
                  }
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="weather">Weather & Temp (°C)</Label>
              <div className="flex gap-2">
                <Input
                  id="weather"
                  placeholder="e.g., Sunny / 31°C"
                  value={weatherCondition}
                  onChange={(e) => setWeatherCondition(e.target.value)}
                />
                <Input
                  id="temp"
                  placeholder="°C"
                  type="number"
                  className="w-20"
                  value={temperatureCelsius}
                  onChange={(e) => setTemperatureCelsius(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="work-performed">
              Work Performed Today <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="work-performed"
              rows={3}
              placeholder="Describe ongoing activities: e.g., Completed first coat screeding on second floor; foundation rebar tied for grid lines A to D; plumbing pressure test conducted."
              value={workPerformed}
              onChange={(e) => setWorkPerformed(e.target.value)}
              required
            />
          </div>

          {/* Material Usage Tracking */}
          <div className="space-y-2 border rounded-lg p-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-sm flex items-center gap-1.5">
                <Package className="h-4 w-4 text-primary" /> Materials Consumed
                Today
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMaterialRow}
                className="h-7 text-xs flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Add Material
              </Button>
            </div>

            <div className="space-y-2 mt-2">
              {materials.map((mat, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row gap-2 items-center"
                >
                  <Input
                    placeholder="Material name (e.g. Portland Cement)"
                    className="flex-1 text-sm"
                    value={mat.material_name}
                    onChange={(e) =>
                      handleMaterialChange(idx, "material_name", e.target.value)
                    }
                  />
                  <Input
                    type="number"
                    step="any"
                    placeholder="Qty"
                    className="w-24 text-sm"
                    value={mat.quantity || ""}
                    onChange={(e) =>
                      handleMaterialChange(
                        idx,
                        "quantity",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                  <Input
                    placeholder="Unit (bags, m³, kg)"
                    className="w-28 text-sm"
                    value={mat.unit}
                    onChange={(e) =>
                      handleMaterialChange(idx, "unit", e.target.value)
                    }
                  />
                  <Input
                    placeholder="Purpose / Location"
                    className="flex-1 text-sm"
                    value={mat.purpose || ""}
                    onChange={(e) =>
                      handleMaterialChange(idx, "purpose", e.target.value)
                    }
                  />
                  {materials.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMaterialRow(idx)}
                      className="text-destructive h-8 px-2"
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="equipment" className="flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                Equipment / Machinery
              </Label>
              <Input
                id="equipment"
                placeholder="e.g. 1x 500L mixer, scaffolding, vibrator"
                value={equipmentOnSite}
                onChange={(e) => setEquipmentOnSite(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="delays" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Delays /
                Roadblocks
              </Label>
              <Input
                id="delays"
                placeholder="e.g. Power outage 2 hrs; cement truck late"
                value={delaysIssues}
                onChange={(e) => setDelaysIssues(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="safety" className="flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-destructive" /> Safety
                Incidents
              </Label>
              <Input
                id="safety"
                placeholder="e.g. Zero incidents; PPE enforced"
                value={safetyIncidents}
                onChange={(e) => setSafetyIncidents(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreate(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting Log..." : "Submit Site Log"}
            </Button>
          </div>
        </form>
      )}

      {/* Site Logs History List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading site logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed bg-card/40">
            <Calendar className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-semibold text-sm">No site logs recorded yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Field foremen and site managers can record daily shifts, worker
              headcounts, material consumption, and weather reports here.
            </p>
            {canCreateLog && !showCreate && (
              <Button
                size="sm"
                variant="outline"
                className="mt-4"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Record First Log
              </Button>
            )}
          </div>
        ) : (
          logs.map((log) => {
            const isExpanded = expandedId === log.id;
            const isApproved = log.status === "approved";
            const isRejected = log.status === "rejected";

            return (
              <div
                key={log.id}
                className="rounded-xl border bg-card transition-all duration-150 overflow-hidden"
              >
                <div
                  className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer hover:bg-accent/40"
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {new Date(log.log_date).getDate()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {new Date(log.log_date).toLocaleDateString(
                            undefined,
                            {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </span>
                        <span className="text-xs uppercase font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {log.shift} shift
                        </span>
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle className="h-3 w-3" /> Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                            <XCircle className="h-3 w-3" /> Rejected
                          </span>
                        )}
                        {!isApproved && !isRejected && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            Submitted (Pending Review)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {log.work_performed}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>{log.workers_count} workers</span>
                    </div>
                    {log.weather_condition && (
                      <div className="flex items-center gap-1">
                        <Sun className="h-3.5 w-3.5" />
                        <span>{log.weather_condition}</span>
                      </div>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t bg-muted/10 space-y-4 text-sm">
                    <div>
                      <h5 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        Work Performed
                      </h5>
                      <p className="whitespace-pre-wrap text-foreground">
                        {log.work_performed}
                      </p>
                    </div>

                    {log.material_usage && log.material_usage.length > 0 && (
                      <div>
                        <h5 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Package className="h-3.5 w-3.5" /> Material Usage
                        </h5>
                        <div className="overflow-x-auto rounded-lg border bg-card">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b bg-muted/40 text-left">
                                <th className="p-2">Material</th>
                                <th className="p-2">Quantity</th>
                                <th className="p-2">Purpose</th>
                              </tr>
                            </thead>
                            <tbody>
                              {log.material_usage.map((mat, i) => (
                                <tr key={i} className="border-b last:border-0">
                                  <td className="p-2 font-medium">
                                    {mat.material_name}
                                  </td>
                                  <td className="p-2">
                                    {mat.quantity} {mat.unit}
                                  </td>
                                  <td className="p-2 text-muted-foreground">
                                    {mat.purpose || "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {log.equipment_on_site && (
                        <div className="p-2.5 rounded-lg border bg-card">
                          <span className="font-semibold text-muted-foreground block mb-0.5">
                            Equipment on Site:
                          </span>
                          <span>{log.equipment_on_site}</span>
                        </div>
                      )}
                      {log.delays_issues && (
                        <div className="p-2.5 rounded-lg border bg-card">
                          <span className="font-semibold text-amber-600 block mb-0.5">
                            Delays / Issues:
                          </span>
                          <span>{log.delays_issues}</span>
                        </div>
                      )}
                      {log.safety_incidents && (
                        <div className="p-2.5 rounded-lg border bg-card md:col-span-2">
                          <span className="font-semibold text-rose-600 block mb-0.5">
                            Safety Reports / Incidents:
                          </span>
                          <span>{log.safety_incidents}</span>
                        </div>
                      )}
                    </div>

                    {/* Manager Approval Actions */}
                    {canApproveLog && (
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-xs text-muted-foreground">
                          Logged at {new Date(log.created_at).toLocaleString()}
                        </span>
                        <div className="flex items-center gap-2">
                          {!isApproved && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 text-xs h-7"
                              onClick={() =>
                                handleStatusChange(log.id, "approved")
                              }
                            >
                              <CheckCircle className="h-3 w-3 mr-1" /> Approve
                              Log
                            </Button>
                          )}
                          {!isRejected && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-rose-600 border-rose-500/30 hover:bg-rose-500/10 text-xs h-7"
                              onClick={() =>
                                handleStatusChange(log.id, "rejected")
                              }
                            >
                              <XCircle className="h-3 w-3 mr-1" /> Reject Log
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
