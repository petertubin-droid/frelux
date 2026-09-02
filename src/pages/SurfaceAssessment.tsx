import { useState } from "react";
import type { DbSurfaceAssessment } from "@/types/database";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Shield,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Info,
  Save,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { useSeo } from "@/lib/seo";
import {
  getSurfaceRecommendations,
  createSurfaceAssessment,
} from "@/lib/project-intelligence";
import { Button } from "@/components/ui/shadcn/button";

const CONDITIONS = [
  {
    key: "new_wall",
    label: "New Wall",
    desc: "Freshly plastered or newly built wall",
    icon: "🧱",
  },
  {
    key: "previously_painted",
    label: "Previously Painted",
    desc: "Wall with existing paint layer",
    icon: "🎨",
  },
  {
    key: "smooth",
    label: "Smooth Surface",
    desc: "Even, well-prepared surface",
    icon: "✨",
  },
  {
    key: "rough",
    label: "Rough Surface",
    desc: "Uneven or textured surface",
    icon: "🪨",
  },
  {
    key: "dirty",
    label: "Dirty Surface",
    desc: "Dust, grease, or stains present",
    icon: "🧹",
  },
  {
    key: "damp",
    label: "Damp Affected",
    desc: "Moisture or water damage visible",
    icon: "💧",
  },
  {
    key: "cracked",
    label: "Cracked Surface",
    desc: "Visible cracks in the wall",
    icon: "⚠️",
  },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400",
  medium:
    "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400",
  low: "border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400",
};

export default function SurfaceAssessment() {
  useSeo({
    title: "Surface Condition Assessment: Wall Preparation Guide",
    description:
      "Assess your wall condition before painting. Get recommendations for surface preparation based on new, painted, rough, dirty, damp, or cracked surfaces.",
    canonicalPath: "/surface-assessment",
    ogType: "website",
  });
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const recommendations = selected ? getSurfaceRecommendations(selected) : [];

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      await createSurfaceAssessment({
        surface_condition: selected as DbSurfaceAssessment["surface_condition"],
        room_name: roomName || undefined,
        notes: notes || undefined,
      });
      toast({ title: "Assessment saved!", variant: "success" });
      setSaved(true);
    } catch (e) {
      toast({ title: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Surface Condition Assessment"
        subtitle="Identify wall conditions and get preparation recommendations before painting."
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Condition selector */}
        <div className="mb-8">
          <h3 className="font-semibold mb-4">Select the surface condition</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CONDITIONS.map((cond) => (
              <Button variant="ghost"
                key={cond.key}
                onClick={() => {
                  setSelected(cond.key);
                  setSaved(false);
                }}
                className={`group text-left rounded-xl border p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                  selected === cond.key
                    ? "border-primary bg-primary/5 shadow-md scale-[1.02]"
                    : "hover:border-primary/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform">
                    {cond.icon}
                  </span>
                  <div>
                    <h4 className="font-semibold text-sm">{cond.label}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {cond.desc}
                    </p>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {selected && recommendations.length > 0 && (
          <div
            className="space-y-6"
            style={{ animation: "fadeInUp 0.4s ease-out" }}
          >
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">
                  Preparation Recommendations
                </h3>
              </div>
              <div className="space-y-3">
                {recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 rounded-xl border p-4 ${PRIORITY_COLORS[rec.priority]}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {rec.priority === "high" ? (
                        <AlertTriangle className="h-5 w-5" />
                      ) : rec.priority === "medium" ? (
                        <Info className="h-5 w-5" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {rec.recommendation}
                      </p>
                      <span className="text-xs uppercase tracking-wide mt-1 block opacity-70">
                        {rec.priority} priority
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save assessment */}
            {!saved && (
              <div className="rounded-2xl border bg-card p-6 shadow-sm">
                <h3 className="font-semibold mb-4">Save This Assessment</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Room/Area Name
                    </label>
                    <input
                      className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-primary/50 outline-none"
                      placeholder="e.g. Master Bedroom"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Additional Notes
                    </label>
                    <input
                      className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-primary/50 outline-none"
                      placeholder="Optional notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
                <Button variant="ghost"
                  onClick={handleSave}
                  disabled={saving}
                  className="group mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                  )}{" "}
                  Save Assessment
                </Button>
              </div>
            )}

            {saved && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 mb-3" />
                <h3 className="font-semibold text-emerald-600 mb-2">
                  Assessment Saved!
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your surface assessment has been recorded. These
                  recommendations are separate from your paint quantity
                  calculations.
                </p>
                <Link
                  to="/paint-calculator"
                  className="group inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105"
                >
                  Continue to Paint Calculator{" "}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            )}

            {/* Info box */}
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex gap-2">
                <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Surface preparation recommendations are guidance only and do
                  not automatically change your paint bucket calculations. Paint
                  quantities are determined by the FRELUX calculator engine
                  based on your actual room dimensions.
                </p>
              </div>
            </div>
          </div>
        )}

        <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    </div>
  );
}
