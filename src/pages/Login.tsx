import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, AlertCircle, Lock, Mail, UserPlus, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';

import Logo from '@/components/brand/Logo';
import { useSeo } from '@/lib/seo';

type Mode = 'signin' | 'signup' | 'reset';

export default function Login() {
  const { signIn, signUp, resetPassword, user, configured } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Default to /dashboard after sign-in (was /ai-color-assistant which was confusing)
  const redirectTo = searchParams.get('redirect') ?? '/dashboard';

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useSeo({
    title: 'Sign In or Create Account',
    description: 'Sign in to your FRELUX PAINT CALC account or create a new one. Accounts enable AI features and future premium access.',
    canonicalPath: '/login',
    noIndex: true,
  });

  // If already signed in, redirect
  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    if (mode === 'reset') {
      const { error } = await resetPassword(email.trim());
      setLoading(false);
      if (error) { setError(error); return; }
      setInfo('Password reset instructions have been sent to your email if an account exists for it.');
      return;
    }

    if (mode === 'signup') {
      const result = await signUp(email.trim(), password);
      setLoading(false);
      if (result.error) { setError(result.error); return; }
      if (result.needsConfirmation) {
        setInfo('Your account has been created. Please sign in to continue.');
        setMode('signin');
        setPassword('');
      } else {
        // Auto-signed in — redirect
        navigate(redirectTo);
      }
      return;
    }

    // signin
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) { setError(error); return; }
    navigate(redirectTo);
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-neutral-50 px-4 py-10 dark:bg-brand-navy">
      {/* Subtle grid pattern background */}
      <div className="pointer-events-none absolute inset-0 bg-grid" aria-hidden="true" />
      {/* Soft radial glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-brand-purple/8 blur-[120px]" aria-hidden="true" />

      <div className="relative w-full max-w-sm animate-fade-in-up">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="card p-6 shadow-premium sm:p-8">
          <h1 className="font-display text-xl font-bold text-neutral-900 dark:text-white">
            {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'}
          </h1>
          <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            {mode === 'signin'
              ? 'Sign in to access your projects, saved estimates, and AI features.'
              : mode === 'signup'
              ? 'Create an account to save estimates and access premium features.'
              : 'Enter your email and we will send you reset instructions.'}
          </p>

          {!configured && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-neutral-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p>Authentication is not configured. Please check back later.</p>
            </div>
          )}

          {info && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-neutral-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <p>{info}</p>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <label className="block">
              <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Email</span>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
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

            {mode !== 'reset' && (
              <label className="block">
                <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Password</span>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-9"
                    placeholder="••••••••"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
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

            <button type="submit" disabled={loading || !configured} className="btn-primary w-full disabled:opacity-50">
              {mode === 'signin' ? <LogIn className="h-4 w-4" /> : mode === 'signup' ? <UserPlus className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
            </button>

            <div className="flex flex-col items-center gap-2 text-xs">
              {mode === 'signin' && (
                <>
                  <button type="button" onClick={() => { setMode('signup'); setError(null); setInfo(null); }} className="font-semibold text-brand-purple hover:underline dark:text-brand-purple-lighter">
                    Need an account? Sign up
                  </button>
                  <button type="button" onClick={() => { setMode('reset'); setError(null); setInfo(null); }} className="text-neutral-500 hover:text-brand-purple hover:underline dark:text-neutral-400 dark:hover:text-brand-purple-lighter">
                    Forgot your password?
                  </button>
                </>
              )}
              {mode === 'signup' && (
                <button type="button" onClick={() => { setMode('signin'); setError(null); setInfo(null); }} className="font-semibold text-brand-purple hover:underline dark:text-brand-purple-lighter">
                  Already have an account? Sign in
                </button>
              )}
              {mode === 'reset' && (
                <button type="button" onClick={() => { setMode('signin'); setError(null); setInfo(null); }} className="font-semibold text-brand-purple hover:underline dark:text-brand-purple-lighter">
                  Back to sign in
                </button>
              )}
            </div>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-brand-purple dark:hover:text-brand-purple-lighter">
            <ArrowLeft className="h-3 w-3" /> Back to website
          </Link>
        </p>
      </div>
    </div>
  );
}
