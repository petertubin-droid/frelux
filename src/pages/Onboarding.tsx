import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  ArrowRight,
  Home,
  Paintbrush,
  Building2,
  Ruler,
  MapPin,
  Search,
  Briefcase,
  User,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { fetchLocations } from "@/lib/pro-connect";
import { classNames } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";

const PROJECT_GOALS = [
  {
    id: "painting",
    label: "Painting & Finishing",
    icon: Paintbrush,
    desc: "Wall paint, screeding, pop ceiling",
  },
  {
    id: "building",
    label: "Building & Construction",
    icon: Building2,
    desc: "Blocks, concrete, roofing, tiles",
  },
  {
    id: "estimating",
    label: "Cost Estimating",
    icon: Ruler,
    desc: "Budget planning & material quantities",
  },
  {
    id: "hiring",
    label: "Hiring Professionals",
    icon: Search,
    desc: "Find verified contractors",
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<
    "client" | "pro_worker" | null
  >(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login?redirect=/onboarding");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchLocations().then((locs) => {
      setStates([...new Set(locs.map((l) => l.state))].sort());
    });
  }, []);

  function toggleGoal(id: string) {
    setGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  }

  async function finish() {
    setSaving(true);
    if (user) {
      const updates: Record<string, unknown> = {
        onboarding_completed: true,
        onboarding_goals: goals,
        onboarding_state: selectedState || null,
      };

      // If user chose Pro Worker, set account_type
      if (accountType === "pro_worker") {
        updates.account_type = "pro_worker";
      }

      await supabase.from("profiles").update(updates).eq("id", user.id);
    }
    setSaving(false);

    // Route pro workers to the registration flow
    if (accountType === "pro_worker") {
      navigate("/pro-connect/register");
    } else {
      navigate("/");
    }
  }

  if (authLoading) return null;

  const totalSteps = accountType === "pro_worker" ? 4 : 3;

  return (
    <div className="mx-auto max-w-md py-8 sm:py-12">
      {/* Progress bar */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
          <div
            key={s}
            className={classNames(
              "h-1.5 rounded-full transition-all",
              s <= step
                ? "w-8 bg-primary"
                : "w-4 bg-muted dark:bg-white/10",
            )}
          />
        ))}
      </div>

      {/* Step 1: Account Type Selection */}
      {step === 1 && (
        <div>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              <Home className="h-10 w-10 text-brand-purple" />
            </div>
            <h1 className="text-2xl font-bold text-foreground dark:text-primary-foreground">
              Welcome to FRELUX
            </h1>
            <p className="mt-3 text-sm text-muted-foreground dark:text-muted-foreground">
              Plan your construction project with precision. Calculate
              materials, estimate costs, and connect with verified professionals
              — all in one place.
            </p>
          </div>

          <h2 className="mb-4 text-lg font-bold text-foreground dark:text-primary-foreground">
            How will you use FRELUX?
          </h2>

          <div className="space-y-3">
            {/* Client option */}
            <Button variant="ghost"
              onClick={() => {
                setAccountType("client");
                setStep(2);
              }}
              className={classNames(
                "flex w-full items-center gap-4 rounded-xl border-2 p-5 text-left transition-all",
                accountType === "client"
                  ? "border-brand-purple bg-primary/5"
                  : "border-border hover:border-border dark:border-white/10 dark:hover:border-white/20",
              )}
            >
              <div
                className={classNames(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
                  "bg-primary/10 text-brand-purple",
                )}
              >
                <User className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground dark:text-primary-foreground">
                  I'm a Client
                </p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-0.5">
                  Find professionals, estimate costs, and plan projects
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </Button>

            {/* Pro Worker option */}
            <Button variant="ghost"
              onClick={() => {
                setAccountType("pro_worker");
                setStep(2);
              }}
              className={classNames(
                "flex w-full items-center gap-4 rounded-xl border-2 p-5 text-left transition-all",
                accountType === "pro_worker"
                  ? "border-brand-purple bg-primary/5"
                  : "border-border hover:border-border dark:border-white/10 dark:hover:border-white/20",
              )}
            >
              <div
                className={classNames(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
                  "bg-primary/10 text-brand-purple",
                )}
              >
                <Briefcase className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground dark:text-primary-foreground">
                  I'm a Pro Worker
                </p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-0.5">
                  Offer services, get verified, and connect with clients
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>

          {accountType === "pro_worker" && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground dark:text-muted-foreground/80">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-purple" />
              <p>
                Pro Workers go through a verification process: mobile OTP, NIN
                KYC, and identity verification. Verified pros get badges and
                higher visibility in search results.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Project goals (for both types) */}
      {step === 2 && (
        <div>
          <h2 className="mb-1 text-xl font-bold text-foreground dark:text-primary-foreground">
            {accountType === "pro_worker"
              ? "What services do you offer?"
              : "What are you planning?"}
          </h2>
          <p className="mb-6 text-sm text-muted-foreground dark:text-muted-foreground">
            {accountType === "pro_worker"
              ? "Select all that apply. You can refine these later in your profile."
              : "Select all that apply. We'll tailor your experience."}
          </p>

          <div className="space-y-3">
            {PROJECT_GOALS.map((goal) => {
              const Icon = goal.icon;
              const selected = goals.includes(goal.id);
              return (
                <Button variant="ghost"
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  className={classNames(
                    "flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all",
                    selected
                      ? "border-brand-purple bg-primary/5"
                      : "border-border hover:border-border dark:border-white/10 dark:hover:border-white/20",
                  )}
                >
                  <div
                    className={classNames(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      selected
                        ? "bg-primary/10 text-brand-purple"
                        : "bg-muted text-muted-foreground dark:bg-white/5",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p
                      className={classNames(
                        "text-sm font-semibold",
                        selected
                          ? "text-brand-purple"
                          : "text-card-foreground dark:text-muted-foreground/60",
                      )}
                    >
                      {goal.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{goal.desc}</p>
                  </div>
                  {selected && (
                    <Check
                      aria-hidden="true"
                      className="h-5 w-5 text-brand-purple"
                    />
                  )}
                </Button>
              );
            })}
          </div>

          <div className="mt-6 flex gap-3">
            <Button variant="ghost"
              onClick={() => setStep(1)}
              className="rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground dark:border-white/10 dark:text-muted-foreground"
            >
              Back
            </Button>
            <Button variant="ghost"
              onClick={() => setStep(3)}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
            >
              Continue{" "}
              <ArrowRight aria-hidden="true" className="ml-1 inline h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Location */}
      {step === 3 && (
        <div>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <MapPin className="h-8 w-8 text-brand-purple" />
            </div>
            <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
              Your Location
            </h2>
            <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
              {accountType === "pro_worker"
                ? "Where do you operate? This helps clients find you."
                : "Help us show relevant professionals and material prices in your area."}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
              State
            </label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full rounded-xl border border-border px-4 py-3 text-sm dark:border-white/10 dark:bg-background"
            >
              <option value="">Select your state</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-8 flex gap-3">
            <Button variant="ghost"
              onClick={() => setStep(2)}
              className="rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground dark:border-white/10 dark:text-muted-foreground"
            >
              Back
            </Button>
            {accountType === "pro_worker" ? (
              <Button variant="ghost"
                onClick={() => setStep(4)}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
              >
                Continue{" "}
                <ArrowRight
                  aria-hidden="true"
                  className="ml-1 inline h-4 w-4"
                />
              </Button>
            ) : (
              <Button variant="default"
                onClick={finish}
                disabled={saving}
                className="flex-1 rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
              >
                {saving ? "Saving…" : "Done"}{" "}
                <Check aria-hidden="true" className="ml-1 inline h-4 w-4" />
              </Button>
            )}
          </div>

          {accountType !== "pro_worker" && (
            <Button variant="ghost"
              onClick={finish}
              className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground/80"
            >
              Skip for now
            </Button>
          )}
        </div>
      )}

      {/* Step 4: Pro Worker verification intro */}
      {step === 4 && accountType === "pro_worker" && (
        <div>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <ShieldCheck className="h-8 w-8 text-brand-purple" />
            </div>
            <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
              Verification Process
            </h2>
            <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
              FRELUX uses a tiered verification system to build trust. Complete
              these steps to increase your visibility.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-border p-4 dark:border-white/10">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                1
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                  Contact Verification
                </p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-0.5">
                  Verify your email and mobile number via OTP. Unlocks basic
                  directory listing.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border p-4 dark:border-white/10">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                2
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                  Identity Verification
                </p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-0.5">
                  Submit your NIN and government-issued ID. Admin reviews and
                  approves. Unlocks Worker Channels.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border p-4 dark:border-white/10">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                3
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                  FRELUX Pro Level
                </p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-0.5">
                  Earn through sustained excellence: reviews, portfolio, and
                  profile age. Awarded by FRELUX admins.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <Button variant="ghost"
              onClick={() => setStep(3)}
              className="rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground dark:border-white/10 dark:text-muted-foreground"
            >
              Back
            </Button>
            <Button variant="default"
              onClick={finish}
              disabled={saving}
              className="flex-1 rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Saving…" : "Continue to Profile Setup"}{" "}
              <ArrowRight aria-hidden="true" className="ml-1 inline h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
