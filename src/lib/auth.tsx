import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, getSupabase } from "@/lib/supabase-lazy";
import type { DbProfile, DbUserPaidStatus } from "@/types/database";
import { APPROVED_MARKET_CODES } from "@/lib/international/countries";
import { publishEntitlement } from "@/lib/entitlement-store";
import {
  DEVICE_SHORT_EDGE_KEY,
  DEVICE_IS_MOBILE_KEY,
  OAUTH_MOBILE_KEY,
  PHONE_MAX_SHORT_EDGE,
  deviceCssShortEdge,
  readStoredShortEdge,
  isMobileUserAgent,
} from "@/lib/display-viewport";

export type AccountType = "client" | "pro_worker";

import type { SubscriptionPlan } from "@/lib/subscription";

interface AuthState {
  session: Session | null;
  /** Plan tier of the signed-in user; absent until the paid status loads. */
  plan?: SubscriptionPlan;
  /** ISO date the current subscription runs to, when there is one. */
  subscriptionEnd?: string | null;
  user: User | null;
  profile: DbProfile | null;
  paidStatus: DbUserPaidStatus | null;
  isPaid: boolean;
  isAdmin: boolean;
  loading: boolean;
  configured: boolean;
}

interface SignUpResult {
  error: string | null;
  needsConfirmation: boolean;
}

interface SignInResult {
  error: string | null;
  isAdmin: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (
    email: string,
    password: string,
    accountType?: AccountType,
    metadata?: {
      phone?: string;
      country_code?: string;
      full_name?: string;
      location?: string;
      nin_number?: string;
      government_id_type?: string;
      government_id_number?: string;
      [key: string]: unknown;
    },
  ) => Promise<SignUpResult>;
  signInWithGoogle: (
    accountType?: AccountType,
    redirectTo?: string,
  ) => Promise<{ error: string | null }>;
  signInWithOtp: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  refreshPaidStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    paidStatus: null,
    isPaid: false,
    isAdmin: false,
    loading: true,
    configured: isSupabaseConfigured,
  });

  async function loadProfile(userId: string): Promise<DbProfile | null> {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, role, account_type, full_name, phone, country_code, avatar_url, marketplace_id, welcome_email_sent, created_at, updated_at",
      )
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      if (import.meta.env.DEV)
        console.error("[auth] Failed to load profile:", error.message);
      return null;
    }
    // Welcome email (owner directive 2026-10-08): every signup path
    // (email + password, Google OAuth, email OTP) lands here right
    // after the profile row is created. The flag is the client-side
    // hint; the edge function re-checks and sets it server-side, so
    // the send is at-most-once per user. Fire-and-forget: delivery
    // never blocks the auth flow and failures are silently ignored.
    if (
      data &&
      (data as Record<string, unknown>).welcome_email_sent === false
    ) {
      try {
        supabase.functions
          ?.invoke("send-welcome-email", { body: { user_id: userId } })
          .catch(() => {});
      } catch {
        // best effort only
      }
    }
    return data as DbProfile | null;
  }

  /**
   * Load the user's paid/subscription status from `user_paid_status`.
   * RLS allows users to read only their own row.
   */
  async function loadPaidStatus(
    userId: string,
  ): Promise<{ status: DbUserPaidStatus | null; isPaid: boolean }> {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("user_paid_status")
      .select(
        "user_id, is_paid, plan, paid_until, payment_provider, provider_customer_id, updated_at",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      if (import.meta.env.DEV)
        console.error("[auth] Failed to load paid status:", error.message);
      return { status: null, isPaid: false };
    }
    const status = data as DbUserPaidStatus | null;
    let isPaid = false;
    if (status && status.is_paid) {
      if (status.paid_until) {
        const expiry = new Date(status.paid_until).getTime();
        isPaid = Date.now() <= expiry;
      } else {
        isPaid = true; // paid with no expiry = lifetime
      }
    }
    return { status, isPaid };
  }

  async function refreshProfile() {
    if (!state.user) return;
    const profile = await loadProfile(state.user.id);
    const { status, isPaid } = await loadPaidStatus(state.user.id);
    setState((s) => ({
      ...s,
      profile,
      isAdmin: profile?.role === "admin",
      paidStatus: status,
      isPaid,
    }));
  }

  async function refreshPaidStatus() {
    if (!state.user) return;
    const { status, isPaid } = await loadPaidStatus(state.user.id);
    setState((s) => ({ ...s, paidStatus: status, isPaid }));
  }

  /**
   * Set account_type on the user's profile row after signup.
   * Falls back to upsert if the profile row doesn't exist yet (trigger may not have fired).
   */
  async function setAccountType(
    userId: string,
    _email: string,
    accountType: AccountType,
    extra?: {
      phone?: string;
      country_code?: string;
      full_name?: string;
      location?: string;
      nin_number?: string;
      government_id_type?: string;
      government_id_number?: string;
    },
  ) {
    const supabase = await getSupabase();
    const updatePayload: Record<string, unknown> = {
      account_type: accountType,
    };
    if (extra?.phone) updatePayload.phone = extra.phone;
    if (extra?.country_code) updatePayload.country_code = extra.country_code;
    if (extra?.full_name) updatePayload.full_name = extra.full_name;
    if (extra?.location) updatePayload.location = extra.location;
    if (extra?.nin_number) updatePayload.nin_number = extra.nin_number;
    if (extra?.government_id_type)
      updatePayload.government_id_type = extra.government_id_type;
    if (extra?.government_id_number)
      updatePayload.government_id_number = extra.government_id_number;

    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (updated) return;

    const { error: ensureError } = await supabase.rpc("ensure_own_profile", {
      requested_account_type: accountType,
      requested_phone: extra?.phone || null,
      requested_country_code: extra?.country_code || null,
    });
    if (ensureError) throw ensureError;
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    let mounted = true;

    getSupabase().then((supabase) => {
      supabase.auth
        .getSession()
        .then(async ({ data, error }) => {
          if (!mounted) return;
          if (error) {
            if (import.meta.env.DEV)
              console.error("[auth] getSession error:", error.message);
            setState({
              session: null,
              user: null,
              profile: null,
              paidStatus: null,
              isPaid: false,
              isAdmin: false,
              loading: false,
              configured: true,
            });
            return;
          }
          const session = data.session;
          const user = session?.user ?? null;
          const profile = user ? await loadProfile(user.id) : null;
          const { status: paidStatus, isPaid } = user
            ? await loadPaidStatus(user.id)
            : { status: null, isPaid: false };
          if (!mounted) return;
          setState({
            session,
            user,
            profile,
            paidStatus,
            isPaid,
            isAdmin: profile?.role === "admin",
            loading: false,
            configured: true,
          });
        })
        .catch((err) => {
          if (import.meta.env.DEV)
            console.error("[auth] getSession threw:", err);
          if (mounted) setState((s) => ({ ...s, loading: false }));
        });

      const { data: sub } = supabase.auth.onAuthStateChange(
        (event, session) => {
          (async () => {
            const user = session?.user ?? null;
            const profile = user ? await loadProfile(user.id) : null;
            const { status: paidStatus, isPaid } = user
              ? await loadPaidStatus(user.id)
              : { status: null, isPaid: false };
            if (!mounted) return;
            setState({
              session,
              user,
              profile,
              paidStatus,
              isPaid,
              isAdmin: profile?.role === "admin",
              loading: false,
              configured: true,
            });
          })();
        },
      );

      return () => {
        mounted = false;
        sub.subscription.unsubscribe();
      };
    }); // close getSupabase().then()
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signIn: async (email, password) => {
        const supabase = await getSupabase();
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) return { error: error.message, isAdmin: false };
        const user = data.user;
        const profile = user ? await loadProfile(user.id) : null;
        const { status: paidStatus, isPaid } = user
          ? await loadPaidStatus(user.id)
          : { status: null, isPaid: false };
        const isAdmin = profile?.role === "admin";
        setState((s) => ({
          ...s,
          session: data.session,
          user,
          profile,
          paidStatus,
          isPaid,
          isAdmin,
          loading: false,
        }));
        return { error: null, isAdmin };
      },
      signUp: async (email, password, accountType = "client", metadata) => {
        const supabase = await getSupabase();
        const phone = (metadata?.phone ?? "").trim();
        const countryCode = (metadata?.country_code ?? "").trim().toUpperCase();
        const fullName = (metadata?.full_name ?? "").trim();
        const location = (
          typeof metadata?.location === "string" ? metadata.location : ""
        ).trim();
        const ninNumber = (
          typeof metadata?.nin_number === "string" ? metadata.nin_number : ""
        ).trim();
        const governmentIdType = (
          typeof metadata?.government_id_type === "string"
            ? metadata.government_id_type
            : ""
        ).trim();
        const governmentIdNumber = (
          typeof metadata?.government_id_number === "string"
            ? metadata.government_id_number
            : ""
        ).trim();

        if (!/^\+\d{7,15}$/.test(phone)) {
          return {
            error: "A valid mobile number is required.",
            needsConfirmation: false,
          };
        }
        if (!APPROVED_MARKET_CODES.includes(countryCode)) {
          return {
            error: "Select a valid registration country.",
            needsConfirmation: false,
          };
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              account_type: accountType,
              ...metadata,
              phone,
              country_code: countryCode,
              full_name: fullName,
              location,
              nin_number: ninNumber,
              government_id_type: governmentIdType,
              government_id_number: governmentIdNumber,
            },
          },
        });
        if (error) return { error: error.message, needsConfirmation: false };
        const needsConfirmation = !data.session;
        // If auto-signed-in, set account type and metadata on profile immediately
        if (data.user && !needsConfirmation) {
          try {
            await setAccountType(data.user.id, email, accountType, {
              phone,
              country_code: countryCode,
              full_name: fullName,
              location,
              nin_number: ninNumber,
              government_id_type: governmentIdType,
              government_id_number: governmentIdNumber,
            });
          } catch (setupError) {
            if (import.meta.env.DEV)
              console.error("[auth] Signup profile setup failed:", setupError);
            return {
              error:
                "Your account was created, but profile setup did not finish. Please sign in again or try once more.",
              needsConfirmation: false,
            };
          }
          const profile = await loadProfile(data.user.id);
          const { status: paidStatus, isPaid } = await loadPaidStatus(
            data.user.id,
          );
          setState((s) => ({
            ...s,
            session: data.session,
            user: data.user,
            profile,
            paidStatus,
            isPaid,
            isAdmin: false,
            loading: false,
          }));
        }
        return { error: null, needsConfirmation };
      },
      signInWithGoogle: async (accountType, redirectTo) => {
        // Only signup has a pending profile choice; existing users must never be
        // silently changed from pro_worker to client during ordinary sign-in.
        if (accountType) {
          localStorage.setItem("frelux_pending_account_type", accountType);
        } else {
          localStorage.removeItem("frelux_pending_account_type");
        }
        try {
          const edge = deviceCssShortEdge();
          const stored = readStoredShortEdge();
          const phoneEdge =
            edge > 0 && edge <= PHONE_MAX_SHORT_EDGE
              ? edge
              : stored > 0 && stored <= PHONE_MAX_SHORT_EDGE
                ? stored
                : isMobileUserAgent()
                  ? 390
                  : 0;
          if (phoneEdge > 0 || isMobileUserAgent()) {
            localStorage.setItem(OAUTH_MOBILE_KEY, "1");
            localStorage.setItem(DEVICE_IS_MOBILE_KEY, "1");
            localStorage.setItem(
              DEVICE_SHORT_EDGE_KEY,
              String(Math.round(phoneEdge > 0 ? phoneEdge : 390)),
            );
          }
        } catch {
          /* ignore storage error */
        }
        const supabase = await getSupabase();
        const returnTarget = redirectTo || "/dashboard";
        const callbackUrl = `${window.location.origin}/login?redirect=${encodeURIComponent(returnTarget)}`;
        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: callbackUrl,
            },
          });
          if (error) localStorage.removeItem("frelux_pending_account_type");
          return { error: error ? error.message : null };
        } catch (error) {
          localStorage.removeItem("frelux_pending_account_type");
          return {
            error:
              error instanceof Error
                ? error.message
                : "Google sign-in could not be started.",
          };
        }
      },
      signInWithOtp: async (email) => {
        const supabase = await getSupabase();
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/login?redirect=/dashboard`,
          },
        });
        return { error: error ? error.message : null };
      },
      signOut: async () => {
        const supabase = await getSupabase();
        await supabase.auth.signOut();
        setState((s) => ({
          ...s,
          session: null,
          user: null,
          profile: null,
          paidStatus: null,
          isPaid: false,
          isAdmin: false,
        }));
      },
      resetPassword: async (email) => {
        const supabase = await getSupabase();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });
        return { error: error ? error.message : null };
      },
      refreshProfile,
      refreshPaidStatus,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );

  // Tell the paywalls what this account is. They read a store rather than the
  // context so a calculator can render without a provider and still be safe.
  useEffect(() => {
    publishEntitlement({ isPaid: state.isPaid, isAdmin: state.isAdmin });
  }, [state.isPaid, state.isAdmin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
/**
 * Same context, but null instead of throwing outside a provider.
 *
 * Used by components that can render in isolation (a share bar, a tool shell) so
 * a missing session degrades to "entitlement unknown" rather than a crash.
 */
export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext) ?? null;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useAuthSafe(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // A complete, honest no-op context for callers rendered outside the
    // provider: every member the contract requires is present, and the async
    // ones report that auth is unavailable rather than pretending to succeed.
    const unavailable = async () => ({ error: "Auth unavailable" });
    return {
      user: null,
      session: null,
      profile: null,
      paidStatus: null,
      isPaid: false,
      isAdmin: false,
      plan: "free",
      subscriptionEnd: null,
      loading: false,
      configured: false,
      signIn: async () => ({ error: "Auth unavailable", isAdmin: false }),
      signUp: async () => ({
        error: "Auth unavailable",
        needsConfirmation: false,
      }),
      signInWithGoogle: unavailable,
      signInWithOtp: unavailable,
      signOut: async () => {},
      resetPassword: unavailable,
      refreshProfile: async () => {},
      refreshPaidStatus: async () => {},
    };
  }
  return ctx;
}
