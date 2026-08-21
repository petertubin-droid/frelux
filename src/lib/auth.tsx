import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { DbProfile } from '@/types/database';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: DbProfile | null;
  isAdmin: boolean;
  loading: boolean;
  configured: boolean;
}

interface SignInResult {
  error: string | null;
  isAdmin: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean } | { error: null; needsConfirmation: boolean }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithOtp: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    isAdmin: false,
    loading: true,
    configured: isSupabaseConfigured,
  });

  async function loadProfile(userId: string): Promise<DbProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, account_type, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      if (import.meta.env.DEV) console.error('[auth] Failed to load profile:', error.message);
      return null;
    }
    return data as DbProfile | null;
  }

  async function refreshProfile() {
    if (!state.user) return;
    const profile = await loadProfile(state.user.id);
    setState((s) => ({ ...s, profile, isAdmin: profile?.role === 'admin' }));
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) return;
      if (error) {
        if (import.meta.env.DEV) console.error('[auth] getSession error:', error.message);
        setState({ session: null, user: null, profile: null, isAdmin: false, loading: false, configured: true });
        return;
      }
      const session = data.session;
      const user = session?.user ?? null;
      const profile = user ? await loadProfile(user.id) : null;
      if (!mounted) return;
      setState({ session, user, profile, isAdmin: profile?.role === 'admin', loading: false, configured: true });
    }).catch((err) => {
      if (import.meta.env.DEV) console.error('[auth] getSession threw:', err);
      if (mounted) setState((s) => ({ ...s, loading: false }));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        const user = session?.user ?? null;
        const profile = user ? await loadProfile(user.id) : null;
        if (!mounted) return;
        setState({ session, user, profile, isAdmin: profile?.role === 'admin', loading: false, configured: true });
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message, isAdmin: false };
        // Eagerly update state so RequireAdmin sees the user immediately
        const user = data.user;
        const profile = user ? await loadProfile(user.id) : null;
        const isAdmin = profile?.role === 'admin';
        setState((s) => ({
          ...s,
          session: data.session,
          user,
          profile,
          isAdmin,
          loading: false,
        }));
        return { error: null, isAdmin };
      },
      signUp: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return { error: error.message, needsConfirmation: false };
        const needsConfirmation = !data.session;
        return { error: null, needsConfirmation };
      },
      signInWithGoogle: async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/login?redirect=/dashboard`,
          },
        });
        return { error: error ? error.message : null };
      },
      signInWithOtp: async (email) => {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/login?redirect=/dashboard`,
          },
        });
        return { error: error ? error.message : null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setState((s) => ({ ...s, session: null, user: null, profile: null, isAdmin: false }));
      },
      resetPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });
        return { error: error ? error.message : null };
      },
      refreshProfile,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
