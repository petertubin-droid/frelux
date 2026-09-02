import { useState, useEffect } from "react";
import LocationPicker from "@/components/ui/LocationPicker";
import { useLocation } from "@/lib/location";
import { fetchLocations } from "@/lib/pro-connect";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Send, Loader2, Calculator, Info } from "lucide-react";
import { createListing } from "@/lib/marketplace";
import { useAuth } from "@/lib/auth";
import { PROJECT_TYPE_LABELS } from "@/types/marketplace";
import { useSeo } from "@/lib/seo";
import { getSafeError } from "@/lib/safeError";
import { Button } from "@/components/ui/shadcn/button";

const NIGERIAN_STATES = [
  "Lagos",
  "Abuja FCT",
  "Rivers",
  "Kano",
  "Oyo",
  "Kaduna",
  "Enugu",
  "Delta",
  "Edo",
  "Ogun",
  "Anambra",
  "Imo",
];

export default function PostListing() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  useSeo({
    description: "FRELUX marketplace",
    title: "Post a Job — FRELUX Marketplace",
    canonicalPath: "/marketplace/post",
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("painting");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [state, setState] = useState(profile?.full_name ? "" : "");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [userLocation, setUserLocation] =
    useState<ReturnType<typeof useLocation>["location"]>(null);
  const [dbLocations, setDbLocations] = useState<
    Awaited<ReturnType<typeof fetchLocations>>
  >([]);
  const [urgency, setUrgency] = useState("standard");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [scopeSummary, _setScopeSummary] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [estimateRef, setEstimateRef] = useState<string | null>(null);

  // Load DB locations
  useEffect(() => {
    fetchLocations()
      .then(setDbLocations)
      .catch(() => {});
  }, []);

  // Auto-fill state/city from user location
  useEffect(() => {
    if (userLocation?.state && !state) setState(userLocation.state);
    if (userLocation?.city && !city) setCity(userLocation.city);
  }, [userLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check for pre-filled data from estimate (passed via location state)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("estimate_ref");
    if (ref) {
      setEstimateRef(ref);
      // Pre-fill from query params if available
      const type = params.get("project_type");
      if (type) setProjectType(type);
      const bMin = params.get("budget_min");
      const bMax = params.get("budget_max");
      if (bMin) setBudgetMin(bMin);
      if (bMax) setBudgetMax(bMax);
      const t = params.get("title");
      if (t) setTitle(t);
    }
  }, []);

  async function handleSubmit() {
    if (!user) {
      navigate("/auth");
      return;
    }
    setError("");
    if (!title.trim()) {
      setError("Please enter a title for your job");
      return;
    }
    setSubmitting(true);
    try {
      const listing = await createListing({
        user_id: user.id,
        title: title.trim(),
        latitude: userLocation?.latitude || undefined,
        longitude: userLocation?.longitude || undefined,
        description: description.trim() || undefined,
        project_type: projectType,
        budget_min: budgetMin ? parseFloat(budgetMin) : undefined,
        budget_max: budgetMax ? parseFloat(budgetMax) : undefined,
        location_state: state || undefined,
        location_city: city || undefined,
        location_area: area || undefined,
        urgency,
        estimate_ref: estimateRef || undefined,
        scope_summary: scopeSummary || {},
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });
      navigate(`/marketplace/${listing.id}`);
    } catch (e) {
      setError(getSafeError(e, "Failed to post listing"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/50 dark:bg-background">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
        <Button
          onClick={() => navigate("/marketplace")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-purple dark:text-muted-foreground"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to
          Marketplace
        </Button>

        <h1 className="text-2xl font-bold text-foreground dark:text-primary-foreground">
          Post a Job
        </h1>
        <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
          Describe your project and get bids from verified professionals.
        </p>

        {estimateRef && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/5 border border-brand-purple/20 p-3 text-sm text-brand-purple">
            <Info aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>
              Pre-filled from your estimate. Adjust details as needed.
            </span>
          </div>
        )}

        {/* Form */}
        <div className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6 dark:border-white/5 dark:bg-card">
          {/* Title */}
          <div>
            <label className="text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
              Job Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Paint 3-bedroom flat in Lekki"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the scope of work, number of rooms, condition of walls, any specific requirements..."
              rows={4}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
            />
          </div>

          {/* Project type + urgency */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
                Project Type
              </label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
              >
                {Object.entries(PROJECT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
                Urgency
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
              >
                <option value="standard">Standard</option>
                <option value="urgent">Urgent</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>
          </div>

          {/* Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
                Budget Min (₦)
              </label>
              <input
                type="number"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                placeholder="100000"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
                Budget Max (₦)
              </label>
              <input
                type="number"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                placeholder="200000"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
              />
            </div>
          </div>

          {/* Quick location detection */}
          <div className="mb-2">
            <LocationPicker
              onLocationChange={setUserLocation}
              showRadius={false}
              compact
            />
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
                State
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
              >
                <option value="">Select state</option>
                {(dbLocations.length > 0
                  ? [...new Set(dbLocations.map((l) => l.state))].sort()
                  : NIGERIAN_STATES
                ).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Lekki"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
                Area
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Phase 1"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 border-t border-border/50 pt-4 dark:border-white/5">
            <Button variant="default"
              onClick={handleSubmit}
              disabled={submitting || !title.trim()}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold hover:/90 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Send aria-hidden="true" className="h-4 w-4" />
              )}
              Post Job
            </Button>
            <Button
              onClick={() => navigate("/marketplace")}
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground dark:border-white/10 dark:text-muted-foreground/80"
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Helper links */}
        {!estimateRef && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              to="/calculators"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:border-brand-purple hover:text-brand-purple dark:border-white/10 dark:text-muted-foreground"
            >
              <Calculator aria-hidden="true" className="h-4 w-4" /> Run a
              calculator first for accurate scope
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
