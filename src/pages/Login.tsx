import { useState, useEffect } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  LogIn,
  AlertCircle,
  Lock,
  Mail,
  UserPlus,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
  User,
  HardHat,
  Loader2,
} from "lucide-react";
import { useAuth, type AccountType } from "@/lib/auth";

import Logo from "@/components/brand/Logo";
import { useSeo } from "@/lib/seo";
import { classNames } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";

type Mode = "signin" | "signup" | "reset";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function Login() {
  const { signIn, signUp, resetPassword, signInWithGoogle, user, configured } =
    useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("client");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useSeo({
    title: "Sign In or Create Account",
    description:
      "Sign in to your FRELUX PAINT CALC account or create a new one.",
    canonicalPath: "/login",
    noIndex: true,
  });

  useEffect(() => {
    const pending = localStorage.getItem("frelux_pending_account_type");
    if (pending && user) {
      (async () => {
        try {
          const { supabase } = await import("@/lib/supabase");
          const { error } = await supabase
            .from("profiles")
            .update({ account_type: pending })
            .eq("id", user.id);
          if (error) {
            if (import.meta.env.DEV)
              console.error("Failed to update account type:", error.message);
            return;
          }
          localStorage.removeItem("frelux_pending_account_type");
          setShowSuccess(true);
        } catch (err) {
          if (import.meta.env.DEV) console.error("Profile update failed:", err);
        }
      })();
    }
  }, [user]);

  if (user && !showSuccess) {
    return <Navigate to={redirectTo} replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    if (mode === "reset") {
      const { error } = await resetPassword(email.trim());
      setLoading(false);
      if (error) {
        setError(error);
        return;
      }
      setInfo(
        "Password reset instructions have been sent to your email if an account exists for it.",
      );
      return;
    }

    if (mode === "signup") {
      const result = await signUp(email.trim(), password, accountType);
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.needsConfirmation) {
        setInfo(
          "Account created! You can sign in now with your email and password.",
        );
        setMode("signin");
        setPassword("");
      } else {
        setShowSuccess(true);
        const postSignupRedirect =
          accountType === "pro_worker"
            ? "/pro-connect/register"
            : "/onboarding";
        setTimeout(() => navigate(postSignupRedirect), 2500);
      }
      return;
    }

    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    navigate(redirectTo);
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    const { error } = await signInWithGoogle(
      mode === "signup" ? accountType : "client",
    );
    if (error) {
      setError(error);
      setGoogleLoading(false);
    }
  }

  if (showSuccess) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-muted/50 px-4 py-10 dark:bg-background">
        <div
          className="pointer-events-none absolute inset-0 bg-grid"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/8 blur-[120px]"
          aria-hidden="true"
        />
        <div className="relative w-full max-w-sm text-center animate-fade-in-up">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground dark:text-primary-foreground">
            Account Created Successfully!
          </h1>
          <p className="mt-3 text-sm text-muted-foreground dark:text-muted-foreground">
            Welcome to FRELUX. Your{" "}
            <span className="font-semibold text-brand-purple dark:text-brand-purple-lighter">
              {accountType === "pro_worker" ? "Worker" : "Client"}
            </span>{" "}
            account is ready.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-brand-purple dark:text-brand-purple-lighter" />
            <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
              Redirecting to your dashboard...
            </p>
          </div>
          <div className="mt-8">
            <Link
              to={redirectTo}
              className="text-sm font-semibold text-brand-purple hover:underline dark:text-brand-purple-lighter"
            >
              Click here if not redirected
            </Link>
          </div>
          <div className="mt-8 flex justify-center">
            <Logo />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-muted/50 px-4 py-10 dark:bg-background">
      <div
        className="pointer-events-none absolute inset-0 bg-grid"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/8 blur-[120px]"
        aria-hidden="true"
      />
      <div className="relative w-full max-w-sm animate-fade-in-up">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="card p-6 shadow-premium sm:p-8 dark:border-white/5 dark:bg-card transition-all duration-300">
          <h1 className="font-display text-xl font-bold text-foreground dark:text-primary-foreground">
            {mode === "signin"
              ? "Sign in"
              : mode === "signup"
                ? "Create account"
                : "Reset password"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground dark:text-muted-foreground">
            {mode === "signin"
              ? "Sign in to access your projects, saved estimates, and AI features."
              : mode === "signup"
                ? "Create an account to save estimates and access premium features."
                : "Enter your email and we will send you reset instructions."}
          </p>
          {!configured && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-card-foreground dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p>Authentication is not configured. Please check back later.</p>
            </div>
          )}
          {info && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-card-foreground dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <p>{info}</p>
            </div>
          )}
          {mode === "signup" && (
            <div className="mt-5">
              <span className="block text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
                Account type
              </span>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Button variant="ghost"
                  type="button"
                  onClick={() => setAccountType("client")}
                  className={classNames(
                    "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                    accountType === "client"
                      ? "border-brand-purple bg-primary/5 dark:border-brand-purple-lighter dark:bg-primary/15"
                      : "border-border bg-card hover:border-border dark:border-white/10 dark:bg-background dark:hover:border-white/20",
                  )}
                >
                  <User
                    className={classNames(
                      "h-6 w-6",
                      accountType === "client"
                        ? "text-brand-purple dark:text-brand-purple-lighter"
                        : "text-muted-foreground dark:text-muted-foreground",
                    )}
                  />
                  <div className="text-center">
                    <p
                      className={classNames(
                        "text-sm font-bold",
                        accountType === "client"
                          ? "text-brand-purple dark:text-brand-purple-lighter"
                          : "text-card-foreground dark:text-muted-foreground/60",
                      )}
                    >
                      Client
                    </p>
                    <p className="text-[10px] text-muted-foreground dark:text-muted-foreground">
                      Estimate and save projects
                    </p>
                  </div>
                </Button>
                <Button variant="ghost"
                  type="button"
                  onClick={() => setAccountType("pro_worker")}
                  className={classNames(
                    "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                    accountType === "pro_worker"
                      ? "border-brand-purple bg-primary/5 dark:border-brand-purple-lighter dark:bg-primary/15"
                      : "border-border bg-card hover:border-border dark:border-white/10 dark:bg-background dark:hover:border-white/20",
                  )}
                >
                  <HardHat
                    className={classNames(
                      "h-6 w-6",
                      accountType === "pro_worker"
                        ? "text-brand-purple dark:text-brand-purple-lighter"
                        : "text-muted-foreground dark:text-muted-foreground",
                    )}
                  />
                  <div className="text-center">
                    <p
                      className={classNames(
                        "text-sm font-bold",
                        accountType === "pro_worker"
                          ? "text-brand-purple dark:text-brand-purple-lighter"
                          : "text-card-foreground dark:text-muted-foreground/60",
                      )}
                    >
                      Worker
                    </p>
                    <p className="text-[10px] text-muted-foreground dark:text-muted-foreground">
                      Offer your services
                    </p>
                  </div>
                </Button>
              </div>
            </div>
          )}
          {mode !== "reset" && (
            <div>
              <Button variant="ghost"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || !configured}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-sm transition-all hover:bg-muted/50 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/10 dark:bg-background dark:text-muted-foreground/60 dark:hover:bg-white/5"
              >
                <GoogleIcon />
                {googleLoading ? "Connecting..." : "Continue with Google"}
              </Button>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-muted dark:bg-white/10" />
                <span className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                  or
                </span>
                <div className="h-px flex-1 bg-muted dark:bg-white/10" />
              </div>
            </div>
          )}
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <label className="block">
              <span className="block text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
                Email
              </span>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-9"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </label>
            {mode !== "reset" && (
              <label className="block">
                <span className="block text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
                  Password
                </span>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-9"
                    placeholder="--------"
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    minLength={6}
                    required
                  />
                </div>
              </label>
            )}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}
            <Button variant="default"
              type="submit"
              disabled={loading || !configured}
              className="press-scale w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mode === "signin" ? (
                <LogIn className="h-4 w-4" />
              ) : mode === "signup" ? (
                <UserPlus className="h-4 w-4" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {loading
                ? "Please wait..."
                : mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : "Send reset link"}
            </Button>
            <div className="flex flex-col items-center gap-2 text-xs">
              {mode === "signin" && (
                <div className="flex flex-col items-center gap-2">
                  <Button variant="ghost"
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setError(null);
                      setInfo(null);
                    }}
                    className="font-semibold text-brand-purple hover:underline dark:text-brand-purple-lighter"
                  >
                    Need an account? Sign up
                  </Button>
                  <Button variant="ghost"
                    type="button"
                    onClick={() => {
                      setMode("reset");
                      setError(null);
                      setInfo(null);
                    }}
                    className="text-muted-foreground hover:text-brand-purple hover:underline dark:text-muted-foreground dark:hover:text-brand-purple-lighter"
                  >
                    Forgot your password?
                  </Button>
                </div>
              )}
              {mode === "signup" && (
                <Button variant="ghost"
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                    setInfo(null);
                  }}
                  className="font-semibold text-brand-purple hover:underline dark:text-brand-purple-lighter"
                >
                  Already have an account? Sign in
                </Button>
              )}
              {mode === "reset" && (
                <Button variant="ghost"
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                    setInfo(null);
                  }}
                  className="font-semibold text-brand-purple hover:underline dark:text-brand-purple-lighter"
                >
                  Back to sign in
                </Button>
              )}
            </div>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground dark:text-muted-foreground">
          <Link
            to="/"
            className="inline-flex items-center gap-1 hover:text-brand-purple dark:hover:text-brand-purple-lighter"
          >
            <ArrowLeft className="h-3 w-3" /> Back to website
          </Link>
        </p>
      </div>
    </div>
  );
}
