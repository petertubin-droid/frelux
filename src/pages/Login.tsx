import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, AlertCircle, Lock, Mail, UserPlus, KeyRound, CheckCircle2, ArrowLeft, Briefcase, Home as HomeIcon, Chrome, Zap } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { classNames } from '@/lib/utils';
import Logo from '@/components/brand/Logo';
import { useSeo } from '@/lib/seo';

type Mode = 'signin' | 'signup' | 'reset' | 'otp';
type AccountType = 'client' | 'pro_worker';

export default function Login() {
  const { signIn, signUp, signInWithGoogle, signInWithOtp, resetPassword, user, configured } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/dashboard';

  const initialMode = (searchParams.get('mode') as Mode) || 'signin';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('client');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useSeo({
    title: 'Sign In or Create Account',
    description: 'Sign in to your FRELUX PAINT CALC account or create a new one. Accounts enable AI features and future premium access.',
    canonicalPath: '/login',
    noIndex: true,
  });

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

    if (mode === 'otp') {
      const { error } = await signInWithOtp(email.trim());
      setLoading(false);
      if (error) { setError(error); return; }
      setInfo('A magic link has been sent to your email. Click the link to sign in.');
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
        if (supabase) {
          await supabase.auth.updateUser({ data: { account_type: accountType } });
        }
        navigate(accountType === 'pro_worker' ? '/pro-connect/register' : redirectTo);
      }
      return;
    }

    // signin
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) { setError(error); return; }
    navigate(redirectTo);
  }

  async function handleGoogleLogin() {
    setError(null);
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error);
      setGoogleLoading(false);
    }
    // If successful, Supabase will redirect — no need to setGoogleLoading(false)
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
            {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'otp' ? 'Sign in with email link' : 'Reset password'}
          </h1>
          <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            {mode === 'signin'
              ? 'Sign in to access your projects, saved estimates, and AI features.'
              : mode === 'signup'
              ? 'Create an account to save estimates and access premium features.'
              : mode === 'otp'
              ? 'Enter your email and we\'ll send a secure one-time link to sign in.'
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

          {/* Google OAuth button — shown for signin and signup */}
          {(mode === 'signin' || mode === 'signup') && (
            <>
              <button
                onClick={handleGoogleLogin}
                disabled={loading || googleLoading || !configured}
                className="mt-5 flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-white/10 dark:bg-brand-navy-mid dark:text-neutral-200 dark:hover:bg-white/5"
              >
                {googleLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-brand-purple" />
                ) : (
                  <GoogleIcon />
                )}
                {mode === 'signin' ? 'Continue with Google' : 'Sign up with Google'}
              </button>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-neutral-200 dark:bg-white/10" />
                <span className="text-xs text-neutral-400 dark:text-neutral-500">or</span>
                <div className="h-px flex-1 bg-neutral-200 dark:bg-white/10" />
              </div>
            </>
          )}

          {/* Account type selection — shown during signup */}
          {mode === 'signup' && (
            <div className="mt-1">
              <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">I am a…</span>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType('client')}
                  className={classNames(
                    'flex flex-col items-start rounded-xl border p-4 text-left transition-all',
                    accountType === 'client'
                      ? 'border-brand-purple bg-brand-purple/5 ring-2 ring-brand-purple/20'
                      : 'border-neutral-200 hover:border-brand-purple/30 dark:border-white/10 dark:hover:border-brand-purple-lighter/30'
                  )}
                >
                  <HomeIcon className={classNames('h-5 w-5 mb-2', accountType === 'client' ? 'text-brand-purple dark:text-brand-purple-lighter' : 'text-neutral-400')} />
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white">Client</span>
                  <span className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">Calculate, estimate, find professionals</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('pro_worker')}
                  className={classNames(
                    'flex flex-col items-start rounded-xl border p-4 text-left transition-all',
                    accountType === 'pro_worker'
                      ? 'border-brand-purple bg-brand-purple/5 ring-2 ring-brand-purple/20'
                      : 'border-neutral-200 hover:border-brand-purple/30 dark:border-white/10 dark:hover:border-brand-purple-lighter/30'
                  )}
                >
                  <Briefcase className={classNames('h-5 w-5 mb-2', accountType === 'pro_worker' ? 'text-brand-purple dark:text-brand-purple-lighter' : 'text-neutral-400')} />
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white">Pro Worker</span>
                  <span className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">List services, get verified, receive enquiries</span>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
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

            {mode !== 'reset' && mode !== 'otp' && (
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
              {mode === 'signin' ? <LogIn className="h-4 w-4" /> : mode === 'signup' ? <UserPlus className="h-4 w-4" /> : mode === 'otp' ? <Zap className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'otp' ? 'Send magic link' : 'Send reset link'}
            </button>

            <div className="flex flex-col items-center gap-2 text-xs">
              {mode === 'signin' && (
                <>
                  <button type="button" onClick={() => { setMode('signup'); setError(null); setInfo(null); }} className="font-semibold text-brand-purple hover:underline dark:text-brand-purple-lighter">
                    Need an account? Sign up
                  </button>
                  <button type="button" onClick={() => { setMode('otp'); setError(null); setInfo(null); }} className="font-medium text-neutral-500 hover:text-brand-purple hover:underline dark:text-neutral-400 dark:hover:text-brand-purple-lighter">
                    Sign in with email link instead
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
              {mode === 'otp' && (
                <button type="button" onClick={() => { setMode('signin'); setError(null); setInfo(null); }} className="font-semibold text-brand-purple hover:underline dark:text-brand-purple-lighter">
                  Back to sign in
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

// Google "G" logo as inline SVG
function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
